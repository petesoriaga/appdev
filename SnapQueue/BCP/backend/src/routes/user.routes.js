import { Router } from "express";
import {
  changePassword,
  deleteMe,
  deleteUserByAdmin,
  listUsers,
  me,
  updateMe,
  updateUserBlockStatus
} from "../controllers/user.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/me", requireAuth, asyncHandler(me));
router.patch("/me", requireAuth, asyncHandler(updateMe));
router.delete("/me", requireAuth, asyncHandler(deleteMe));
router.patch("/me/password", requireAuth, asyncHandler(changePassword));
router.post("/me/password", requireAuth, asyncHandler(changePassword));
router.patch("/change-password", requireAuth, asyncHandler(changePassword));
router.post("/change-password", requireAuth, asyncHandler(changePassword));
router.get("/", requireAuth, requireAdmin, asyncHandler(listUsers));
router.patch("/:id/block", requireAuth, requireAdmin, asyncHandler(updateUserBlockStatus));
router.delete("/:id", requireAuth, requireAdmin, asyncHandler(deleteUserByAdmin));
router.patch("/block/:id", requireAuth, requireAdmin, asyncHandler(updateUserBlockStatus));
router.patch("/:id/ban", requireAuth, requireAdmin, asyncHandler(updateUserBlockStatus));
router.delete("/delete/:id", requireAuth, requireAdmin, asyncHandler(deleteUserByAdmin));

export default router;
