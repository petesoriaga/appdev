import SystemSetting from "../models/SystemSetting.js";
import User from "../models/User.js";
import Reservation from "../models/Reservation.js";
import UserArchiveFolder from "../models/UserArchiveFolder.js";

const DEFAULT_KEY = "global";

const ensureSetting = async () => {
  const setting = await SystemSetting.findOneAndUpdate(
    { key: DEFAULT_KEY },
    { $setOnInsert: { key: DEFAULT_KEY } },
    { new: true, upsert: true }
  );
  return setting;
};

const normalizeMessage = (value, fallback) => {
  const text = String(value || "").trim();
  return text || fallback;
};

const getStatusPayload = (setting) => {
  const activeMode = setting.maintenanceMode
    ? "maintenance"
    : setting.vacationMode
      ? "vacation"
      : null;
  const activeMessage = activeMode === "maintenance"
    ? setting.maintenanceMessage
    : activeMode === "vacation"
      ? setting.vacationMessage
      : "";

  return {
    maintenanceMode: Boolean(setting.maintenanceMode),
    maintenanceMessage: setting.maintenanceMessage,
    vacationMode: Boolean(setting.vacationMode),
    vacationMessage: setting.vacationMessage,
    activeMode,
    activeMessage
  };
};

export const getPublicSystemStatus = async (_req, res) => {
  const setting = await ensureSetting();
  res.json({ success: true, system: getStatusPayload(setting) });
};

export const getPublicSystemStats = async (_req, res) => {
  const [happyClients, sessionsCompleted, deliveredPhotos] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Reservation.countDocuments({ status: "completed" }),
    UserArchiveFolder.aggregate([
      {
        $project: {
          photoCount: {
            $size: { $ifNull: ["$photos", []] }
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$photoCount" }
        }
      }
    ])
  ]);

  const picturesDelivered = Number(deliveredPhotos?.[0]?.total || 0);

  res.json({
    success: true,
    stats: {
      happyClients: Number(happyClients || 0),
      sessionsCompleted: Number(sessionsCompleted || 0),
      picturesDelivered,
      updatedAt: new Date().toISOString()
    }
  });
};

export const getAdminSystemStatus = async (_req, res) => {
  const setting = await ensureSetting();
  res.json({ success: true, system: getStatusPayload(setting) });
};

export const updateSystemStatus = async (req, res) => {
  const payload = req.body || {};
  const current = await ensureSetting();

  const maintenanceMode = typeof payload.maintenanceMode === "boolean"
    ? payload.maintenanceMode
    : current.maintenanceMode;
  const vacationMode = typeof payload.vacationMode === "boolean"
    ? payload.vacationMode
    : current.vacationMode;

  const maintenanceMessage = normalizeMessage(
    payload.maintenanceMessage,
    current.maintenanceMessage || "SnapQueue is under maintenance right now. Please check back in a little while."
  );
  const vacationMessage = normalizeMessage(
    payload.vacationMessage,
    current.vacationMessage || "SnapQueue is currently on vacation mode. Services will resume soon."
  );

  const setting = await SystemSetting.findOneAndUpdate(
    { key: DEFAULT_KEY },
    {
      $set: {
        maintenanceMode,
        vacationMode,
        maintenanceMessage,
        vacationMessage,
        updatedBy: req.user?.sub || null
      }
    },
    { new: true, upsert: true }
  );

  res.json({ success: true, system: getStatusPayload(setting) });
};
