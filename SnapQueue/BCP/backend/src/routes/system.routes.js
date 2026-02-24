import { Router } from "express";
import {
  getAdminSystemStatus,
  getPublicSystemStats,
  getPublicSystemStatus,
  updateSystemStatus
} from "../controllers/system.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/status", asyncHandler(getPublicSystemStatus));
router.get("/stats", asyncHandler(getPublicSystemStats));
router.get("/admin", requireAuth, requireAdmin, asyncHandler(getAdminSystemStatus));
router.patch("/admin", requireAuth, requireAdmin, asyncHandler(updateSystemStatus));

export default router;
