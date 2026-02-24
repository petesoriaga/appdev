import { Router } from "express";
import {
  createAd,
  deleteAd,
  listActiveAds,
  listAdsAdmin,
  updateAd
} from "../controllers/advertisement.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listActiveAds));
router.get("/admin", requireAuth, requireAdmin, asyncHandler(listAdsAdmin));
router.post("/", requireAuth, requireAdmin, asyncHandler(createAd));
router.patch("/:id", requireAuth, requireAdmin, asyncHandler(updateAd));
router.delete("/:id", requireAuth, requireAdmin, asyncHandler(deleteAd));

export default router;
