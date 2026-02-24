import mongoose from "mongoose";
import Advertisement from "../models/Advertisement.js";

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toDayStart = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDayEnd = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const normalizePayload = (body = {}) => {
  const payload = {};
  if (typeof body.title === "string") payload.title = body.title.trim();
  if (typeof body.description === "string") payload.description = body.description.trim();
  if (typeof body.imageUrl === "string") payload.imageUrl = body.imageUrl.trim();
  if (typeof body.linkUrl === "string") payload.linkUrl = body.linkUrl.trim();
  if (typeof body.isActive === "boolean") payload.isActive = body.isActive;
  if (Object.prototype.hasOwnProperty.call(body, "startDate")) payload.startDate = parseDate(body.startDate);
  if (Object.prototype.hasOwnProperty.call(body, "endDate")) payload.endDate = parseDate(body.endDate);
  return payload;
};

const assertDateRange = (startDate, endDate) => {
  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    return "Start date cannot be later than end date";
  }
  return "";
};

export const listActiveAds = async (_req, res) => {
  const now = new Date();
  const candidates = await Advertisement.find({ isActive: true }).sort({ createdAt: -1 });
  const ads = candidates.filter((ad) => {
    const start = toDayStart(ad.startDate);
    const end = toDayEnd(ad.endDate);
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  });
  res.json({ success: true, ads });
};

export const listAdsAdmin = async (_req, res) => {
  const ads = await Advertisement.find().sort({ createdAt: -1 });
  res.json({ success: true, ads });
};

export const createAd = async (req, res) => {
  const payload = normalizePayload(req.body);
  if (!payload.title) {
    return res.status(400).json({ success: false, message: "Title is required" });
  }
  const dateRangeError = assertDateRange(payload.startDate, payload.endDate);
  if (dateRangeError) {
    return res.status(400).json({ success: false, message: dateRangeError });
  }

  const ad = await Advertisement.create({
    ...payload,
    startDate: toDayStart(payload.startDate),
    endDate: toDayEnd(payload.endDate),
    createdBy: req.user?.sub || null,
    updatedBy: req.user?.sub || null
  });

  res.status(201).json({ success: true, ad });
};

export const updateAd = async (req, res) => {
  const adId = String(req.params.id || "");
  if (!mongoose.Types.ObjectId.isValid(adId)) {
    return res.status(400).json({ success: false, message: "Invalid ad id" });
  }

  const current = await Advertisement.findById(adId);
  if (!current) {
    return res.status(404).json({ success: false, message: "Ad not found" });
  }

  const payload = normalizePayload(req.body);
  const startDate = Object.prototype.hasOwnProperty.call(payload, "startDate")
    ? toDayStart(payload.startDate)
    : current.startDate;
  const endDate = Object.prototype.hasOwnProperty.call(payload, "endDate")
    ? toDayEnd(payload.endDate)
    : current.endDate;
  const dateRangeError = assertDateRange(startDate, endDate);
  if (dateRangeError) {
    return res.status(400).json({ success: false, message: dateRangeError });
  }

  const ad = await Advertisement.findByIdAndUpdate(
    adId,
    {
      $set: {
        ...payload,
        ...(Object.prototype.hasOwnProperty.call(payload, "startDate") ? { startDate } : {}),
        ...(Object.prototype.hasOwnProperty.call(payload, "endDate") ? { endDate } : {}),
        updatedBy: req.user?.sub || null
      }
    },
    { new: true }
  );
  res.json({ success: true, ad });
};

export const deleteAd = async (req, res) => {
  const adId = String(req.params.id || "");
  if (!mongoose.Types.ObjectId.isValid(adId)) {
    return res.status(400).json({ success: false, message: "Invalid ad id" });
  }

  const deleted = await Advertisement.findByIdAndDelete(adId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Ad not found" });
  }

  res.json({ success: true, message: "Advertisement deleted" });
};
