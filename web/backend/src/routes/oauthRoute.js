import { Router } from "express";
import jwt from "jsonwebtoken";
import passport from "../config/passport.js";

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

const handleOAuthCallback = (req, res) => {
  const { isNewUser, ...userDoc } = req.user;
  const accessToken = generateAccessToken(userDoc._id);
  const refreshToken = generateRefreshToken(userDoc._id);
  res.cookie("refreshToken", refreshToken, COOKIE_OPTS);

  // Lần đầu đăng nhập → bắt buộc hoàn chỉnh profile trước
  if (isNewUser) {
    return res.redirect(`${CLIENT_URL}/complete-profile?token=${accessToken}`);
  }
  res.redirect(`${CLIENT_URL}/oauth-callback?token=${accessToken}`);
};

// ─── Google ──────────────────────────────────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", { session: false, scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${CLIENT_URL}/login?error=google_failed`,
  }),
  handleOAuthCallback
);

// ─── GitHub ──────────────────────────────────────────────────────────────────
router.get(
  "/github",
  passport.authenticate("github", { session: false, scope: ["user:email"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${CLIENT_URL}/login?error=github_failed`,
  }),
  handleOAuthCallback
);

export default router;
