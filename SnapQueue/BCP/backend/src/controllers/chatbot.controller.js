import mongoose from "mongoose";
import https from "node:https";
import ChatQA from "../models/ChatQA.js";
import LiveChatThread from "../models/LiveChatThread.js";
import LiveChatMessage from "../models/LiveChatMessage.js";
import User from "../models/User.js";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_AI_INPUT_LENGTH = 500;
const DEFAULT_AI_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite"
];

const postJson = (urlString, body) =>
  new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const payload = JSON.stringify(body);
      const req = https.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          path: `${url.pathname}${url.search}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload)
          },
          timeout: 12000
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            let parsed = {};
            try {
              parsed = JSON.parse(data || "{}");
            } catch (_error) {
              parsed = {};
            }
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              const reason = parsed?.error?.message || `AI request failed (${res.statusCode})`;
              reject(new Error(reason));
            }
          });
        }
      );
      req.on("timeout", () => req.destroy(new Error("AI request timeout")));
      req.on("error", reject);
      req.write(payload);
      req.end();
    } catch (error) {
      reject(error);
    }
  });

const canAccessThread = (thread, user) => {
  if (!thread || !user) return false;
  if (user.role === "admin") return true;
  return String(thread.clientId) === String(user.sub);
};

export const listQAs = async (_req, res) => {
  const items = await ChatQA.find().sort({ question: 1 });
  res.json({ success: true, items });
};

export const createQA = async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ success: false, message: "Question and answer are required" });
  }

  const item = await ChatQA.create({ question: question.toLowerCase().trim(), answer });
  res.status(201).json({ success: true, item });
};

export const updateQA = async (req, res) => {
  const { question, answer } = req.body;
  const updates = {};
  if (question) {
    updates.question = question.toLowerCase().trim();
  }
  if (answer) {
    updates.answer = answer;
  }

  const item = await ChatQA.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!item) {
    return res.status(404).json({ success: false, message: "Q&A not found" });
  }

  res.json({ success: true, item });
};

export const deleteQA = async (req, res) => {
  const item = await ChatQA.findByIdAndDelete(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Q&A not found" });
  }

  res.json({ success: true, message: "Q&A deleted" });
};

export const getOrCreateMyLiveThread = async (req, res) => {
  if (req.user?.role === "admin") {
    return res.status(403).json({ success: false, message: "Admins should use thread list endpoint" });
  }

  let thread = await LiveChatThread.findOne({ clientId: req.user.sub, status: "open" }).sort({ updatedAt: -1 });
  if (!thread) {
    const profile = await User.findById(req.user.sub).select("fullName email").lean();
    thread = await LiveChatThread.create({
      clientId: req.user.sub,
      clientName: profile?.fullName || "Client",
      clientEmail: profile?.email || req.user?.email || ""
    });
  }

  res.json({ success: true, thread });
};

export const listMyLiveThreads = async (req, res) => {
  if (req.user?.role === "admin") {
    return res.status(403).json({ success: false, message: "Admins should use admin thread list endpoint" });
  }
  const threads = await LiveChatThread.find({ clientId: req.user.sub }).sort({ lastMessageAt: -1 });
  res.json({ success: true, threads });
};

export const listLiveThreads = async (req, res) => {
  const status = String(req.query.status || "").trim();
  const filter = {};
  if (status) {
    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status filter" });
    }
    filter.status = status;
  }

  const threads = await LiveChatThread.find(filter).sort({ lastMessageAt: -1 }).limit(200);
  res.json({ success: true, threads });
};

export const listLiveThreadMessages = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.threadId)) {
    return res.status(400).json({ success: false, message: "Invalid threadId" });
  }

  const thread = await LiveChatThread.findById(req.params.threadId);
  if (!thread) {
    return res.status(404).json({ success: false, message: "Thread not found" });
  }
  if (!canAccessThread(thread, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const filter = { threadId: thread._id };
  const afterRaw = String(req.query.after || "").trim();
  if (afterRaw) {
    const afterDate = new Date(afterRaw);
    if (!Number.isNaN(afterDate.getTime())) {
      filter.createdAt = { $gt: afterDate };
    }
  }

  const messages = await LiveChatMessage.find(filter).sort({ createdAt: 1 }).limit(300);
  res.json({ success: true, thread, messages });
};

export const sendLiveThreadMessage = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.threadId)) {
    return res.status(400).json({ success: false, message: "Invalid threadId" });
  }

  const text = String(req.body?.text || "").trim();
  if (!text) {
    return res.status(400).json({ success: false, message: "Message text is required" });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ success: false, message: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` });
  }

  const thread = await LiveChatThread.findById(req.params.threadId);
  if (!thread) {
    return res.status(404).json({ success: false, message: "Thread not found" });
  }
  if (!canAccessThread(thread, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (thread.status === "closed") {
    if (req.user?.role === "admin") {
      thread.status = "open";
    } else {
      return res.status(409).json({ success: false, message: "This chat is closed by admin" });
    }
  }

  const profile = await User.findById(req.user.sub).select("fullName email").lean();
  const senderRole = req.user?.role === "admin" ? "admin" : "user";
  const senderName = profile?.fullName || profile?.email || req.user?.email || senderRole;

  const message = await LiveChatMessage.create({
    threadId: thread._id,
    senderId: req.user.sub,
    senderRole,
    senderName,
    text
  });

  thread.lastMessage = text;
  thread.lastMessageAt = message.createdAt;
  await thread.save();

  res.status(201).json({ success: true, message: message });
};

export const updateLiveThreadStatus = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.threadId)) {
    return res.status(400).json({ success: false, message: "Invalid threadId" });
  }
  const status = String(req.body?.status || "").trim().toLowerCase();
  if (!["open", "closed"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  const thread = await LiveChatThread.findByIdAndUpdate(
    req.params.threadId,
    { status },
    { new: true }
  );
  if (!thread) {
    return res.status(404).json({ success: false, message: "Thread not found" });
  }

  res.json({ success: true, thread });
};

const fallbackAiReply = (text, qaItems = []) => {
  const input = String(text || "").toLowerCase();
  const matchedFaq = qaItems.find((item) =>
    input.includes(String(item.question || "").toLowerCase()) ||
    String(item.question || "").toLowerCase().includes(input)
  );
  if (matchedFaq?.answer) return matchedFaq.answer;
  if (/price|cost|package|rate|budget/.test(input)) {
    return "Packages: Basic PHP 2,700, Standard PHP 3,500, Premium PHP 4,500. Custom package is available.";
  }
  if (/book|reservation|reserve|schedule/.test(input)) {
    return "Use Reservation page, submit event details, and wait for admin approval/quote.";
  }
  if (/payment|gcash|maya|pay/.test(input)) {
    return "After quote approval, upload payment proof and reference number on Payment page.";
  }
  if (/delivery|download|release|ready/.test(input)) {
    return "Delivery updates are shown in dashboard status and project pipeline.";
  }
  return "I can help with packages, reservations, payments, account flow, and delivery timelines.";
};

export const askAI = async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question) {
    return res.status(400).json({ success: false, message: "Question is required" });
  }
  if (question.length > MAX_AI_INPUT_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Question must be ${MAX_AI_INPUT_LENGTH} characters or less`
    });
  }

  const qaItems = await ChatQA.find().sort({ question: 1 }).lean();
  const faqContext = qaItems
    .slice(0, 40)
    .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
    .join("\n\n");
  const appContext = [
    "Business: SnapQueue / BCP photo-video booking system.",
    "Packages: Basic PHP 2,700, Standard PHP 3,500, Premium PHP 4,500, plus custom package.",
    "Reservation flow: submit reservation -> admin review/approve -> payment -> production -> done.",
    "Payment: manual proof upload with reference number; refund request is available in payment records.",
    "Guest users can use AI chat; live admin chat requires sign-in."
  ].join("\n");

  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return res.json({
      success: true,
      answer: fallbackAiReply(question, qaItems),
      provider: "fallback",
      reason: "Gemini API key is not configured"
    });
  }

  const configuredModel = String(process.env.GEMINI_MODEL || "").trim();
  const modelsToTry = configuredModel ? [configuredModel, ...DEFAULT_AI_MODELS.filter((model) => model !== configuredModel)] : DEFAULT_AI_MODELS;
  const systemPrompt = [
    "You are the website assistant for SnapQueue.",
    "Answer briefly and accurately using only provided context.",
    "If unsure, say what the user can do in the website to confirm.",
    "Do not invent policies or prices."
  ].join(" ");

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Website context:\n${appContext}\n\nFAQ context:\n${faqContext}\n\nUser question:\n${question}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 280
    }
  };

  let lastError = null;
  const modelErrors = [];
  for (const model of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    try {
      const payload = await postJson(endpoint, requestBody);
      const answer = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("").trim();
      if (!answer) {
        throw new Error("Empty AI response");
      }
      return res.json({ success: true, answer, provider: "gemini", model });
    } catch (error) {
      lastError = error;
      modelErrors.push({ model, reason: error?.message || "Unknown Gemini error" });
    }
  }

  const diagnosticReason = modelErrors.length
    ? modelErrors.map((item) => `${item.model}: ${item.reason}`).join(" | ")
    : lastError?.message || "Gemini request failed";

  res.json({
    success: true,
    answer: fallbackAiReply(question, qaItems),
    provider: "fallback",
    reason: diagnosticReason
  });
};
