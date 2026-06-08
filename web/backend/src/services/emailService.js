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

// ─── sendInvitationEmail ─────────────────────────────────────────────────────

export const sendInvitationEmail = async (to, contestTitle, token) => {
  const link = `${CLIENT_URL}/invitation/accept?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `[SEAL Hackathon] Lời mời tham gia ban giám khảo - ${contestTitle}`,
    html: `
      <p>Xin chào,</p>
      <p>Bạn được mời tham gia làm <strong>mentor / giám khảo</strong> cho cuộc thi
         <strong>${contestTitle}</strong> trên hệ thống SEAL Hackathon.</p>
      <p>Nhấn vào liên kết bên dưới để xác nhận tham gia (có hiệu lực trong <strong>7 ngày</strong>):</p>
      <p><a href="${link}">${link}</a></p>
      <p>Nếu bạn muốn từ chối, hãy bỏ qua email này.</p>
    `,
  });
};

// ─── sendJudgeInvitationEmail ─────────────────────────────────────────────────

export const sendJudgeInvitationEmail = async (to, contestTitle, token) => {
  const link = `${CLIENT_URL}/judge/accept-invite?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `[SEAL Hackathon] Lời mời làm Giám khảo - ${contestTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#1a1a2e">SEAL Hackathon — Lời mời làm Giám khảo</h2>
        <p>Xin chào,</p>
        <p>Bạn được mời tham gia với vai trò <strong>Giám khảo (Judge)</strong> cho cuộc thi
           <strong>${contestTitle}</strong> trên nền tảng SEAL Hackathon.</p>
        <p>Nhấn vào nút bên dưới để xác nhận và kích hoạt tài khoản của bạn
           (liên kết có hiệu lực trong <strong>7 ngày</strong>):</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">
            Xác nhận tham gia
          </a>
        </p>
        <p style="color:#666;font-size:0.85em">Nếu bạn không muốn tham gia, hãy bỏ qua email này.</p>
      </div>
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

// ─── sendFinalistEmail ────────────────────────────────────────────────────────

export const sendFinalistEmail = async (to, fullName, contestTitle) => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `[SEAL Hackathon] Chúc mừng! Đội bạn vào vòng chung kết - ${contestTitle}`,
    html: `
      <p>Chào <strong>${fullName}</strong>,</p>
      <p>Chúc mừng! Đội thi của bạn đã được chọn vào <strong>vòng chung kết</strong> của cuộc thi <strong>${contestTitle}</strong>.</p>
      <p>Hãy tiếp tục cố gắng và chuẩn bị tốt nhất cho vòng tiếp theo!</p>
      <p>Trân trọng,<br/>Ban tổ chức SEAL Hackathon</p>
    `,
  });
};

// ─── sendDeadlineReminderEmail ────────────────────────────────────────────────

export const sendDeadlineReminderEmail = async (to, fullName, contestTitle, hoursLeft) => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `[SEAL Hackathon] Nhắc nhở: Còn ${hoursLeft} giờ để nộp bài - ${contestTitle}`,
    html: `
      <p>Chào <strong>${fullName}</strong>,</p>
      <p>Đây là nhắc nhở rằng còn <strong>${hoursLeft} giờ</strong> để nộp bài cho cuộc thi <strong>${contestTitle}</strong>.</p>
      <p>Vui lòng hoàn thiện và nộp bài trước khi hết hạn!</p>
      <p>Trân trọng,<br/>Ban tổ chức SEAL Hackathon</p>
    `,
  });
};

// ─── sendMissingSubmissionEmail ───────────────────────────────────────────────

export const sendMissingSubmissionEmail = async (to, fullName, contestTitle) => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `[SEAL Hackathon] Cảnh báo: Đội bạn chưa nộp bài - ${contestTitle}`,
    html: `
      <p>Chào <strong>${fullName}</strong>,</p>
      <p>Hệ thống ghi nhận đội thi của bạn <strong>chưa nộp bài</strong> cho cuộc thi <strong>${contestTitle}</strong>.</p>
      <p>Vui lòng nộp bài ngay để tránh bị loại khỏi cuộc thi.</p>
      <p>Trân trọng,<br/>Ban tổ chức SEAL Hackathon</p>
    `,
  });
};

// ─── sendMentorAssignedEmail ──────────────────────────────────────────────────

export const sendMentorAssignedEmail = async (to, fullName, contestTitle, poolName) => {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `[SEAL Hackathon] Bạn được phân công làm giám khảo - ${contestTitle}`,
    html: `
      <p>Chào <strong>${fullName}</strong>,</p>
      <p>Bạn đã được phân công làm <strong>giám khảo</strong> cho bảng <strong>${poolName}</strong> trong cuộc thi <strong>${contestTitle}</strong>.</p>
      <p>Vui lòng đăng nhập vào hệ thống để xem danh sách đội thi được phân công.</p>
      <p>Trân trọng,<br/>Ban tổ chức SEAL Hackathon</p>
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
