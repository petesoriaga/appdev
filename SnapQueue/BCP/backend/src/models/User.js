import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    emailNotificationsEnabled: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
