import mongoose from "mongoose";

const pricingAdjustmentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true }
  },
  { _id: false }
);

const pricingHistorySchema = new mongoose.Schema(
  {
    basePrice: { type: Number, required: true },
    customAdjustments: { type: [pricingAdjustmentSchema], default: [] },
    discount: { type: Number, required: true, default: 0 },
    finalPrice: { type: Number, required: true },
    currency: { type: String, required: true, default: "PHP" },
    quotedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    quotedAt: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
);

const reservationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    service: { type: String, required: true },
    serviceOtherDetails: { type: String, default: "" },
    packageName: { type: String, required: true },
    packageInclusions: { type: String, default: "" },
    packagePrice: { type: Number, default: null },
    packageCustomDescription: { type: String, default: "" },
    durationHours: { type: Number, default: 1 },
    eventType: { type: String, required: true },
    eventTypeOtherDetails: { type: String, default: "" },
    eventDateTime: { type: Date, required: true },
    province: { type: String, required: true },
    city: { type: String, required: true },
    barangay: { type: String, required: true },
    street: { type: String, required: true },
    notes: { type: String, default: "" },
    userCancellationReason: { type: String, default: "" },
    cancelledByRole: { type: String, enum: ["user", "admin", ""], default: "" },
    cancelledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending"
    },
    workflowStage: {
      type: String,
      enum: ["awaiting_approval", "approved", "shoot_completed", "editing", "ready_for_download"],
      default: "awaiting_approval"
    },
    estimatedDelivery: { type: Date, default: null },
    pricingStatus: {
      type: String,
      enum: ["unquoted", "quoted", "accepted", "rejected"],
      default: "unquoted"
    },
    basePrice: { type: Number, default: null },
    customAdjustments: { type: [pricingAdjustmentSchema], default: [] },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number, default: null },
    currency: { type: String, default: "PHP" },
    quotedAt: { type: Date, default: null },
    quotedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    pricingAcceptedAt: { type: Date, default: null },
    quoteVersion: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "processing", "paid", "failed", "cancelled", "refunded"],
      default: "unpaid"
    },
    paymentDeletedAt: { type: Date, default: null },
    pricingHistory: { type: [pricingHistorySchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("Reservation", reservationSchema);
