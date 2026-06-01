import {
  sendVerificationEmail,
  verifyEmail,
  getOnboardingStatus,
} from "../services/contestantService.js";

// ─── POST /api/contestants/send-verification ────────────────────────────────

/**
 * Gửi email xác thực cho user hiện tại.
 */
export const sendVerification = async (req, res) => {
  try {
    console.log("[sendVerification] Request received");
    console.log("[sendVerification] User:", req.user?._id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập trước",
      });
    }

    const result = await sendVerificationEmail(req.user._id);
    console.log("[sendVerification] Success:", result);

    res.status(200).json({
      success: true,
      message: `Email xác thực đã được gửi đến ${result.email}`,
      // Chỉ trả verifyUrl trong dev mode
      ...(process.env.NODE_ENV !== "production" && {
        verifyUrl: result.verifyUrl,
      }),
    });
  } catch (error) {
    console.error("[sendVerification] Error:", error.message);
    console.error("[sendVerification] Stack:", error.stack);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── POST /api/contestants/verify-email ─────────────────────────────────────

/**
 * Xác thực email bằng token.
 * Body: { token: "..." }
 */
export const verifyEmailHandler = async (req, res) => {
  try {
    const { token } = req.body;
    const result = await verifyEmail(token);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[verifyEmail]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── GET /api/contestants/onboarding ────────────────────────────────────────

/**
 * Trả về trạng thái onboarding của contestant hiện tại.
 */
export const onboardingStatus = async (req, res) => {
  try {
    const status = await getOnboardingStatus(req.user._id);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("[onboardingStatus]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};
