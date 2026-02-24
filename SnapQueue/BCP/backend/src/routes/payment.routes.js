import { Router } from "express";
import {
  createPayment,
  deletePayment,
  getPaymentByReservation,
  listPayments,
  requestRefund,
  resolveRefund,
  verifyPayment
} from "../controllers/payment.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/", requireAuth, asyncHandler(createPayment));
router.get("/reservation/:reservationId", requireAuth, asyncHandler(getPaymentByReservation));
router.get("/", requireAuth, requireAdmin, asyncHandler(listPayments));
router.patch("/:id/status", requireAuth, requireAdmin, asyncHandler(verifyPayment));
router.delete("/:id", requireAuth, asyncHandler(deletePayment));
router.post("/:id/delete", requireAuth, asyncHandler(deletePayment));
router.post("/:id/refund/request", requireAuth, asyncHandler(requestRefund));
router.post("/:id/refund/resolve", requireAuth, requireAdmin, asyncHandler(resolveRefund));

export default router;
