import mongoose from "mongoose";

const liveChatMessageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "LiveChatThread", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["user", "admin"], required: true },
    senderName: { type: String, default: "" },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

liveChatMessageSchema.index({ threadId: 1, createdAt: 1 });

export default mongoose.model("LiveChatMessage", liveChatMessageSchema);
