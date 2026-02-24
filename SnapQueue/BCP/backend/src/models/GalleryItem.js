import mongoose from "mongoose";

const galleryItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["weddings", "birthdays", "events", "portraits", "other"],
      required: true
    },
    imageUrl: { type: String, required: true },
    isPublished: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("GalleryItem", galleryItemSchema);
