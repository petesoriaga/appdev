import Reservation from "../models/Reservation.js";
import User from "../models/User.js";
import UserArchiveFolder from "../models/UserArchiveFolder.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const uploadsRoot = path.resolve(__dirname, "../../uploads/archive");
const ARCHIVE_RETENTION_DAYS = 7;
const ARCHIVE_RETENTION_MS = ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const normalizeFolderName = (name) => String(name || "").trim() || "Admin Delivery";
const sanitizePathPart = (value) => String(value || "").replace(/[^a-zA-Z0-9-_]/g, "_");
const sanitizeFileName = (value) => String(value || "photo").replace(/[^a-zA-Z0-9_.-]/g, "_");

const dataUrlToBuffer = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
};

const removeManagedFile = async (publicUrl) => {
  if (!String(publicUrl || "").startsWith("/uploads/")) return;
  const relativePath = publicUrl.replace(/^\//, "");
  const absolutePath = path.resolve(backendRoot, relativePath);
  if (!absolutePath.startsWith(path.resolve(backendRoot, "uploads"))) return;
  try {
    await fs.unlink(absolutePath);
  } catch (_error) {
    // ignore missing files
  }
};

const pruneExpiredArchiveForUser = async (userId) => {
  const folders = await UserArchiveFolder.find({ userId }).sort({ name: 1 });
  const now = new Date();

  for (const folder of folders) {
    const expiredPhotos = (folder.photos || []).filter((photo) => photo?.expiresAt && new Date(photo.expiresAt) <= now);
    if (!expiredPhotos.length) continue;

    await Promise.all(expiredPhotos.map((photo) => removeManagedFile(photo.url)));
    folder.photos = (folder.photos || []).filter((photo) => !(photo?.expiresAt && new Date(photo.expiresAt) <= now));
    await folder.save();
  }

  return UserArchiveFolder.find({ userId }).sort({ name: 1 });
};

const persistFile = async ({ url, name, userId, folderName }) => {
  const data = dataUrlToBuffer(url);
  if (!data) {
    return { name, url };
  }

  const safeUser = sanitizePathPart(userId);
  const safeFolder = sanitizePathPart(folderName);
  const safeName = sanitizeFileName(name || "photo");
  const extFromName = path.extname(safeName);
  const ext = extFromName || (data.mime.includes("png") ? ".png" : data.mime.includes("webp") ? ".webp" : ".jpg");
  const baseName = extFromName ? path.basename(safeName, extFromName) : safeName;
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}${ext}`;
  const dir = path.join(uploadsRoot, safeUser, safeFolder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), data.buffer);

  const publicUrl = `/uploads/archive/${safeUser}/${safeFolder}/${fileName}`;
  return { name: safeName, url: publicUrl };
};

const persistBufferFile = async ({ buffer, name, mime, userId, folderName }) => {
  const safeUser = sanitizePathPart(userId);
  const safeFolder = sanitizePathPart(folderName);
  const safeName = sanitizeFileName(name || "photo");
  const extFromName = path.extname(safeName);
  const ext = extFromName || (String(mime || "").includes("png") ? ".png" : String(mime || "").includes("webp") ? ".webp" : ".jpg");
  const baseName = extFromName ? path.basename(safeName, extFromName) : safeName;
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}${ext}`;
  const dir = path.join(uploadsRoot, safeUser, safeFolder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buffer);

  const publicUrl = `/uploads/archive/${safeUser}/${safeFolder}/${fileName}`;
  return { name: safeName, url: publicUrl };
};

const moveTempFileToArchive = async ({ tmpPath, originalName, mime, userId, folderName }) => {
  const safeUser = sanitizePathPart(userId);
  const safeFolder = sanitizePathPart(folderName);
  const safeName = sanitizeFileName(originalName || "photo");
  const extFromName = path.extname(safeName);
  const ext = extFromName || (String(mime || "").includes("png") ? ".png" : String(mime || "").includes("webp") ? ".webp" : ".jpg");
  const baseName = extFromName ? path.basename(safeName, extFromName) : safeName;
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}${ext}`;
  const dir = path.join(uploadsRoot, safeUser, safeFolder);
  await fs.mkdir(dir, { recursive: true });
  const targetPath = path.join(dir, fileName);
  try {
    await fs.rename(tmpPath, targetPath);
  } catch (_error) {
    const data = await fs.readFile(tmpPath);
    await fs.writeFile(targetPath, data);
    await fs.unlink(tmpPath).catch(() => {});
  }
  const publicUrl = `/uploads/archive/${safeUser}/${safeFolder}/${fileName}`;
  return { name: safeName, url: publicUrl };
};

const resolveTargetUserIdFromReservation = async (reservationId) => {
  const reservation = await Reservation.findById(reservationId).select("userId email");
  if (!reservation) {
    return { error: { status: 404, message: "Reservation not found" } };
  }
  if (reservation.userId) {
    return { userId: reservation.userId, reservation };
  }
  if (!reservation.email) {
    return { error: { status: 400, message: "Reservation has no owner reference" } };
  }
  const user = await User.findOne({ email: reservation.email }).select("_id");
  if (!user) {
    return { error: { status: 404, message: "User not found for reservation" } };
  }
  return { userId: user._id, reservation };
};

export const getMyArchive = async (req, res) => {
  const folders = await pruneExpiredArchiveForUser(req.user.sub);
  res.json({ success: true, folders });
};

export const getReservationFolders = async (req, res) => {
  const resolved = await resolveTargetUserIdFromReservation(req.params.reservationId);
  if (resolved.error) {
    return res.status(resolved.error.status).json({ success: false, message: resolved.error.message });
  }
  const folders = await pruneExpiredArchiveForUser(resolved.userId);
  res.json({ success: true, folders });
};

export const createFolderForReservation = async (req, res) => {
  const { reservationId, folderName } = req.body;
  if (!reservationId) {
    return res.status(400).json({ success: false, message: "reservationId is required" });
  }

  const resolved = await resolveTargetUserIdFromReservation(reservationId);
  if (resolved.error) {
    return res.status(resolved.error.status).json({ success: false, message: resolved.error.message });
  }

  const name = normalizeFolderName(folderName);
  const folder = await UserArchiveFolder.findOneAndUpdate(
    { userId: resolved.userId, name },
    { $setOnInsert: { userId: resolved.userId, name } },
    { new: true, upsert: true }
  );
  res.status(201).json({ success: true, folder });
};

export const uploadToReservationFolder = async (req, res) => {
  const { reservationId, folderName, files } = req.body;
  if (!reservationId) {
    return res.status(400).json({ success: false, message: "reservationId is required" });
  }
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, message: "files are required" });
  }

  const cleanedFiles = files
    .filter((file) => file && typeof file.url === "string" && file.url.trim())
    .map((file) => ({ name: String(file.name || "").trim(), url: file.url.trim() }));

  if (!cleanedFiles.length) {
    return res.status(400).json({ success: false, message: "No valid file payload" });
  }

  const resolved = await resolveTargetUserIdFromReservation(reservationId);
  if (resolved.error) {
    return res.status(resolved.error.status).json({ success: false, message: resolved.error.message });
  }

  const name = normalizeFolderName(folderName);
  const persisted = await Promise.all(
    cleanedFiles.map((file) => persistFile({ ...file, userId: resolved.userId.toString(), folderName: name }))
  );
  const normalizedFiles = persisted.map((file) => ({
    name: file.name,
    url: file.url,
    uploadedBy: req.user.sub,
    uploadedAt: new Date(),
    expiresAt: new Date(Date.now() + ARCHIVE_RETENTION_MS)
  }));

  const folder = await UserArchiveFolder.findOneAndUpdate(
    { userId: resolved.userId, name },
    {
      $setOnInsert: { userId: resolved.userId, name },
      $push: { photos: { $each: normalizedFiles } }
    },
    { new: true, upsert: true }
  );

  res.status(201).json({ success: true, folder, uploaded: normalizedFiles.length });
};

export const uploadSingleFileForReservation = async (req, res) => {
  const reservationId = String(req.headers["x-reservation-id"] || "").trim();
  const rawFolderName = String(req.headers["x-folder-name"] || "").trim();
  const rawFileName = String(req.headers["x-file-name"] || "").trim();
  const mime = String(req.headers["x-file-type"] || "application/octet-stream");

  if (!reservationId) {
    return res.status(400).json({ success: false, message: "x-reservation-id header is required" });
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ success: false, message: "Empty file body" });
  }

  const resolved = await resolveTargetUserIdFromReservation(reservationId);
  if (resolved.error) {
    return res.status(resolved.error.status).json({ success: false, message: resolved.error.message });
  }

  const folderName = normalizeFolderName(decodeURIComponent(rawFolderName || "Admin Delivery"));
  const decodedFileName = decodeURIComponent(rawFileName || "photo");
  const persisted = await persistBufferFile({
    buffer: req.body,
    name: decodedFileName,
    mime,
    userId: resolved.userId.toString(),
    folderName
  });

  const fileRecord = {
    name: persisted.name,
    url: persisted.url,
    uploadedBy: req.user.sub,
    uploadedAt: new Date(),
    expiresAt: new Date(Date.now() + ARCHIVE_RETENTION_MS)
  };

  const folder = await UserArchiveFolder.findOneAndUpdate(
    { userId: resolved.userId, name: folderName },
    {
      $setOnInsert: { userId: resolved.userId, name: folderName },
      $push: { photos: fileRecord }
    },
    { new: true, upsert: true }
  );

  res.status(201).json({ success: true, folder, uploaded: 1, photo: fileRecord });
};

export const uploadMultipartForReservation = async (req, res) => {
  const { reservationId, folderName } = req.body;
  if (!reservationId) {
    return res.status(400).json({ success: false, message: "reservationId is required" });
  }
  if (!Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "No files uploaded" });
  }

  const resolved = await resolveTargetUserIdFromReservation(reservationId);
  if (resolved.error) {
    return res.status(resolved.error.status).json({ success: false, message: resolved.error.message });
  }

  const name = normalizeFolderName(folderName);
  const persisted = await Promise.all(
    req.files.map((file) =>
      moveTempFileToArchive({
        tmpPath: file.path,
        originalName: file.originalname,
        mime: file.mimetype,
        userId: resolved.userId.toString(),
        folderName: name
      })
    )
  );

  const normalizedFiles = persisted.map((file) => ({
    name: file.name,
    url: file.url,
    uploadedBy: req.user.sub,
    uploadedAt: new Date(),
    expiresAt: new Date(Date.now() + ARCHIVE_RETENTION_MS)
  }));

  const folder = await UserArchiveFolder.findOneAndUpdate(
    { userId: resolved.userId, name },
    {
      $setOnInsert: { userId: resolved.userId, name },
      $push: { photos: { $each: normalizedFiles } }
    },
    { new: true, upsert: true }
  );

  res.status(201).json({ success: true, folder, uploaded: normalizedFiles.length });
};
