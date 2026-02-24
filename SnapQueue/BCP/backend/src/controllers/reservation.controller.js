import Reservation from "../models/Reservation.js";
import Payment from "../models/Payment.js";
import { notifyReservationCreated, notifyReservationStatusChanged } from "../utils/notificationEmail.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const occupiedStatuses = ["approved"];
const pendingStatus = "pending";
const PREDEFINED_PACKAGES = new Set(["basic", "standard", "premium"]);
const VISIBLE_AFTER_PAYMENT_SUBMIT = new Set(["pending", "processing", "paid"]);
const PACKAGE_CATALOG = {
  basic: { name: "Basic", inclusions: "Softcopy only", price: 2700 },
  standard: { name: "Standard", inclusions: "Softcopy + Hardcopy", price: 3500 },
  premium: { name: "Premium", inclusions: "Softcopy + Hardcopy + Video", price: 4500 }
};

const compareByCreatedAtThenId = (a, b) => {
  const createdAtDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (createdAtDiff !== 0) return createdAtDiff;
  return String(a._id).localeCompare(String(b._id));
};

const getDayRange = (value) => {
  const selected = new Date(value);
  const dayStart = new Date(selected);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selected);
  dayEnd.setHours(23, 59, 59, 999);
  return { dayStart, dayEnd };
};

const parseNumberField = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeAdjustments = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const label = String(item?.label || "").trim();
    const amount = parseNumberField(item?.amount);
    return { label, amount };
  });
};

const sumAmounts = (items) => items.reduce((total, item) => total + item.amount, 0);

const isReservationOwner = (reservation, user) => {
  const ownById = reservation.userId && reservation.userId.toString() === user?.sub;
  const ownByEmail = reservation.email === user?.email;
  return Boolean(ownById || ownByEmail);
};

const isPredefinedReservation = (reservation) => {
  const normalizedPackage = String(reservation?.packageName || reservation?.package || reservation?.service || "")
    .trim()
    .toLowerCase();
  return PREDEFINED_PACKAGES.has(normalizedPackage);
};

const isApprovalQueueEligible = (reservation) => {
  const status = String(reservation?.status || "").toLowerCase();
  if (status === "approved") return true;
  if (status !== "pending") return false;
  if (!isPredefinedReservation(reservation)) return true;
  const paymentStatus = String(reservation?.paymentStatus || "unpaid").toLowerCase();
  return VISIBLE_AFTER_PAYMENT_SUBMIT.has(paymentStatus);
};

export const createReservation = async (req, res) => {
  const payload = req.body;
  const value = (field) => String(payload?.[field] ?? "").trim();

  const requiredFields = [
    "fullName",
    "email",
    "phone",
    "eventType",
    "province",
    "city",
    "barangay",
    "street"
  ];
  const missingFields = requiredFields.filter((field) => !value(field));
  if (!(payload.eventDateTime || payload.eventDate)) {
    missingFields.push("eventDateTime");
  }
  if (!(payload.packageName || payload.package)) {
    missingFields.push("packageName");
  }

  if (missingFields.length) {
    return res.status(400).json({
      success: false,
      message: "Missing required reservation fields",
      missingFields
    });
  }

  const normalizedEmail = value("email").toLowerCase();
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  const normalizedPackage = String(payload.packageName || payload.package || "").trim().toLowerCase();
  const packageCustomDescription = value("packageCustomDescription");
  const packageMeta = PACKAGE_CATALOG[normalizedPackage] || null;
  const serviceOtherDetails = value("serviceOtherDetails");
  if (normalizedPackage === "custom" && !packageCustomDescription) {
    return res.status(400).json({
      success: false,
      message: "Please provide custom package description"
    });
  }
  const normalizedEventType = value("eventType").toLowerCase();
  const eventTypeOtherDetails = value("eventTypeOtherDetails");
  if (normalizedEventType === "other" && !eventTypeOtherDetails) {
    return res.status(400).json({
      success: false,
      message: "Please provide event details when selecting Other event type"
    });
  }

  const eventDateValue = payload.eventDateTime || payload.eventDate;
  const eventDate = new Date(eventDateValue);
  if (Number.isNaN(eventDate.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid eventDateTime" });
  }
  const { dayStart, dayEnd } = getDayRange(eventDate);
  const approvedConflict = await Reservation.findOne({
    eventDateTime: { $gte: dayStart, $lte: dayEnd },
    status: { $in: occupiedStatuses }
  }).lean();

  if (approvedConflict) {
    return res.status(409).json({
      success: false,
      message: "This date is already booked and approved. Please select another date.",
      code: "DATE_ALREADY_APPROVED"
    });
  }

  const allowPendingConflict = Boolean(
    payload.allowPendingConflict ||
      payload.confirmPendingConflict ||
      payload.forcePendingReservation
  );
  const pendingConflicts = await Reservation.find({
    eventDateTime: { $gte: dayStart, $lte: dayEnd },
    status: pendingStatus
  })
    .select("_id createdAt")
    .lean();

  if (pendingConflicts.length > 0 && !allowPendingConflict) {
    return res.status(409).json({
      success: false,
      code: "DATE_PENDING_CONFIRMATION_REQUIRED",
      requiresConfirmation: true,
      message:
        "This date is already reserved by another client and is currently pending approval. Would you like to continue with your reservation?"
    });
  }

  const reservation = await Reservation.create({
    userId: req.user?.sub,
    fullName: value("fullName"),
    email: normalizedEmail,
    phone: value("phone"),
    service: normalizedPackage || "package",
    serviceOtherDetails,
    packageName: packageMeta?.name || payload.packageName || payload.package,
    packageInclusions: packageMeta?.inclusions || "",
    packagePrice: packageMeta?.price ?? null,
    packageCustomDescription,
    durationHours: payload.durationHours || Number(payload.duration || 1),
    eventType: value("eventType"),
    eventTypeOtherDetails,
    eventDateTime: eventDateValue,
    province: value("province"),
    city: value("city"),
    barangay: value("barangay"),
    street: value("street"),
    notes: payload.notes || payload.additionalNotes || "",
    workflowStage: "awaiting_approval",
    basePrice: packageMeta?.price ?? null,
    finalPrice: packageMeta?.price ?? null,
    pricingStatus: packageMeta ? "quoted" : "unquoted",
    quoteVersion: packageMeta ? 1 : 0,
    quotedAt: packageMeta ? new Date() : null
  });
  notifyReservationCreated(reservation).catch((error) => {
    console.error("Reservation email notification failed", {
      reservationId: String(reservation?._id || ""),
      message: error?.message
    });
  });

  res.status(201).json({ success: true, reservation });
};

export const checkDateAvailability = async (req, res) => {
  const rawDate = String(req.query.date || "").trim();
  if (!rawDate) {
    return res.status(400).json({ success: false, message: "Missing date query parameter" });
  }

  const selected = new Date(rawDate);
  if (Number.isNaN(selected.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid date format" });
  }

  const { dayStart, dayEnd } = getDayRange(selected);

  const occupied = await Reservation.exists({
    eventDateTime: { $gte: dayStart, $lte: dayEnd },
    status: { $in: occupiedStatuses }
  });

  res.json({
    success: true,
    available: !occupied
  });
};

export const listReservations = async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) {
    filter.status = status;
  }

  if (req.user?.role !== "admin") {
    filter.$or = [{ userId: req.user?.sub }, { email: req.user?.email }];
  }

  const reservations = await Reservation.find(filter).sort({ createdAt: -1 });
  const filteredReservations = reservations.filter((item) => {
    const paymentStatus = String(item?.paymentStatus || "unpaid").toLowerCase();
    if (!isPredefinedReservation(item)) {
      return true;
    }
    return VISIBLE_AFTER_PAYMENT_SUBMIT.has(paymentStatus);
  });
  res.json({ success: true, reservations: filteredReservations });
};

export const listDashboardReservations = async (req, res) => {
  const filter = {};

  if (req.user?.role !== "admin") {
    filter.$or = [{ userId: req.user?.sub }, { email: req.user?.email }];
  }

  const reservations = await Reservation.find(filter).sort({ updatedAt: -1 });
  const visibleReservations = reservations.filter((item) => {
    if (!isPredefinedReservation(item)) {
      return true;
    }
    const paymentStatus = String(item?.paymentStatus || "unpaid").toLowerCase();
    return VISIBLE_AFTER_PAYMENT_SUBMIT.has(paymentStatus);
  });
  const normalizedReservations = visibleReservations.map((item) => {
    const plain = item.toObject ? item.toObject() : item;
    return {
      ...plain,
      reservationStatus: plain.status || "pending"
    };
  });
  res.json({ success: true, reservations: normalizedReservations });
};

export const getReservationById = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    return res.status(404).json({ success: false, message: "Reservation not found" });
  }
  if (req.user?.role !== "admin") {
    if (!isReservationOwner(reservation, req.user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
  }
  res.json({ success: true, reservation });
};

export const updateReservationPricing = async (req, res) => {
  const { basePrice, customAdjustments, discount = 0, currency = "PHP" } = req.body;

  const normalizedBasePrice = parseNumberField(basePrice);
  const normalizedDiscount = parseNumberField(discount);
  if (normalizedBasePrice === null || normalizedBasePrice < 0) {
    return res.status(400).json({ success: false, message: "Invalid basePrice" });
  }
  if (normalizedDiscount === null || normalizedDiscount < 0) {
    return res.status(400).json({ success: false, message: "Invalid discount" });
  }

  const normalizedCurrency = String(currency || "PHP").trim().toUpperCase();
  if (!normalizedCurrency) {
    return res.status(400).json({ success: false, message: "Invalid currency" });
  }

  const adjustments = normalizeAdjustments(customAdjustments);
  const invalidAdjustment = adjustments.find((item) => !item.label || item.amount === null);
  if (invalidAdjustment) {
    return res.status(400).json({ success: false, message: "Each custom adjustment requires a label and numeric amount" });
  }

  const finalPrice = normalizedBasePrice + sumAmounts(adjustments) - normalizedDiscount;
  if (finalPrice <= 0) {
    return res.status(400).json({ success: false, message: "Final price must be greater than 0" });
  }

  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    return res.status(404).json({ success: false, message: "Reservation not found" });
  }

  const verifiedPayment = await Payment.exists({ reservationId: reservation._id, status: "verified" });
  if (verifiedPayment) {
    return res.status(409).json({ success: false, message: "Cannot update pricing after payment is verified" });
  }

  reservation.basePrice = normalizedBasePrice;
  reservation.customAdjustments = adjustments;
  reservation.discount = normalizedDiscount;
  reservation.finalPrice = finalPrice;
  reservation.currency = normalizedCurrency;
  reservation.pricingStatus = "quoted";
  reservation.quotedAt = new Date();
  reservation.quotedBy = req.user?.sub || null;
  reservation.pricingAcceptedAt = null;
  reservation.quoteVersion = Number(reservation.quoteVersion || 0) + 1;
  reservation.paymentStatus = "unpaid";
  reservation.pricingHistory.push({
    basePrice: normalizedBasePrice,
    customAdjustments: adjustments,
    discount: normalizedDiscount,
    finalPrice,
    currency: normalizedCurrency,
    quotedBy: req.user?.sub || null,
    quotedAt: reservation.quotedAt
  });

  await reservation.save();

  res.json({ success: true, reservation });
};

const updatePricingResponse = async (req, res, nextStatus) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    return res.status(404).json({ success: false, message: "Reservation not found" });
  }

  if (req.user?.role !== "admin" && !isReservationOwner(reservation, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  if (reservation.pricingStatus !== "quoted") {
    return res.status(409).json({ success: false, message: "Reservation does not have an active quote to respond to" });
  }
  reservation.pricingStatus = nextStatus;
  reservation.pricingAcceptedAt = nextStatus === "accepted" ? new Date() : null;
  await reservation.save();

  return res.json({ success: true, reservation });
};

export const acceptReservationPricing = async (req, res) => updatePricingResponse(req, res, "accepted");
export const rejectReservationPricing = async (req, res) => updatePricingResponse(req, res, "rejected");

export const cancelReservationByUser = async (req, res) => {
  const normalizedCancellationReason = String(req.body?.cancellationReason || "").trim();
  if (normalizedCancellationReason.length < 8 || normalizedCancellationReason.length > 500) {
    return res.status(400).json({ success: false, message: "Cancellation reason must be 8-500 characters." });
  }

  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    return res.status(404).json({ success: false, message: "Reservation not found" });
  }

  if (!isReservationOwner(reservation, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const currentStatus = String(reservation.status || "").toLowerCase();
  if (["rejected", "completed"].includes(currentStatus)) {
    return res.status(409).json({ success: false, message: "Reservation cannot be cancelled in its current status" });
  }

  const payment = await Payment.findOne({ reservationId: reservation._id });
  let refundRequested = false;
  if (payment?.status === "verified") {
    const currentRefundStatus = String(payment.refundStatus || "none");
    if (currentRefundStatus === "rejected") {
      return res.status(409).json({ success: false, message: "Refund for this payment was already rejected. Please contact admin support." });
    }
    if (currentRefundStatus === "none") {
      payment.refundStatus = "requested";
      payment.refundReason = `User cancelled reservation: ${normalizedCancellationReason}`;
      payment.refundRequestedAt = new Date();
      payment.refundRequestedBy = req.user?.sub || null;
      payment.refundResolvedAt = null;
      payment.refundResolvedBy = null;
      await payment.save();
      refundRequested = true;
    }
  }

  reservation.status = "rejected";
  reservation.userCancellationReason = normalizedCancellationReason;
  reservation.cancelledByRole = "user";
  reservation.cancelledAt = new Date();

  if (!payment || ["pending", "processing"].includes(String(payment.status || "").toLowerCase())) {
    const cancelResult = await Payment.updateMany(
      { reservationId: reservation._id, status: { $in: ["pending", "processing"] } },
      {
        $set: {
          status: "cancelled",
          failureReason: "Reservation was cancelled by user.",
          failedAt: new Date()
        }
      }
    );
    if (cancelResult.modifiedCount > 0) {
      reservation.paymentStatus = "cancelled";
    }
  } else if (String(payment.status || "").toLowerCase() === "verified") {
    reservation.paymentStatus = "paid";
  } else if (String(payment.status || "").toLowerCase() === "refunded") {
    reservation.paymentStatus = "refunded";
  }

  await reservation.save();
  return res.json({ success: true, reservation, refundRequested });
};

export const updateReservationStatus = async (req, res) => {
  const { status, workflowStage, estimatedDelivery } = req.body;
  const validStatuses = ["pending", "approved", "rejected", "completed"];
  const validStages = ["awaiting_approval", "approved", "shoot_completed", "editing", "ready_for_download"];
  const isAdmin = req.user?.role === "admin";

  if (!status && !workflowStage && !estimatedDelivery) {
    return res.status(400).json({ success: false, message: "Status, workflowStage, or estimatedDelivery is required" });
  }
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }
  if (workflowStage && !validStages.includes(workflowStage)) {
    return res.status(400).json({ success: false, message: "Invalid workflowStage" });
  }
  if (estimatedDelivery && Number.isNaN(new Date(estimatedDelivery).getTime())) {
    return res.status(400).json({ success: false, message: "Invalid estimatedDelivery" });
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (workflowStage) updateData.workflowStage = workflowStage;
  if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);

  // Keep workflow stage and status coherent even when only one is sent.
  if (status && !workflowStage) {
    if (status === "pending") updateData.workflowStage = "awaiting_approval";
    if (status === "approved") updateData.workflowStage = "approved";
    if (status === "completed") updateData.workflowStage = "ready_for_download";
  }
  if (workflowStage && !status) {
    if (workflowStage === "awaiting_approval") updateData.status = "pending";
    if (["approved", "shoot_completed", "editing"].includes(workflowStage)) updateData.status = "approved";
    if (workflowStage === "ready_for_download") updateData.status = "completed";
  }

  const targetReservation = await Reservation.findById(req.params.id);
  if (!targetReservation) {
    return res.status(404).json({ success: false, message: "Reservation not found" });
  }

  if (!isAdmin) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }

  const nextStatus = updateData.status || targetReservation.status;
  if (nextStatus === "completed") {
    const verifiedPayment = await Payment.exists({ reservationId: targetReservation._id, status: "verified" });
    if (!verifiedPayment) {
      return res.status(409).json({
        success: false,
        message: "Cannot mark reservation completed without verified payment."
      });
    }
  }
  const isMovingToApproved = targetReservation.status !== "approved" && nextStatus === "approved";
  if (isMovingToApproved) {
    const { dayStart, dayEnd } = getDayRange(targetReservation.eventDateTime);
    const approvedConflict = await Reservation.exists({
      _id: { $ne: targetReservation._id },
      eventDateTime: { $gte: dayStart, $lte: dayEnd },
      status: "approved"
    });
    if (approvedConflict) {
      return res.status(409).json({
        success: false,
        message: "Cannot approve this reservation because this date is already approved for another client."
      });
    }

    const sameDayReservable = await Reservation.find({
      eventDateTime: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["pending", "approved"] }
    })
      .select("_id createdAt status packageName package service paymentStatus")
      .lean();
    const eligibleReservable = sameDayReservable.filter(isApprovalQueueEligible);
    eligibleReservable.sort(compareByCreatedAtThenId);
    const firstInQueue = eligibleReservable[0];
    if (firstInQueue && String(firstInQueue._id) !== String(targetReservation._id)) {
      return res.status(409).json({
        success: false,
        code: "FIRST_COME_APPROVAL_REQUIRED",
        message:
          "Cannot approve this reservation before the earliest reservation for this date. Approve the first reservation in queue first."
      });
    }
  }

  const reservation = await Reservation.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (isMovingToApproved) {
    const { dayStart, dayEnd } = getDayRange(reservation.eventDateTime);
    const pendingReservationsToReject = await Reservation.find({
      _id: { $ne: reservation._id },
      eventDateTime: { $gte: dayStart, $lte: dayEnd },
      status: "pending"
    })
      .select("_id email fullName eventDateTime")
      .lean();
    const pendingReservationIds = pendingReservationsToReject.map((item) => item._id);
    if (pendingReservationIds.length > 0) {
      await Reservation.updateMany(
        {
          _id: { $in: pendingReservationIds }
        },
        {
          $set: {
            status: "rejected",
            cancelledByRole: "admin",
            cancelledAt: new Date()
          }
        }
      );
      await Payment.updateMany(
        { reservationId: { $in: pendingReservationIds }, status: { $in: ["pending", "processing"] } },
        {
          $set: {
            status: "cancelled",
            failureReason: "Reservation date became unavailable after another reservation was approved first.",
            failedAt: new Date()
          }
        }
      );
      pendingReservationsToReject.forEach((item) => {
        notifyReservationStatusChanged(item, "rejected").catch((error) => {
          console.error("Auto-rejected reservation email notification failed", {
            reservationId: String(item?._id || ""),
            message: error?.message
          });
        });
      });
    }
  }

  if (nextStatus === "rejected") {
    const cancelReason = "Reservation was rejected by admin.";
    reservation.cancelledByRole = "admin";
    reservation.cancelledAt = new Date();
    const cancelResult = await Payment.updateMany(
      { reservationId: reservation._id, status: { $in: ["pending", "processing"] } },
      {
        $set: {
          status: "cancelled",
          failureReason: cancelReason,
          failedAt: new Date()
        }
      }
    );
    if (cancelResult.modifiedCount > 0) {
      reservation.paymentStatus = "cancelled";
    }
    await reservation.save();
  }
  const hasStatusChange = Boolean(updateData.status && String(updateData.status) !== String(targetReservation.status));
  if (hasStatusChange) {
    notifyReservationStatusChanged(reservation, updateData.status).catch((error) => {
      console.error("Reservation status email notification failed", {
        reservationId: String(reservation?._id || ""),
        status: String(updateData.status || ""),
        message: error?.message
      });
    });
  }

  res.json({ success: true, reservation });
};
