import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createBulkNotifications,
} from "../services/notificationService.js";

// ─── handleGetMyNotifications ─────────────────────────────────────────────────

/**
 * GET /api/notifications
 * Lấy danh sách notification của user hiện tại.
 * Query: ?is_read=false&page=1&limit=20
 */
export const handleGetMyNotifications = async (req, res) => {
  try {
    const { is_read, page, limit } = req.query;
    const result = await getMyNotifications(req.user._id, { is_read, page, limit });
    res.status(200).json({
      success: true,
      unread_count: result.unread_count,
      total: result.total,
      page: result.page,
      limit: result.limit,
      data: result.notifications,
    });
  } catch (error) {
    console.error("[handleGetMyNotifications]", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// ─── handleMarkAsRead ─────────────────────────────────────────────────────────

/**
 * PATCH /api/notifications/:id/read
 */
export const handleMarkAsRead = async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("[handleMarkAsRead]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleMarkAllAsRead ──────────────────────────────────────────────────────

/**
 * PATCH /api/notifications/read-all
 */
export const handleMarkAllAsRead = async (req, res) => {
  try {
    const result = await markAllAsRead(req.user._id);
    res.status(200).json({ success: true, message: `Đã đánh dấu ${result.updated} thông báo là đã đọc` });
  } catch (error) {
    console.error("[handleMarkAllAsRead]", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// ─── handleDeleteNotification ─────────────────────────────────────────────────

/**
 * DELETE /api/notifications/:id
 */
export const handleDeleteNotification = async (req, res) => {
  try {
    await deleteNotification(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: "Đã xóa thông báo" });
  } catch (error) {
    console.error("[handleDeleteNotification]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── handleSendBulk (admin) ───────────────────────────────────────────────────

/**
 * POST /api/notifications/broadcast
 * Admin gửi thông báo thủ công đến nhiều user.
 * Body: { user_ids, type, title, message, ref_id?, ref_type? }
 */
export const handleSendBulk = async (req, res) => {
  try {
    const { user_ids, type, title, message, ref_id, ref_type } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp user_ids, type, title, message",
      });
    }

    const notifications = await createBulkNotifications({
      user_ids,
      type,
      title,
      message,
      ref_id,
      ref_type,
    });

    res.status(201).json({
      success: true,
      message: `Đã gửi thông báo đến ${notifications.length} người dùng`,
      count: notifications.length,
    });
  } catch (error) {
    console.error("[handleSendBulk]", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
