import nodemailer from "nodemailer";

const getClientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";
const getFrom = () => process.env.EMAIL_FROM || (process.env.EMAIL_USER ? `"SEAL Hackathon" <${process.env.EMAIL_USER}>` : "SEAL Hackathon <onboarding@resend.dev>");
// Sender đã verify trên Brevo — chỉ email này mới được Brevo chấp nhận gửi thật
// (EMAIL_USER dùng cho SMTP không nhất thiết đã verify trên Brevo, nên không dùng làm fallback ở đây).
const BREVO_VERIFIED_SENDER = "damchanduc1810@gmail.com";

// Helper send function supporting HTTPS REST API (Resend / Brevo) and SMTP fallback
const dispatchEmail = async (mailOptions) => {
  const { to, subject, html } = mailOptions;
  console.log(`[emailService] Attempting to send email to "${to}" | Subject: "${subject}"`);

  // 1. Dùng Brevo HTTPS REST API nếu khai báo BREVO_API_KEY (Gửi được cho tất cả người nhận, không bị hạn chế Domain)
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "SEAL Hackathon", email: process.env.BREVO_SENDER_EMAIL || BREVO_VERIFIED_SENDER },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      const data = await res.json();
      // Lưu ý: Brevo có thể trả HTTP 200/201 (request được nhận) nhưng vẫn từ chối
      // gửi thật nếu sender chưa verify — phải kiểm tra rõ có messageId hay không.
      if (res.ok && data.messageId) {
        console.log(`[emailService] Successfully sent via Brevo API to "${to}" | ID: ${data.messageId}`);
        return data;
      }
      console.warn(`[emailService] Brevo API warning: ${JSON.stringify(data)}, falling back to Resend/SMTP...`);
    } catch (err) {
      console.warn(`[emailService] Brevo API error: ${err.message}, falling back to Resend/SMTP...`);
    }
  }

  // 2. Dùng Resend HTTPS REST API nếu khai báo RESEND_API_KEY (Fallback 2)
  if (process.env.RESEND_API_KEY) {
    try {
      const resendFrom = process.env.RESEND_FROM || "SEAL Hackathon <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [to],
          subject,
          html,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[emailService] Successfully sent via Resend API to "${to}" | ID: ${data.id}`);
        return data;
      }
      console.warn(`[emailService] Resend API warning: ${data.message || JSON.stringify(data)}, falling back to SMTP...`);
    } catch (err) {
      console.warn(`[emailService] Resend API error: ${err.message}, falling back to SMTP...`);
    }
  }

  // 3. Fallback dùng Nodemailer SMTP (Localhost hoặc server mở port)
  const port = Number(process.env.EMAIL_PORT) || 465;
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: port,
    secure: secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
  });

  const options = {
    from: getFrom(),
    ...mailOptions,
  };
  const info = await transporter.sendMail(options);
  console.log(`[emailService] Successfully sent email via SMTP to "${options.to}" | MessageId: ${info.messageId}`);
  return info;
};

// ─── sendVerificationEmail ───────────────────────────────────────────────────

export const sendVerificationEmail = async (to, token) => {
  const link = `${getClientUrl()}/verify-email?token=${token}`;
  return dispatchEmail({
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
  const link = `${getClientUrl()}/invitation/accept?token=${token}`;
  return dispatchEmail({
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
  const link = `${getClientUrl()}/judge/accept-invite?token=${token}`;
  return dispatchEmail({
    to,
    subject: `[SEAL Hackathon] Lời mời làm Giám khảo - ${contestTitle}`,
    html: `
      <div style="background-color:#f6f9fc;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
        <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid #e2e8f0">
          <!-- Header Gradient -->
          <div style="background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);padding:35px 30px;text-align:center">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px">SEAL Hackathon</h1>
            <p style="color:rgba(255,255,255,0.85);margin:5px 0 0 0;font-size:14px">Thư mời tham gia Ban Giám Khảo</p>
          </div>
          
          <!-- Body Content -->
          <div style="padding:40px 30px;color:#334155;line-height:1.6">
            <p style="margin-top:0;font-size:16px;font-weight:600;color:#1e293b">Xin chào,</p>
            <p style="font-size:15px;margin:0 0 16px 0">Bạn nhận được thư mời tham gia với tư cách là <strong>Giám khảo ngoài (External Judge)</strong> cho cuộc thi trên nền tảng của chúng tôi.</p>
            
            <!-- Details Card -->
            <div style="background-color:#f8fafc;border-left:4px solid #4f46e5;padding:16px 20px;margin:24px 0;border-radius:0 8px 8px 0">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="width:110px;font-size:14px;color:#64748b;padding:4px 0"><strong>Cuộc thi:</strong></td>
                  <td style="font-size:14px;color:#1e293b;padding:4px 0;font-weight:600">${contestTitle}</td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#64748b;padding:4px 0"><strong>Vai trò:</strong></td>
                  <td style="font-size:14px;color:#1e293b;padding:4px 0"><span style="background-color:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">Giám khảo (Judge)</span></td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#64748b;padding:4px 0"><strong>Hạn kích hoạt:</strong></td>
                  <td style="font-size:14px;color:#ef4444;padding:4px 0;font-weight:600">7 ngày (kể từ hôm nay)</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size:15px;margin:0 0 30px 0">Để kích hoạt tài khoản giám khảo của bạn và xác nhận tham gia chấm điểm, vui lòng nhấn vào nút bên dưới (hệ thống sẽ tự động tạo tài khoản cho bạn):</p>
            
            <!-- CTA Button -->
            <div style="text-align:center;margin:35px 0">
              <a href="${link}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:14px 35px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 4px 6px rgba(79,70,229,0.2)">
                Xác Nhận & Kích Hoạt
              </a>
            </div>
            
            <p style="font-size:13px;color:#64748b;margin:0">Nếu bạn không yêu cầu thư mời này hoặc không muốn tham gia, bạn có thể yên tâm bỏ qua email này.</p>
          </div>
          
          <!-- Footer -->
          <div style="background-color:#f8fafc;padding:20px 30px;text-align:center;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} SEAL Hackathon. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  });
};

// ─── sendMemberInviteEmail ───────────────────────────────────────────────────

export const sendMemberInviteEmail = async (to, full_name, token) => {
  const link = `${getClientUrl()}/team-verify?token=${token}`;
  return dispatchEmail({
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

// ─── sendTeamInvitationEmail — new invitation flow (accept/reject in dashboard) ─

export const sendTeamInvitationEmail = async (to, full_name, teamName) => {
  const link = `${getClientUrl()}/dashboard/team`;
  return dispatchEmail({
    to,
    subject: `[SEAL Hackathon] Bạn được mời vào đội "${teamName}"`,
    html: `
      <p>Chào <strong>${full_name || to}</strong>,</p>
      <p>Bạn vừa nhận được lời mời tham gia đội <strong>${teamName}</strong> trên SEAL Hackathon.</p>
      <p>Đăng nhập vào hệ thống và vào mục <strong>Lời mời</strong> để chấp nhận hoặc từ chối (có hiệu lực trong <strong>7 ngày</strong>):</p>
      <p><a href="${link}">${link}</a></p>
      <p>Nếu bạn không muốn tham gia, bạn có thể từ chối trong hệ thống.</p>
    `,
  });
};

// ─── sendFinalistEmail ────────────────────────────────────────────────────────

export const sendFinalistEmail = async (to, fullName, contestTitle) => {
  return dispatchEmail({
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
  return dispatchEmail({
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
  return dispatchEmail({
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

export const sendMentorAssignedEmail = async (to, fullName, contestTitle, teamName) => {
  return dispatchEmail({
    to,
    subject: `[SEAL Hackathon] Bạn được phân công làm Mentor - ${contestTitle}`,
    html: `
      <p>Chào <strong>${fullName}</strong>,</p>
      <p>Bạn đã được phân công làm <strong>Mentor</strong> hỗ trợ cho đội <strong>${teamName}</strong> trong cuộc thi <strong>${contestTitle}</strong>.</p>
      <p>Vui lòng đăng nhập vào hệ thống để xem thông tin đội thi và bắt đầu hỗ trợ.</p>
      <p>Trân trọng,<br/>Ban tổ chức SEAL Hackathon</p>
    `,
  });
};

// ─── sendJudgeAssignedEmail ───────────────────────────────────────────────────

export const sendJudgeAssignedEmail = async (to, fullName, contestTitle, poolName) => {
  return dispatchEmail({
    to,
    subject: `[SEAL Hackathon] Bạn được phân công làm Giám khảo - ${contestTitle}`,
    html: `
      <p>Chào <strong>${fullName}</strong>,</p>
      <p>Bạn đã được phân công làm <strong>Giám khảo</strong> cho bảng <strong>${poolName}</strong> trong cuộc thi <strong>${contestTitle}</strong>.</p>
      <p>Vui lòng đăng nhập vào hệ thống để xem danh sách đội thi được phân công chấm điểm.</p>
      <p>Trân trọng,<br/>Ban tổ chức SEAL Hackathon</p>
    `,
  });
};

// ─── sendScheduleChangeEmail ──────────────────────────────────────────────────
// Gửi khi Admin kích hoạt vòng thi lệch lịch dự kiến (dời lịch/sự cố).

export const sendScheduleChangeEmail = async (to, contestTitle, roundName, scheduledStartTime, reason) => {
  const scheduledText = scheduledStartTime
    ? new Date(scheduledStartTime).toLocaleString("vi-VN")
    : "chưa xác định";
  return dispatchEmail({
    to,
    subject: `[SEAL Hackathon] Thay đổi lịch trình vòng "${roundName}" - ${contestTitle}`,
    html: `
      <p>Xin chào,</p>
      <p>Ban tổ chức thông báo <strong>vòng "${roundName}"</strong> của cuộc thi <strong>${contestTitle}</strong> đã được kích hoạt lệch với lịch dự kiến (${scheduledText}).</p>
      <p><strong>Lý do:</strong> ${reason}</p>
      <p>Vui lòng đăng nhập hệ thống để cập nhật thông tin mới nhất.</p>
      <p>Trân trọng,<br/>Ban tổ chức SEAL Hackathon</p>
    `,
  });
};

// ─── sendPasswordResetEmail ──────────────────────────────────────────────────

export const sendPasswordResetEmail = async (to, token) => {
  const link = `${getClientUrl()}/reset-password?token=${token}`;
  return dispatchEmail({
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

// ─── sendCustomEmail ──────────────────────────────────────────────────────────
// Dùng cho AI Email Generator: subject/html do admin duyệt từ nội dung AI soạn.

export const sendCustomEmail = async (to, subject, html) => {
  return dispatchEmail({ to, subject, html });
};
