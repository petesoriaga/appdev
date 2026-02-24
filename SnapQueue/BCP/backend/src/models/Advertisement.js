import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    linkUrl: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

advertisementSchema.index({ isActive: 1, startDate: 1, endDate: 1, createdAt: -1 });

export default mongoose.model("Advertisement", advertisementSchema);
