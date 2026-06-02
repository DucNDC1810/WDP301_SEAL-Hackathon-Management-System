import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
      dbName: process.env.DB_DATABASE,
    });
    console.log("Liên kết CSDL thành công !!!!");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error(">>>>>>Error nè:", error);
  }
};
