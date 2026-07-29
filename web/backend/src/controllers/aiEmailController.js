import { generateEmailDraft, sendGeneratedEmail } from "../services/aiEmailService.js";
import { log, getAuditLogs } from "../services/auditLogService.js";

/**
 * POST /api/ai/email/generate
 * body: { contest_id, template, scope, pool_id?, team_id?, custom_notes? }
 */
export const handleGenerateEmail = async (req, res) => {
  try {
    const { contest_id, template, scope, pool_id, team_id, custom_notes } = req.body;
    if (!contest_id || !template) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn cuộc thi và mẫu email" });
    }
    const draft = await generateEmailDraft({ contest_id, template, scope, pool_id, team_id, custom_notes });
    res.status(200).json({ success: true, data: draft });
  } catch (error) {
    console.error("[handleGenerateEmail]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

/**
 * POST /api/ai/email/send
 * body: { subject, body_html, recipients: [{team_name, leader_name, leader_email}], template_label?, contest_title? }
 */
export const handleSendEmail = async (req, res) => {
  try {
    const { subject, body_html, recipients, template_label, contest_title } = req.body;
    if (!subject || !body_html || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: "Thiếu nội dung hoặc danh sách người nhận" });
    }

    const result = await sendGeneratedEmail({ subject, body_html, recipients });

    log({
      action: "NOTIFICATION:EMAIL_SEND",
      resource: "NOTIFICATION",
      actor: req.user,
      after: {
        subject,
        template_label: template_label || null,
        contest_title: contest_title || null,
        recipients_count: recipients.length,
        sent: result.sent,
        failed_count: result.failed.length,
      },
      status: result.failed.length === 0 ? "success" : "failure",
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("[handleSendEmail]", error);
    res.status(500).json({ success: false, message: error.message || "Lỗi máy chủ khi gửi email" });
  }
};

/**
 * GET /api/ai/email/history
 */
export const handleEmailHistory = async (req, res) => {
  try {
    const { logs } = await getAuditLogs({ resource: "NOTIFICATION", action: "EMAIL_SEND", limit: 10 });
    res.status(200).json({
      success: true,
      data: logs.map((l) => ({
        id: l._id,
        type: l.after?.template_label || "Email",
        recipients: l.after?.recipients_count || 0,
        timestamp: l.created_at,
        status: l.status === "success" ? "delivered" : "failed",
      })),
    });
  } catch (error) {
    console.error("[handleEmailHistory]", error);
    res.status(500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};
