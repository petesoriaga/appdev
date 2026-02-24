import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Reservation from "../models/Reservation.js";
import {
  notifyPaymentStatusChanged,
  notifyPaymentSubmitted,
  notifyRefundRequested,
  notifyRefundResolved
} from "../utils/notificationEmail.js";

const ALLOWED_METHODS = ["gcash", "maya"];
const ALLOWED_PAYMENT_STATUSES = ["verified", "rejected", "pending", "processing", "cancelled", "expired", "refunded"];
const REFERENCE_PATTERN = /^[A-Za-z0-9_-]{6,40}$/;
const DATA_IMAGE_PREFIX = "data:image/";
const DATA_IMAGE_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/;
const PACKAGE_CATALOG_PRICE = {
  basic: 2700,
  standard: 3500,
  premium: 4500
};

const isReservationOwner = (reservation, user) => {
  const byUserId = reservation.userId?.toString() === user?.sub;
  const byEmail = reservation.email && reservation.email === user?.email;
  return Boolean(byUserId || byEmail);
};

const applyStatusToReservation = async (reservationId, paymentStatus) => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return;
  reservation.paymentStatus = paymentStatus;
  await reservation.save();
};

const resolveExpectedAmount = (reservation) => {
  const finalPrice = Number(reservation?.finalPrice);
  if (Number.isFinite(finalPrice) && finalPrice > 0) return finalPrice;
  const packagePrice = Number(reservation?.packagePrice);
  if (Number.isFinite(packagePrice) && packagePrice > 0) return packagePrice;
  const normalizedPackage = String(reservation?.packageName || reservation?.package || reservation?.service || "")
    .trim()
    .toLowerCase();
  const mapped =
    Number(PACKAGE_CATALOG_PRICE[normalizedPackage] || 0) ||
    (normalizedPackage.includes("basic") ? PACKAGE_CATALOG_PRICE.basic : 0) ||
    (normalizedPackage.includes("standard") ? PACKAGE_CATALOG_PRICE.standard : 0) ||
    (normalizedPackage.includes("premium") ? PACKAGE_CATALOG_PRICE.premium : 0);
  return Number.isFinite(mapped) && mapped > 0 ? mapped : 0;
};

const assertPayableReservation = async (reservationId, user) => {
  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    const err = new Error("Invalid reservationId");
    err.code = 400;
    throw err;
  }
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const err = new Error("Reservation not found");
    err.code = 404;
    throw err;
  }
  if (user?.role !== "admin" && !isReservationOwner(reservation, user)) {
    const err = new Error("Forbidden");
    err.code = 403;
    throw err;
  }
  const reservationStatus = String(reservation.status || "").toLowerCase();
  if (["rejected", "completed"].includes(reservationStatus)) {
    const err = new Error("Payment is not allowed for this reservation status.");
    err.code = 409;
    throw err;
  }
  const expectedAmount = resolveExpectedAmount(reservation);
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
    const err = new Error("Reservation has no valid final price quote.");
    err.code = 409;
    throw err;
  }

  // Backward compatibility for legacy reservations:
  // if we can resolve a valid package amount, ensure pricing fields are consistent.
  const pricingStatus = String(reservation.pricingStatus || "").toLowerCase();
  if (!["quoted", "accepted"].includes(pricingStatus) && expectedAmount > 0) {
    reservation.pricingStatus = "quoted";
    if (!Number.isFinite(Number(reservation.finalPrice)) || Number(reservation.finalPrice) <= 0) {
      reservation.finalPrice = expectedAmount;
    }
    if (!Number.isFinite(Number(reservation.basePrice)) || Number(reservation.basePrice) <= 0) {
      reservation.basePrice = expectedAmount;
    }
    if (!Number.isFinite(Number(reservation.quoteVersion)) || Number(reservation.quoteVersion) <= 0) {
      reservation.quoteVersion = 1;
    }
    if (!reservation.quotedAt) {
      reservation.quotedAt = new Date();
    }
    await reservation.save();
  }
  return reservation;
};

export const createPayment = async (req, res) => {
  try {
    const reservationId = String(req.body?.reservationId || "").trim();
    const method = String(req.body?.method || "").trim().toLowerCase();
    const referenceNumber = String(req.body?.referenceNumber || "").trim();
    const proofUrl = String(req.body?.proofUrl || "").trim();
    const submittedAmount = Number(req.body?.amount);

    if (!ALLOWED_METHODS.includes(method)) {
      return res.status(400).json({ success: false, message: "Invalid payment method" });
    }
    if (!REFERENCE_PATTERN.test(referenceNumber)) {
      return res.status(400).json({
        success: false,
        message: "Reference number must be 6-40 chars (letters, numbers, dash, underscore)."
      });
    }
    if (!proofUrl) {
      return res.status(400).json({ success: false, message: "Payment proof is required" });
    }
    if (!proofUrl.startsWith(DATA_IMAGE_PREFIX)) {
      return res.status(400).json({ success: false, message: "Invalid proof format. Upload an image file." });
    }
    if (!DATA_IMAGE_REGEX.test(proofUrl)) {
      return res.status(400).json({ success: false, message: "Invalid proof payload." });
    }
    if (proofUrl.length > 7_000_000) {
      return res.status(400).json({ success: false, message: "Uploaded proof is too large. Max 5MB image." });
    }

    const reservation = await assertPayableReservation(reservationId, req.user);
    if (reservation.paymentDeletedAt) {
      return res.status(409).json({
        success: false,
        message: "Payment was deleted for this reservation and cannot be submitted again."
      });
    }
    const expectedAmount = resolveExpectedAmount(reservation);
    if (!Number.isFinite(submittedAmount) || submittedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment amount" });
    }
    if (Math.abs(submittedAmount - expectedAmount) > 0.009) {
      return res.status(400).json({
        success: false,
        message: `Payment amount must match quoted final price (${expectedAmount.toFixed(2)})`
      });
    }

    const existing = await Payment.findOne({ reservationId: reservation._id });
    if (existing?.status === "verified" && !["requested", "approved", "processed"].includes(existing?.refundStatus || "none")) {
      return res.status(409).json({ success: false, message: "Payment already verified for this reservation." });
    }
    if (existing?.referenceNumber && existing.referenceNumber === referenceNumber && ["pending", "processing", "verified"].includes(existing?.status)) {
      return res.status(409).json({ success: false, message: "This reference number was already submitted for this reservation." });
    }

    const payment = await Payment.findOneAndUpdate(
      { reservationId: reservation._id },
      {
        reservationId: reservation._id,
        method,
        provider: "manual",
        providerCheckoutId: "",
        providerPaymentIntentId: "",
        providerReference: referenceNumber,
        checkoutUrl: "",
        quoteVersion: Number(reservation.quoteVersion || 0),
        amountSnapshot: expectedAmount,
        currencySnapshot: reservation.currency || "PHP",
        amount: expectedAmount,
        referenceNumber,
        proofUrl,
        status: "pending",
        paidAt: null,
        failedAt: null,
        failureReason: "",
        refundStatus: "none",
        refundReason: "",
        refundPayoutMethod: "",
        refundPayoutNumber: "",
        refundRequestedAt: null,
        refundRequestedBy: null,
        refundResolvedAt: null,
        refundResolvedBy: null,
        refundProcessedAt: null,
        refundReferenceNumber: "",
        refundProofUrl: "",
        refundAdminNote: ""
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await applyStatusToReservation(reservation._id, "processing");
    notifyPaymentSubmitted(payment, reservation).catch((error) => {
      console.error("Payment submission email notification failed", {
        reservationId: String(reservation?._id || ""),
        paymentId: String(payment?._id || ""),
        message: error?.message
      });
    });
    return res.status(200).json({ success: true, payment });
  } catch (error) {
    const code = Number(error?.code || 500);
    return res.status(code).json({ success: false, message: error?.message || "Failed to submit payment." });
  }
};

export const getPaymentByReservation = async (req, res) => {
  const reservationId = String(req.params.reservationId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    return res.status(400).json({ success: false, message: "Invalid reservationId" });
  }
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return res.status(404).json({ success: false, message: "Reservation not found" });
  if (req.user?.role !== "admin" && !isReservationOwner(reservation, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  const payment = await Payment.findOne({ reservationId }).sort({ createdAt: -1 });
  return res.json({ success: true, payment, reservation });
};

export const listPayments = async (_req, res) => {
  const payments = await Payment.find().populate("reservationId").sort({ createdAt: -1 });
  return res.json({ success: true, payments });
};

export const verifyPayment = async (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_PAYMENT_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid payment status" });
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }
  const reservation = await Reservation.findById(payment.reservationId);

  payment.status = status;
  if (status === "verified") {
    payment.paidAt = new Date();
    payment.failedAt = null;
    payment.failureReason = "";
    await payment.save();
    await applyStatusToReservation(payment.reservationId, "paid");
  } else {
    payment.failedAt = new Date();
    if (["rejected", "expired", "cancelled"].includes(status)) {
      payment.failureReason = payment.failureReason || `Marked as ${status}`;
    }
    await payment.save();
    if (status === "cancelled") await applyStatusToReservation(payment.reservationId, "cancelled");
    else if (status === "processing" || status === "pending") await applyStatusToReservation(payment.reservationId, "processing");
    else if (status === "refunded") await applyStatusToReservation(payment.reservationId, "refunded");
    else await applyStatusToReservation(payment.reservationId, "failed");
  }
  notifyPaymentStatusChanged(payment, reservation).catch((error) => {
    console.error("Payment status email notification failed", {
      reservationId: String(reservation?._id || payment?.reservationId || ""),
      paymentId: String(payment?._id || ""),
      status: String(status || ""),
      message: error?.message
    });
  });

  return res.json({ success: true, payment });
};

export const deletePayment = async (req, res) => {
  const paymentId = String(req.params.id || "").trim();
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({ success: false, message: "Invalid payment id" });
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }
  const reservation = await Reservation.findById(payment.reservationId);
  if (!reservation) {
    return res.status(404).json({ success: false, message: "Reservation not found for payment" });
  }
  if (req.user?.role !== "admin" && !isReservationOwner(reservation, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const reservationStatus = String(reservation.status || "").toLowerCase();
  const paymentStatus = String(payment.status || "").toLowerCase();
  const reservationPaymentStatus = String(reservation.paymentStatus || "").toLowerCase();
  const isDonePayment = ["verified", "refunded"].includes(paymentStatus) || ["paid", "refunded"].includes(reservationPaymentStatus);
  const isHistoryReservation = ["completed", "rejected"].includes(reservationStatus);
  if (!isDonePayment || !isHistoryReservation) {
    return res.status(409).json({
      success: false,
      message: "Payment can only be deleted for completed history reservations."
    });
  }

  await Payment.findByIdAndDelete(paymentId);
  reservation.paymentStatus = "unpaid";
  reservation.paymentDeletedAt = new Date();
  await reservation.save();
  return res.json({ success: true, message: "Payment deleted.", paymentId });
};

export const requestRefund = async (req, res) => {
  const paymentId = String(req.params.id || "").trim();
  const reason = String(req.body?.reason || "").trim();
  const payoutMethod = String(req.body?.payoutMethod || "").trim().toLowerCase();
  const payoutNumber = String(req.body?.payoutNumber || "").trim();
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({ success: false, message: "Invalid payment id" });
  }
  if (!reason) {
    return res.status(400).json({ success: false, message: "Refund reason is required" });
  }
  if (reason.length < 8 || reason.length > 500) {
    return res.status(400).json({ success: false, message: "Refund reason must be 8-500 characters." });
  }
  if (!["gcash", "maya"].includes(payoutMethod)) {
    return res.status(400).json({ success: false, message: "Refund payout method must be GCash or Maya." });
  }
  const normalizedPayoutNumber = payoutNumber.replace(/\s+/g, "");
  if (!/^\d{10,13}$/.test(normalizedPayoutNumber)) {
    return res.status(400).json({ success: false, message: "Refund payout number must be 10-13 digits." });
  }

  const payment = await Payment.findById(paymentId).populate("reservationId");
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
  const reservation = payment.reservationId;
  if (!reservation) return res.status(404).json({ success: false, message: "Reservation not found for payment" });

  if (req.user?.role !== "admin" && !isReservationOwner(reservation, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  if (payment.status !== "verified") {
    return res.status(409).json({ success: false, message: "Only verified payments can request refund." });
  }
  if (["requested", "approved", "processed"].includes(payment.refundStatus)) {
    return res.status(409).json({ success: false, message: "Refund is already in progress." });
  }
  if (payment.refundStatus === "rejected") {
    return res.status(409).json({ success: false, message: "Refund was already rejected for this payment." });
  }

  payment.refundStatus = "requested";
  payment.refundReason = reason;
  payment.refundPayoutMethod = payoutMethod;
  payment.refundPayoutNumber = normalizedPayoutNumber;
  payment.refundRequestedAt = new Date();
  payment.refundRequestedBy = req.user?.sub || null;
  await payment.save();
  notifyRefundRequested(payment, reservation).catch((error) => {
    console.error("Refund request email notification failed", {
      reservationId: String(reservation?._id || ""),
      paymentId: String(payment?._id || ""),
      message: error?.message
    });
  });
  return res.json({ success: true, payment });
};

export const resolveRefund = async (req, res) => {
  const paymentId = String(req.params.id || "").trim();
  const action = String(req.body?.action || "").trim().toLowerCase();
  const refundReferenceNumber = String(req.body?.refundReferenceNumber || "").trim();
  const refundProofUrl = String(req.body?.refundProofUrl || "").trim();
  const refundAdminNote = String(req.body?.refundAdminNote || "").trim();
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({ success: false, message: "Invalid payment id" });
  }
  if (!["approve", "reject", "process"].includes(action)) {
    return res.status(400).json({ success: false, message: "Invalid refund action" });
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
  const reservation = await Reservation.findById(payment.reservationId);
  const currentRefundStatus = String(payment.refundStatus || "none").toLowerCase();
  if (payment.status !== "verified" && action !== "process") {
    return res.status(409).json({ success: false, message: "Only verified payments can be resolved for refund." });
  }
  if (action === "process" && payment.status !== "verified") {
    return res.status(409).json({ success: false, message: "Only verified payments can be refunded." });
  }
  if (payment.status === "refunded" && action === "process") {
    return res.status(409).json({ success: false, message: "Refund already processed for this payment." });
  }

  if (action === "approve") {
    if (currentRefundStatus !== "requested") {
      return res.status(409).json({ success: false, message: "Only requested refunds can be approved." });
    }
    if (refundAdminNote && refundAdminNote.length < 8) {
      return res.status(400).json({ success: false, message: "Admin note must be at least 8 characters when provided." });
    }
    payment.refundStatus = "approved";
    payment.refundResolvedAt = new Date();
    payment.refundResolvedBy = req.user?.sub || null;
    payment.refundAdminNote = refundAdminNote || payment.refundAdminNote || "";
  } else if (action === "reject") {
    if (!["requested", "approved"].includes(currentRefundStatus)) {
      return res.status(409).json({ success: false, message: "Only requested or approved refunds can be rejected." });
    }
    if (!refundAdminNote || refundAdminNote.length < 8) {
      return res.status(400).json({ success: false, message: "Admin note is required when rejecting a refund (min 8 characters)." });
    }
    payment.refundStatus = "rejected";
    payment.refundResolvedAt = new Date();
    payment.refundResolvedBy = req.user?.sub || null;
    payment.refundAdminNote = refundAdminNote;
  } else if (action === "process") {
    if (payment.refundStatus !== "approved") {
      return res.status(409).json({ success: false, message: "Refund must be approved before processing." });
    }
    if (!refundAdminNote || refundAdminNote.length < 8) {
      return res.status(400).json({ success: false, message: "Admin note is required when processing a refund (min 8 characters)." });
    }
    if (!REFERENCE_PATTERN.test(refundReferenceNumber)) {
      return res.status(400).json({
        success: false,
        message: "Refund reference number must be 6-40 chars (letters, numbers, dash, underscore)."
      });
    }
    if (!refundProofUrl) {
      return res.status(400).json({ success: false, message: "Refund proof is required for processing." });
    }
    if (!refundProofUrl.startsWith(DATA_IMAGE_PREFIX)) {
      return res.status(400).json({ success: false, message: "Invalid refund proof format. Upload an image file." });
    }
    if (!DATA_IMAGE_REGEX.test(refundProofUrl)) {
      return res.status(400).json({ success: false, message: "Invalid refund proof payload." });
    }
    if (refundProofUrl.length > 7_000_000) {
      return res.status(400).json({ success: false, message: "Refund proof image is too large. Max 5MB image." });
    }
    payment.refundStatus = "processed";
    payment.status = "refunded";
    payment.refundResolvedAt = new Date();
    payment.refundResolvedBy = req.user?.sub || null;
    payment.refundProcessedAt = new Date();
    payment.refundReferenceNumber = refundReferenceNumber;
    payment.refundProofUrl = refundProofUrl;
    payment.refundAdminNote = refundAdminNote || payment.refundAdminNote || "";
    payment.failureReason = "Refund processed by admin.";
    await applyStatusToReservation(payment.reservationId, "refunded");
  }

  await payment.save();
  notifyRefundResolved(payment, reservation, action).catch((error) => {
    console.error("Refund resolution email notification failed", {
      reservationId: String(reservation?._id || payment?.reservationId || ""),
      paymentId: String(payment?._id || ""),
      action: String(action || ""),
      message: error?.message
    });
  });
  return res.json({ success: true, payment });
};
