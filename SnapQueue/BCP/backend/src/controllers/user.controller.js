import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const me = async (req, res) => {
  const user = await User.findById(req.user.sub).select("-passwordHash");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.json({ success: true, user });
};

export const updateMe = async (req, res) => {
  const { fullName, email, phone, bio, avatarUrl, emailNotificationsEnabled } = req.body;
  const userId = String(req.user?.sub || "");
  const currentUser = await User.findById(userId);
  if (!currentUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const update = {};

  if (typeof fullName === "string") {
    const normalizedName = fullName.trim();
    if (normalizedName && normalizedName.length < 2) {
      return res.status(400).json({ success: false, message: "Full name must be at least 2 characters" });
    }
    if (normalizedName) update.fullName = normalizedName;
  }

  if (typeof email === "string") {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (normalizedEmail !== String(currentUser.email || "").toLowerCase()) {
      const existing = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: currentUser._id }
      }).select("_id");
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already in use" });
      }
      update.email = normalizedEmail;
    }
  }

  if (typeof phone === "string") update.phone = phone.trim();
  if (typeof bio === "string") update.bio = bio.trim();
  if (typeof avatarUrl === "string") update.avatarUrl = avatarUrl.trim();
  if (typeof emailNotificationsEnabled === "boolean") {
    update.emailNotificationsEnabled = emailNotificationsEnabled;
  }

  const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("-passwordHash");
  res.json({ success: true, user });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: "All password fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: "New password and confirmation do not match" });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
  }

  const user = await User.findById(req.user.sub);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const isCurrentPasswordValid = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!isCurrentPasswordValid) {
    return res.status(401).json({ success: false, message: "Current password is incorrect" });
  }

  if (String(currentPassword) === String(newPassword)) {
    return res.status(400).json({ success: false, message: "New password must be different from current password" });
  }

  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  await user.save();

  res.json({ success: true, message: "Password updated successfully" });
};

export const listUsers = async (_req, res) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json({ success: true, users });
};

export const updateUserBlockStatus = async (req, res) => {
  const userId = String(req.params.id || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

  const { blocked } = req.body || {};
  if (typeof blocked !== "boolean") {
    return res.status(400).json({ success: false, message: "blocked flag is required" });
  }

  const target = await User.findById(userId);
  if (!target) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  if (target.role === "admin") {
    return res.status(403).json({ success: false, message: "Admin accounts cannot be blocked" });
  }
  if (String(target._id) === String(req.user?.sub)) {
    return res.status(403).json({ success: false, message: "You cannot block your own account" });
  }

  target.isBlocked = blocked;
  target.blockedAt = blocked ? new Date() : null;
  await target.save();

  const user = await User.findById(target._id).select("-passwordHash");
  res.json({ success: true, user });
};

export const deleteUserByAdmin = async (req, res) => {
  const userId = String(req.params.id || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

  const target = await User.findById(userId).select("_id role");
  if (!target) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  if (target.role === "admin") {
    return res.status(403).json({ success: false, message: "Admin accounts cannot be deleted" });
  }
  if (String(target._id) === String(req.user?.sub)) {
    return res.status(403).json({ success: false, message: "You cannot delete your own account" });
  }

  await User.deleteOne({ _id: target._id });
  res.json({ success: true, message: "User deleted successfully" });
};

export const deleteMe = async (req, res) => {
  const userId = String(req.user?.sub || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

  const target = await User.findById(userId).select("_id role");
  if (!target) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  await User.deleteOne({ _id: target._id });
  res.json({ success: true, message: "Deleted successfully" });
};
