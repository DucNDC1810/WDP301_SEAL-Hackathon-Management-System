import {
  createUser,
  authenticateUser,
  refreshAccessToken,
} from "../services/authService.js";

// ─── cookie config ──────────────────────────────────────────────────────────

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
};

// ─── signUp ─────────────────────────────────────────────────────────────────

export const signUp = async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    // validate required fields
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin (full_name, email, password)",
      });
    }

    // validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    // validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    // delegate to service
    const user = await createUser({ full_name, email, password, phone });

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: user,
    });
  } catch (error) {
    console.error("[signUp]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── signIn ─────────────────────────────────────────────────────────────────

export const signIn = async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const loginIdentifier = email || identifier;

    // validate input
    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email/username và mật khẩu",
      });
    }

    // delegate to service
    const { user, accessToken, refreshToken } = await authenticateUser({
      identifier: loginIdentifier,
      password,
    });

    // set httpOnly cookie
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: { ...user, accessToken },
    });
  } catch (error) {
    console.error("[signIn]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── signOut ────────────────────────────────────────────────────────────────

export const signOut = async (req, res) => {
  try {
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    console.error("[signOut]", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// ─── me ─────────────────────────────────────────────────────────────────────

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
};

// ─── refresh ────────────────────────────────────────────────────────────────

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    // delegate to service
    const accessToken = await refreshAccessToken(token);

    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    console.error("[refresh]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};
