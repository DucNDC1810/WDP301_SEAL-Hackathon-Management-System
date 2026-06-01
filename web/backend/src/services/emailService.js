import nodemailer from "nodemailer";

// ─── Configure email transporter ──────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ─── Generate verification code ──────────────────────────────────────────────

/**
 * Generate a random 6-digit verification code
 * @returns {string} verification code
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ─── Send verification email ─────────────────────────────────────────────────

/**
 * Gửi email xác nhận chứa mã xác thực
 * @param {string} email - email người nhận
 * @param {string} fullName - tên người dùng
 * @param {string} verificationCode - mã xác thực 6 chữ số
 */
export const sendVerificationEmail = async (
  email,
  fullName,
  verificationCode,
) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Xác thực Email - Hệ thống Quản lý Cuộc thi",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #333;">Xác thực Email của Bạn</h2>
          <p style="color: #666; font-size: 16px;">Xin chào <strong>${fullName}</strong>,</p>
          <p style="color: #666; font-size: 16px;">
            Cảm ơn bạn đã đăng ký tài khoản. Vui lòng nhập mã xác thực dưới đây để kích hoạt tài khoản của bạn:
          </p>
          
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 0;">
              ${verificationCode}
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Lưu ý:</strong> Mã xác thực này sẽ hết hạn trong 30 phút. Nếu bạn không yêu cầu xác thực, vui lòng bỏ qua email này.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2026 Hệ thống Quản lý Cuộc thi. All rights reserved.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[emailService] Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("[emailService] Error sending email:", error);
    throw new Error("Không thể gửi email xác thực");
  }
};

// ─── Verify email connection ────────────────────────────────────────────────

/**
 * Kiểm tra kết nối email
 */
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("[emailService] Email service is ready");
    return true;
  } catch (error) {
    console.error("[emailService] Email service error:", error);
    return false;
  }
};
