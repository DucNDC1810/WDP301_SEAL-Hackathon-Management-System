import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import oauthRoute from "./routes/oauthRoute.js";
import contestRoute from "./routes/contestRoute.js";
import topicRoute from "./routes/topicRoute.js";
import teamRoute from "./routes/teamRoute.js";
import poolRoute from "./routes/poolRoute.js";
import mentorAssignmentRoute from "./routes/mentorAssignmentRoute.js";
import scoreRoute from "./routes/scoreRoute.js";
import rankingRoute from "./routes/rankingRoute.js";
import appealRoute from "./routes/appealRoute.js";
import invitationRoute from "./routes/invitationRoute.js";
import passport from "./config/passport.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/index.js";
import { autoCloseContests } from "./jobs/autoCloseContests.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Public
app.use("/api/auth", authRoute);
app.use("/api/auth", oauthRoute);

// Private
app.use("/api/users", userRoute);
app.use("/api/contests", contestRoute);
app.use("/api/topics", topicRoute);
app.use("/api/teams", teamRoute);
app.use("/api/pools", poolRoute);
app.use("/api/mentor-assignments", mentorAssignmentRoute);
app.use("/api/scores", scoreRoute);
app.use("/api/rankings", rankingRoute);
app.use("/api/appeals", appealRoute);
app.use("/api/invitations", invitationRoute);

initSocket(httpServer);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Chạy auto close ngay khi khởi động
  autoCloseContests();

  // Chạy mỗi 5 phút
  setInterval(autoCloseContests, 5 * 60 * 1000);
});
