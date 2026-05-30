import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import { connectDB } from "./config/db.js";


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// ─── middlewares ─────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ─── public routes ──────────────────────────────────────────────────────────
app.use("/api/auth", authRoute);

// ─── private routes ─────────────────────────────────────────────────────────
app.use("/api/users", userRoute);

// ─── start server ───────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
