import mongoose from "mongoose";

const liveChatThreadSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientName: { type: String, default: "Client" },
    clientEmail: { type: String, default: "" },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

liveChatThreadSchema.index({ clientId: 1, status: 1 });
liveChatThreadSchema.index({ lastMessageAt: -1 });

export default mongoose.model("LiveChatThread", liveChatThreadSchema);
