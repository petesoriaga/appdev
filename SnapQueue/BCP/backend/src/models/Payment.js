import mongoose from "mongoose";

const paymentMethods = ["gcash", "maya"];
const paymentStatuses = ["pending", "processing", "verified", "rejected", "expired", "cancelled", "refunded"];

const paymentSchema = new mongoose.Schema(
  {
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true
    },
    method: { type: String, enum: paymentMethods, required: true, lowercase: true, trim: true },
    provider: { type: String, enum: ["manual", "paymongo"], default: "manual" },
    providerCheckoutId: { type: String, trim: true, default: "" },
    providerPaymentIntentId: { type: String, trim: true, default: "" },
    providerReference: { type: String, trim: true, default: "" },
    checkoutUrl: { type: String, trim: true, default: "" },
    quoteVersion: { type: Number, default: 0 },
    amountSnapshot: { type: Number, min: 1, default: null },
    currencySnapshot: { type: String, trim: true, default: "PHP" },
    amount: { type: Number, required: true, min: 1 },
    referenceNumber: { type: String, trim: true, default: "" },
    proofUrl: { type: String, trim: true, default: "" },
    status: { type: String, enum: paymentStatuses, default: "pending" },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, trim: true, default: "" },
    refundStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "processed"],
      default: "none"
    },
    refundReason: { type: String, trim: true, default: "" },
    refundPayoutMethod: { type: String, enum: ["", "gcash", "maya"], default: "" },
    refundPayoutNumber: { type: String, trim: true, default: "" },
    refundRequestedAt: { type: Date, default: null },
    refundRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    refundResolvedAt: { type: Date, default: null },
    refundResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    refundProcessedAt: { type: Date, default: null },
    refundReferenceNumber: { type: String, trim: true, default: "" },
    refundProofUrl: { type: String, trim: true, default: "" },
    refundAdminNote: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

paymentSchema.index({ reservationId: 1 }, { unique: true });
paymentSchema.index({ providerCheckoutId: 1 });
paymentSchema.index({ providerPaymentIntentId: 1 });
paymentSchema.index({ providerReference: 1 });

export default mongoose.model("Payment", paymentSchema);
