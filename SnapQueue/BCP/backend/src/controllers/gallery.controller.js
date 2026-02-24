import GalleryItem from "../models/GalleryItem.js";

export const listGalleryItems = async (req, res) => {
  const { category } = req.query;
  const filter = { isPublished: true };
  if (category && category !== "all") {
    filter.category = category;
  }

  const items = await GalleryItem.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, items });
};

export const createGalleryItem = async (req, res) => {
  const { title, category, imageUrl, isPublished } = req.body;
  const item = await GalleryItem.create({ title, category, imageUrl, isPublished });
  res.status(201).json({ success: true, item });
};

export const updateGalleryItem = async (req, res) => {
  const item = await GalleryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) {
    return res.status(404).json({ success: false, message: "Gallery item not found" });
  }

  res.json({ success: true, item });
};

export const deleteGalleryItem = async (req, res) => {
  const item = await GalleryItem.findByIdAndDelete(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Gallery item not found" });
  }

  res.json({ success: true, message: "Gallery item deleted" });
};
