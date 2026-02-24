import express from "express";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import chatbotRoutes from "./routes/chatbot.routes.js";
import galleryRoutes from "./routes/gallery.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import userRoutes from "./routes/user.routes.js";
import archiveRoutes from "./routes/archive.routes.js";
import systemRoutes from "./routes/system.routes.js";
import advertisementRoutes from "./routes/advertisement.routes.js";
import SystemSetting from "./models/SystemSetting.js";
import User from "./models/User.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticRoot = path.resolve(__dirname, "../../");
const DEFAULT_SYSTEM_STATUS = {
  maintenanceMode: false,
  maintenanceMessage: "SnapQueue is under maintenance right now. Please check back in a little while.",
  vacationMode: false,
  vacationMessage: "SnapQueue is currently on vacation mode. Services will resume soon."
};
const SYSTEM_STATUS_CACHE_MS = 5000;
let systemStatusCache = { data: DEFAULT_SYSTEM_STATUS, expiresAt: 0 };

const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const target = parts.find((part) => part.startsWith(`${name}=`));
  return target ? decodeURIComponent(target.slice(name.length + 1)) : null;
};

const hasAdminAccess = (role) => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalized === "admin" || normalized === "super_admin" || normalized === "superadmin";
};

const verifyPageSession = async (token) => {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.sub).select("_id role email isBlocked tokenVersion").lean();
  if (!user || user.isBlocked) return null;
  if (Number(decoded?.tv || 0) !== Number(user.tokenVersion || 0)) return null;
  return {
    sub: String(user._id),
    role: user.role,
    email: user.email
  };
};

const requireAdminPageAccess = async (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;
  const cookieToken = getCookieValue(req.headers.cookie, "auth_token");
  const token = bearer || cookieToken;
  if (!token) {
    return res.redirect("/login.html?redirect=admin");
  }
  try {
    const decoded = await verifyPageSession(token);
    if (!hasAdminAccess(decoded?.role)) {
      return res.redirect("/dashboard.html");
    }
    return next();
  } catch (_error) {
    return res.redirect("/login.html?redirect=admin");
  }
};

const decodeRequestUser = (req) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;
  const cookieToken = getCookieValue(req.headers.cookie, "auth_token");
  const token = bearer || cookieToken;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    return null;
  }
};

const requireUserPageAccess = async (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;
  const cookieToken = getCookieValue(req.headers.cookie, "auth_token");
  const token = bearer || cookieToken;
  if (!token) {
    return res.redirect("/login.html");
  }
  let decoded = null;
  try {
    decoded = await verifyPageSession(token);
  } catch (_error) {
    decoded = null;
  }
  if (!decoded) {
    return res.redirect("/login.html");
  }
  req.user = decoded;
  return next();
};

const getSystemStatus = async () => {
  if (Date.now() < systemStatusCache.expiresAt) {
    return systemStatusCache.data;
  }
  const setting = await SystemSetting.findOne({ key: "global" }).lean();
  const data = setting
    ? {
        maintenanceMode: Boolean(setting.maintenanceMode),
        maintenanceMessage: setting.maintenanceMessage || DEFAULT_SYSTEM_STATUS.maintenanceMessage,
        vacationMode: Boolean(setting.vacationMode),
        vacationMessage: setting.vacationMessage || DEFAULT_SYSTEM_STATUS.vacationMessage
      }
    : DEFAULT_SYSTEM_STATUS;

  systemStatusCache = { data, expiresAt: Date.now() + SYSTEM_STATUS_CACHE_MS };
  return data;
};

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json({ limit: "10gb" }));
app.use(express.urlencoded({ extended: true, limit: "10gb" }));
app.use(morgan("dev"));

app.use(async (req, res, next) => {
  const publicAllowedPaths = new Set([
    "/login.html",
    "/maintenance.html",
    "/terms",
    "/api/health",
    "/api/system/status"
  ]);
  const isPublicAllowed = publicAllowedPaths.has(req.path);
  const isAuthApi = req.path.startsWith("/api/auth/");
  const isStaticAsset = !req.path.startsWith("/api/") && !req.path.endsWith(".html") && req.path !== "/";
  const user = decodeRequestUser(req);
  const isAdmin = hasAdminAccess(user?.role);
  if (isPublicAllowed || isAuthApi || isStaticAsset || isAdmin) {
    return next();
  }

  try {
    const system = await getSystemStatus();
    const activeMode = system.maintenanceMode ? "maintenance" : system.vacationMode ? "vacation" : null;
    if (!activeMode) {
      return next();
    }
    const message = activeMode === "maintenance" ? system.maintenanceMessage : system.vacationMessage;
    if (req.path.startsWith("/api/")) {
      return res.status(503).json({
        success: false,
        message,
        mode: activeMode
      });
    }
    return res.redirect(`/maintenance.html?mode=${encodeURIComponent(activeMode)}`);
  } catch (_error) {
    return next();
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bcp-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/users", userRoutes);
app.use("/api/archive", archiveRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/ads", advertisementRoutes);
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/adverts", advertisementRoutes);

// Serve original static HTML frontend from project root.
app.get("/admin_dashboard.html", requireAdminPageAccess, (req, res) => {
  res.sendFile(path.join(staticRoot, "admin_dashboard.html"));
});
app.get("/dashboard.html", requireUserPageAccess, (req, res) => {
  res.sendFile(path.join(staticRoot, "dashboard.html"));
});
app.get("/reservation.html", requireUserPageAccess, (req, res) => {
  res.sendFile(path.join(staticRoot, "reservation.html"));
});
app.get("/payment.html", requireUserPageAccess, (req, res) => {
  res.sendFile(path.join(staticRoot, "payment.html"));
});
app.get("/maintenance.html", (_req, res) => {
  res.sendFile(path.join(staticRoot, "maintenance.html"));
});
app.get("/terms", (_req, res) => {
  res.sendFile(path.join(staticRoot, "terms.html"));
});
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use(express.static(staticRoot));
app.get("/", (_req, res) => {
  res.sendFile(path.join(staticRoot, "index.html"));
});

app.use(notFound);
app.use(errorHandler);

export default app;
