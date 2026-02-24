import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { isPasswordResetMailConfigured, sendPasswordResetEmail } from "../utils/mailer.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 15;
const FORGOT_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RESET_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_LIMIT_BY_IP = 5;
const FORGOT_LIMIT_BY_EMAIL = 3;
const RESET_LIMIT_BY_IP = 10;
const rateLimitBuckets = new Map();
const isProduction = () => String(process.env.NODE_ENV || "").toLowerCase() === "production";
const isDevConsoleResetFallbackEnabled = () =>
  !isProduction() && String(process.env.DEV_CONSOLE_RESET_LINK || "true").toLowerCase() !== "false";

const getClientIp = (req) =>
  String(
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );

const takeRateLimit = (key, limit, windowMs) => {
  const now = Date.now();
  const current = rateLimitBuckets.get(key);
  if (!current || current.expiresAt <= now) {
    rateLimitBuckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterMs: Math.max(0, current.expiresAt - now) };
  }
  current.count += 1;
  return { allowed: true, retryAfterMs: 0 };
};

const cleanupRateLimitBuckets = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitBuckets.entries()) {
    if (value.expiresAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
};

const getResetBaseUrl = (req) => {
  const configured = String(process.env.PASSWORD_RESET_BASE_URL || process.env.CLIENT_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`.replace(/\/+$/, "");
};

const buildTokenPayload = (user) => ({
  sub: user._id.toString(),
  role: user.role,
  email: user.email,
  tv: Number(user.tokenVersion || 0)
});

export const signup = async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }
  if (String(password || "").length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ success: false, message: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ fullName, email: normalizedEmail, phone, passwordHash });
  const token = signToken(buildTokenPayload(user));

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
      role: user.role
    }
  });
};

export const signin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }
  if (user.isBlocked) {
    return res.status(403).json({ success: false, message: "Your account is blocked. Please contact admin." });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = signToken(buildTokenPayload(user));
  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
      role: user.role
    }
  });
};

export const me = async (req, res) => {
  const user = await User.findById(req.user.sub).select("-passwordHash");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.json({ success: true, user });
};

export const forgotPasswordRequest = async (req, res) => {
  cleanupRateLimitBuckets();
  const email = String(req.body?.email || "").toLowerCase().trim();
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  const ip = getClientIp(req);
  const ipLimit = takeRateLimit(`forgot:ip:${ip}`, FORGOT_LIMIT_BY_IP, FORGOT_LIMIT_WINDOW_MS);
  if (!ipLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many reset attempts. Please try again later.",
      retryAfterSeconds: Math.ceil(ipLimit.retryAfterMs / 1000)
    });
  }

  const emailLimit = takeRateLimit(`forgot:email:${email}`, FORGOT_LIMIT_BY_EMAIL, FORGOT_LIMIT_WINDOW_MS);
  if (!emailLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many reset requests for this email. Please wait before trying again.",
      retryAfterSeconds: Math.ceil(emailLimit.retryAfterMs / 1000)
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({
      success: true,
      message: "If this email is registered, password reset instructions have been sent."
    });
  }

  const resetToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const resetUrl = `${getResetBaseUrl(req)}/login.html?mode=reset&token=${encodeURIComponent(resetToken)}`;
  if (!isPasswordResetMailConfigured()) {
    if (!isDevConsoleResetFallbackEnabled()) {
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await user.save();
      return res.status(503).json({ success: false, message: "Password reset is temporarily unavailable." });
    }
    console.warn("Password reset email not configured. Dev fallback reset link:", {
      email: user.email,
      resetUrl,
      expiresAt: user.passwordResetExpiresAt.toISOString()
    });
    return res.json({
      success: true,
      message: "If this email is registered, password reset instructions have been sent. (Dev: check backend console)"
    });
  }

  try {
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      expiresMinutes: Math.floor(RESET_TOKEN_TTL_MS / 60000)
    });
    const masked = user.email.replace(/^(.{2}).+(@.+)$/, "$1***$2");
    console.log("Password reset email queued", { email: masked });
  } catch (_error) {
    console.error("Password reset email delivery failed", { email: user.email, message: _error?.message });
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();
    return res.json({
      success: true,
      message: "If this email is registered, password reset instructions have been sent."
    });
  }

  return res.json({
    success: true,
    message: "If this email is registered, password reset instructions have been sent."
  });
};

export const resetPassword = async (req, res) => {
  cleanupRateLimitBuckets();
  const token = String(req.body?.token || "").trim();
  const password = String(req.body?.password || "");
  const ip = getClientIp(req);
  const ipLimit = takeRateLimit(`reset:ip:${ip}`, RESET_LIMIT_BY_IP, RESET_LIMIT_WINDOW_MS);
  if (!ipLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many reset attempts. Please try again later.",
      retryAfterSeconds: Math.ceil(ipLimit.retryAfterMs / 1000)
    });
  }
  if (!token) {
    return res.status(400).json({ success: false, message: "Reset token is required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() }
  });
  if (!user) {
    return res.status(400).json({ success: false, message: "Reset session expired. Please try again." });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  return res.json({ success: true, message: "Password reset successful. You can now sign in." });
};
