import mongoose from "mongoose";

const archivePhotoSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }
  },
  { _id: false }
);

const userArchiveFolderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    photos: { type: [archivePhotoSchema], default: [] }
  },
  { timestamps: true }
);

userArchiveFolderSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model("UserArchiveFolder", userArchiveFolderSchema);
