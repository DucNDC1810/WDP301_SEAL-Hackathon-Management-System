import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import oauthRoute from "./routes/oauthRoute.js";
import contestantRoute from "./routes/contestantRoute.js";
import teamRoute from "./routes/teamRoute.js";
import setupRoute from "./routes/setupRoute.js";
import competitionRoute from "./routes/competitionRoute.js";
import passport from "./config/passport.js";
import { connectDB } from "./config/db.js";

const app = express();
const PORT = process.env.PORT || 5001;

// ─── middlewares ─────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ─── public routes ──────────────────────────────────────────────────────────
app.use("/api/auth", authRoute);
app.use("/api/auth", oauthRoute);
app.use("/api/contestants", contestantRoute);
app.use("/api/setup", setupRoute);

// ─── private routes ─────────────────────────────────────────────────────────
app.use("/api/users", userRoute);
app.use("/api/teams", teamRoute);
app.use("/api/competitions", competitionRoute);

// ─── start server ───────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
