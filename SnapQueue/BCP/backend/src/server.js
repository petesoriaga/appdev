import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

dotenv.config({ path: envPath, override: true });

const [{ default: app }, { connectDB }] = await Promise.all([
  import("./app.js"),
  import("./config/db.js")
]);

const PORT = process.env.PORT || 5000;
const geminiKey = String(process.env.GEMINI_API_KEY || "");
const geminiTail = geminiKey.length >= 6 ? geminiKey.slice(-6) : geminiKey;
console.log(`[env] GEMINI_API_KEY loaded (length=${geminiKey.length}, last6=${geminiTail || "n/a"}) from ${envPath}`);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

start();
