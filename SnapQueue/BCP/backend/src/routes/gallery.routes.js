import { Router } from "express";
import {
  createGalleryItem,
  deleteGalleryItem,
  listGalleryItems,
  updateGalleryItem
} from "../controllers/gallery.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listGalleryItems));
router.post("/", requireAuth, requireAdmin, asyncHandler(createGalleryItem));
router.patch("/:id", requireAuth, requireAdmin, asyncHandler(updateGalleryItem));
router.delete("/:id", requireAuth, requireAdmin, asyncHandler(deleteGalleryItem));

export default router;
