import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { getIO } from "../socket/index.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

const pushToSocket = (userId, notification) => {
  try {
    getIO().to(`user:${userId}`).emit("notification", notification);
  } catch {
    // socket chưa init (test env) — bỏ qua
  }
};

// ─── createNotification ───────────────────────────────────────────────────────

/**
 * Tạo 1 notification cho 1 user và push real-time qua socket.
 */
export const createNotification = async ({
  user_id,
  type,
  title,
  message,
  ref_id = null,
  ref_type = null,
}) => {
  const notification = await Notification.create({
    user_id,
    type,
    title,
    message,
    ref_id,
    ref_type,
  });

  pushToSocket(user_id.toString(), notification);
  return notification;
};

// ─── createBulkNotifications ──────────────────────────────────────────────────

/**
 * Tạo notification cho nhiều user cùng lúc (broadcast).
 * @param {string[]} userIds
 */
export const createBulkNotifications = async ({
  user_ids,
  type,
  title,
  message,
  ref_id = null,
  ref_type = null,
}) => {
  if (!user_ids || user_ids.length === 0) return [];

  const docs = user_ids.map((user_id) => ({
    user_id,
    type,
    title,
    message,
    ref_id,
    ref_type,
    is_read: false,
  }));

  const notifications = await Notification.insertMany(docs);

  // Push real-time cho từng user
  notifications.forEach((n) => pushToSocket(n.user_id.toString(), n));

  return notifications;
};

// ─── Notification helpers theo từng loại ─────────────────────────────────────

/**
 * Thông báo đội vào vòng chung kết.
 */
export const notifyFinalist = async ({ user_ids, contestTitle, ref_id }) => {
  return createBulkNotifications({
    user_ids,
    type: "finalist_announcement",
    title: "Chúc mừng! Đội bạn vào vòng chung kết",
    message: `Đội thi của bạn đã được chọn vào vòng chung kết cuộc thi "${contestTitle}". Hãy chuẩn bị tốt nhất!`,
    ref_id,
    ref_type: "Contest",
  });
};

/**
 * Reminder deadline nộp bài.
 */
export const notifyDeadlineReminder = async ({ user_ids, contestTitle, hoursLeft, ref_id }) => {
  return createBulkNotifications({
    user_ids,
    type: "deadline_reminder",
    title: "Nhắc nhở: Sắp đến deadline nộp bài",
    message: `Còn ${hoursLeft} giờ để nộp bài cho cuộc thi "${contestTitle}". Đừng quên nộp đúng hạn!`,
    ref_id,
    ref_type: "Contest",
  });
};

/**
 * Thông báo đội chưa nộp bài.
 */
export const notifyMissingSubmission = async ({ user_ids, contestTitle, ref_id }) => {
  return createBulkNotifications({
    user_ids,
    type: "missing_submission",
    title: "Cảnh báo: Chưa nộp bài",
    message: `Đội thi của bạn chưa nộp bài cho cuộc thi "${contestTitle}". Vui lòng nộp bài trước khi hết hạn.`,
    ref_id,
    ref_type: "Contest",
  });
};

/**
 * Thông báo được phân công mentor.
 */
export const notifyMentorAssigned = async ({ user_id, contestTitle, poolName, ref_id }) => {
  return createNotification({
    user_id,
    type: "mentor_assigned",
    title: "Bạn được phân công làm giám khảo",
    message: `Bạn được phân công chấm điểm cho bảng "${poolName}" trong cuộc thi "${contestTitle}".`,
    ref_id,
    ref_type: "Contest",
  });
};

/**
 * Thông báo thành viên đã xác nhận email tham gia đội.
 */
export const notifyTeamMemberVerified = async ({ user_id, memberName, teamName, ref_id }) => {
  return createNotification({
    user_id,
    type: "team_member_verified",
    title: "Thành viên đã xác nhận tham gia",
    message: `${memberName} đã xác nhận tham gia đội "${teamName}".`,
    ref_id,
    ref_type: "Team",
  });
};

// ─── getMyNotifications ───────────────────────────────────────────────────────

/**
 * Lấy danh sách notification của user, hỗ trợ filter và phân trang.
 */
export const getMyNotifications = async (userId, { is_read, page = 1, limit = 20 } = {}) => {
  const query = { user_id: userId };
  if (is_read !== undefined) query.is_read = is_read === "true" || is_read === true;

  const skip = (Math.max(1, page) - 1) * Number(limit);

  const [notifications, total, unread_count] = await Promise.all([
    Notification.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Notification.countDocuments(query),
    Notification.countDocuments({ user_id: userId, is_read: false }),
  ]);

  return { notifications, total, unread_count, page: Number(page), limit: Number(limit) };
};

// ─── markAsRead ───────────────────────────────────────────────────────────────

/**
 * Đánh dấu 1 notification là đã đọc.
 */
export const markAsRead = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    const err = new Error("Notification ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user_id: userId },
    { is_read: true, read_at: new Date() },
    { new: true }
  );

  if (!notification) {
    const err = new Error("Không tìm thấy thông báo");
    err.statusCode = 404;
    throw err;
  }

  return notification;
};

// ─── markAllAsRead ────────────────────────────────────────────────────────────

/**
 * Đánh dấu tất cả notification của user là đã đọc.
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { user_id: userId, is_read: false },
    { is_read: true, read_at: new Date() }
  );
  return { updated: result.modifiedCount };
};

// ─── deleteNotification ───────────────────────────────────────────────────────

/**
 * Xóa 1 notification của user.
 */
export const deleteNotification = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    const err = new Error("Notification ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    user_id: userId,
  });

  if (!notification) {
    const err = new Error("Không tìm thấy thông báo");
    err.statusCode = 404;
    throw err;
  }
};
