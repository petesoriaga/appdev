import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import ChatQA from "../models/ChatQA.js";
import GalleryItem from "../models/GalleryItem.js";

dotenv.config();

const run = async () => {
  await connectDB();

  const adminEmail = "admin@bcp.local";
  const adminExists = await User.findOne({ email: adminEmail });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash("Admin123!", 10);
    await User.create({
      fullName: "BCP Admin",
      email: adminEmail,
      phone: "0000000000",
      passwordHash,
      role: "admin"
    });
  }

  const qaSeed = [
    { question: "wedding", answer: "Our wedding packages range from $1500 to $3000." },
    { question: "price", answer: "Standard portrait sessions start at $500." },
    { question: "location", answer: "We are based in Nueva Ecija, Philippines and available for travel." },
    { question: "hello", answer: "Hi. BCP Robot is ready to help." }
  ];

  for (const item of qaSeed) {
    await ChatQA.updateOne({ question: item.question }, { $set: item }, { upsert: true });
  }

  const gallerySeed = [
    { title: "Elegant Union", category: "weddings", imageUrl: "PAGENT.jpg", isPublished: true },
    { title: "Joyful Moments", category: "birthdays", imageUrl: "PAGENT.jpg", isPublished: true },
    { title: "Grand Gala", category: "events", imageUrl: "PAGENT.jpg", isPublished: true },
    { title: "Studio Portrait", category: "portraits", imageUrl: "PAGENT.jpg", isPublished: true }
  ];

  for (const item of gallerySeed) {
    await GalleryItem.updateOne(
      { title: item.title, category: item.category },
      { $set: item },
      { upsert: true }
    );
  }

  console.log("Seed complete");
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
