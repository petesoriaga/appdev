import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import GalleryItem from "../models/GalleryItem.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");
const galleryPath = path.join(projectRoot, "gallery.html");

const decodeHtml = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const extractGalleryItems = (html) => {
  const blockRegex =
    /<div[^>]*class="[^"]*photo-card[^"]*"[^>]*data-category="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  const items = [];

  for (const blockMatch of html.matchAll(blockRegex)) {
    const category = String(blockMatch[1] || "").trim().toLowerCase();
    const block = blockMatch[2] || "";
    const imageMatch = block.match(/<img[^>]*src="([^"]+)"/i);
    const titleMatch = block.match(/<p[^>]*>([^<]+)<\/p>/i);

    if (!category || !imageMatch?.[1] || !titleMatch?.[1]) continue;
    if (!["weddings", "birthdays", "events", "portraits", "other"].includes(category)) continue;

    items.push({
      category,
      imageUrl: decodeHtml(imageMatch[1]).trim(),
      title: decodeHtml(titleMatch[1]).trim(),
      isPublished: true
    });
  }

  const unique = new Map();
  items.forEach((item) => {
    const key = `${item.category}::${item.title}::${item.imageUrl}`;
    unique.set(key, item);
  });
  return [...unique.values()];
};

const run = async () => {
  if (!fs.existsSync(galleryPath)) {
    throw new Error(`gallery.html not found at ${galleryPath}`);
  }

  const html = fs.readFileSync(galleryPath, "utf8");
  const items = extractGalleryItems(html);
  if (!items.length) {
    throw new Error("No gallery items were parsed from gallery.html");
  }

  await connectDB();
  let upserted = 0;

  for (const item of items) {
    await GalleryItem.updateOne(
      { title: item.title, category: item.category },
      { $set: item },
      { upsert: true }
    );
    upserted += 1;
  }

  console.log(`Imported ${upserted} gallery item(s) from gallery.html`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
