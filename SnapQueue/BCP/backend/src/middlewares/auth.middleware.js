import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const hasAdminAccess = (role) => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalized === "admin" || normalized === "super_admin" || normalized === "superadmin";
};

export const requireAuth = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, message: "Service temporarily unavailable. Please try again." });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select("_id role email isBlocked tokenVersion");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (Number(decoded?.tv || 0) !== Number(user.tokenVersion || 0)) {
      return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account is blocked. Please contact admin." });
    }
    req.user = {
      sub: user._id.toString(),
      role: user.role,
      email: user.email
    };
    next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || !hasAdminAccess(req.user.role)) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};
