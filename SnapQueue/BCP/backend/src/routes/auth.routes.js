import { Router } from "express";
import { forgotPasswordRequest, me, resetPassword, signin, signup } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/signup", asyncHandler(signup));
router.post("/signin", asyncHandler(signin));
router.post("/forgot-password", asyncHandler(forgotPasswordRequest));
router.post("/reset-password", asyncHandler(resetPassword));
router.get("/me", requireAuth, asyncHandler(me));

export default router;
