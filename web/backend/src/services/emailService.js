import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || "SEAL Hackathon <no-reply@sealhackathon.com>";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ─── sendVerificationEmail ───────────────────────────────────────────────────

export const sendVerificationEmail = async (to, token) => {
  const link = `${CLIENT_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "[SEAL Hackathon] Xác nhận địa chỉ email của bạn",
    html: `
      <p>Xin chào,</p>
      <p>Vui lòng nhấn vào liên kết bên dưới để xác nhận địa chỉ email của bạn:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Liên kết có hiệu lực trong <strong>24 giờ</strong>.</p>
      <p>Nếu bạn không thực hiện đăng ký, hãy bỏ qua email này.</p>
    `,
  });
};

// ─── sendMemberInviteEmail ───────────────────────────────────────────────────

export const sendMemberInviteEmail = async (to, full_name, token) => {
  const link = `${CLIENT_URL}/team-verify?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "[SEAL Hackathon] Xác nhận tham gia đội thi",
    html: `
      <p>Chào <strong>${full_name || to}</strong>,</p>
      <p>Bạn đã được mời tham gia một đội thi trên hệ thống SEAL Hackathon.</p>
      <p>Nhấn vào liên kết bên dưới để xác nhận tham gia (có hiệu lực trong <strong>24 giờ</strong>):</p>
      <p><a href="${link}">${link}</a></p>
      <p>Nếu bạn không biết về lời mời này, hãy bỏ qua email này.</p>
    `,
  });
};

// ─── sendPasswordResetEmail ──────────────────────────────────────────────────

export const sendPasswordResetEmail = async (to, token) => {
  const link = `${CLIENT_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "[SEAL Hackathon] Đặt lại mật khẩu",
    html: `
      <p>Xin chào,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Liên kết có hiệu lực trong <strong>1 giờ</strong>.</p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `,
  });
};
