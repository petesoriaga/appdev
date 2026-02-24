import { Router } from "express";
import { createContactMessage, listContactMessages, updateContactMessageStatus } from "../controllers/contact.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/", asyncHandler(createContactMessage));
router.get("/", requireAuth, requireAdmin, asyncHandler(listContactMessages));
router.patch("/:id/status", requireAuth, requireAdmin, asyncHandler(updateContactMessageStatus));

export default router;
