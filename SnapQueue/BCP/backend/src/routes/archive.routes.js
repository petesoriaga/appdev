import { Router } from "express";
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  createFolderForReservation,
  getMyArchive,
  getReservationFolders,
  uploadMultipartForReservation,
  uploadSingleFileForReservation,
  uploadToReservationFolder
} from "../controllers/archive.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadTmpDir = path.resolve(__dirname, "../../uploads/tmp");
if (!fs.existsSync(uploadTmpDir)) {
  fs.mkdirSync(uploadTmpDir, { recursive: true });
}
const upload = multer({
  dest: uploadTmpDir,
  limits: {
    files: 10000,
    fieldSize: 10 * 1024 * 1024,
    parts: 20000
  }
});

router.get("/me", requireAuth, asyncHandler(getMyArchive));
router.get("/admin/reservation/:reservationId", requireAuth, requireAdmin, asyncHandler(getReservationFolders));
router.post("/admin/folders", requireAuth, requireAdmin, asyncHandler(createFolderForReservation));
router.post("/admin/upload", requireAuth, requireAdmin, asyncHandler(uploadToReservationFolder));
router.post(
  "/admin/upload-multipart",
  requireAuth,
  requireAdmin,
  upload.array("files"),
  asyncHandler(uploadMultipartForReservation)
);
router.post(
  "/admin/upload-file",
  requireAuth,
  requireAdmin,
  express.raw({ type: "application/octet-stream", limit: "10gb" }),
  asyncHandler(uploadSingleFileForReservation)
);

export default router;
