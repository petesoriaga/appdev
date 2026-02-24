import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

const email = (process.env.ADMIN_EMAIL || "admin@bcp.local").toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD || "Admin123!";
const fullName = process.env.ADMIN_NAME || "BCP Admin";
const phone = process.env.ADMIN_PHONE || "0000000000";

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ email });
  const passwordHash = await bcrypt.hash(password, 10);

  if (!existing) {
    const created = await User.create({
      fullName,
      email,
      phone,
      passwordHash,
      role: "admin"
    });
    console.log(`Admin created: ${created.email}`);
    process.exit(0);
  }

  existing.fullName = fullName;
  existing.phone = phone;
  existing.passwordHash = passwordHash;
  existing.role = "admin";
  await existing.save();
  console.log(`Admin updated: ${existing.email}`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
