import { Router } from "express";
import {
  askAI,
  createQA,
  deleteQA,
  getOrCreateMyLiveThread,
  listLiveThreadMessages,
  listLiveThreads,
  listMyLiveThreads,
  listQAs,
  sendLiveThreadMessage,
  updateLiveThreadStatus,
  updateQA
} from "../controllers/chatbot.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/qa", asyncHandler(listQAs));
router.post("/ai", asyncHandler(askAI));
router.post("/qa", requireAuth, requireAdmin, asyncHandler(createQA));
router.patch("/qa/:id", requireAuth, requireAdmin, asyncHandler(updateQA));
router.delete("/qa/:id", requireAuth, requireAdmin, asyncHandler(deleteQA));
router.get("/live/thread", requireAuth, asyncHandler(getOrCreateMyLiveThread));
router.get("/live/threads/me", requireAuth, asyncHandler(listMyLiveThreads));
router.get("/live/threads", requireAuth, requireAdmin, asyncHandler(listLiveThreads));
router.get("/live/threads/:threadId/messages", requireAuth, asyncHandler(listLiveThreadMessages));
router.post("/live/threads/:threadId/messages", requireAuth, asyncHandler(sendLiveThreadMessage));
router.patch("/live/threads/:threadId/status", requireAuth, requireAdmin, asyncHandler(updateLiveThreadStatus));

// Backward-compatible aliases (non-/live paths)
router.get("/thread", requireAuth, asyncHandler(getOrCreateMyLiveThread));
router.get("/threads/me", requireAuth, asyncHandler(listMyLiveThreads));
router.get("/threads", requireAuth, requireAdmin, asyncHandler(listLiveThreads));
router.get("/threads/:threadId/messages", requireAuth, asyncHandler(listLiveThreadMessages));
router.post("/threads/:threadId/messages", requireAuth, asyncHandler(sendLiveThreadMessage));
router.patch("/threads/:threadId/status", requireAuth, requireAdmin, asyncHandler(updateLiveThreadStatus));

export default router;
