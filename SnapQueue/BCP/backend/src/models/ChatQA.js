import mongoose from "mongoose";

const chatQASchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, lowercase: true, unique: true },
    answer: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("ChatQA", chatQASchema);
