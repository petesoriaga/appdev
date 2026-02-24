import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  mongoose.set("bufferCommands", false);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000
  });
  console.log("MongoDB connected");
};
