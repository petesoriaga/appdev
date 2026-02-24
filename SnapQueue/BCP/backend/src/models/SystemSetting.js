import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: "SnapQueue is under maintenance right now. Please check back in a little while."
    },
    vacationMode: { type: Boolean, default: false },
    vacationMessage: {
      type: String,
      default: "SnapQueue is currently on vacation mode. Services will resume soon."
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export default mongoose.model("SystemSetting", systemSettingSchema);
