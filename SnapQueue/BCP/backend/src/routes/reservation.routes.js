import { Router } from "express";
import {
  acceptReservationPricing,
  cancelReservationByUser,
  checkDateAvailability,
  createReservation,
  listDashboardReservations,
  getReservationById,
  rejectReservationPricing,
  listReservations,
  updateReservationPricing,
  updateReservationStatus
} from "../controllers/reservation.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/", requireAuth, asyncHandler(createReservation));
router.get("/availability", requireAuth, asyncHandler(checkDateAvailability));
router.get("/dashboard", requireAuth, asyncHandler(listDashboardReservations));
router.get("/", requireAuth, asyncHandler(listReservations));
router.get("/:id", requireAuth, asyncHandler(getReservationById));
router.patch("/:id/pricing", requireAuth, requireAdmin, asyncHandler(updateReservationPricing));
router.post("/:id/pricing/accept", requireAuth, asyncHandler(acceptReservationPricing));
router.post("/:id/pricing/reject", requireAuth, asyncHandler(rejectReservationPricing));
router.post("/:id/cancel", requireAuth, asyncHandler(cancelReservationByUser));
router.patch("/:id/status", requireAuth, requireAdmin, asyncHandler(updateReservationStatus));

export default router;
