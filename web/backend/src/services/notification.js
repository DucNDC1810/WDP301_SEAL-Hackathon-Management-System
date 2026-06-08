import Notification from "../models/Notification.js";
import { getIO } from "../socket/index.js";

/**
 * Pushes a notification to socket.io room.
 *
 * @param {string} userId
 * @param {Object} notification
 */
const pushToSocket = (userId, notification) => {
  try {
    getIO().to(`user:${userId}`).emit("notification", notification);
  } catch {
    // Socket not initialized (e.g. test env) - ignore
  }
};

/**
 * Sends and persists notifications to a list of recipients.
 *
 * @param {Object} params
 * @param {string[]} params.recipientIds - Array of recipient user IDs.
 * @param {string} params.type - The type of notification (e.g. "general", "deadline_reminder").
 * @param {Object} params.payload - The content of the notification.
 * @param {string} params.payload.title - The title of the notification.
 * @param {string} params.payload.message - The message body.
 * @param {string|Object} [params.payload.ref_id] - Reference entity ID.
 * @param {string} [params.payload.ref_type] - Reference entity type.
 * @returns {Promise<Object[]>} The list of created Notification documents.
 */
export async function sendNotification({ recipientIds, type, payload }) {
  if (!recipientIds || recipientIds.length === 0) {
    return [];
  }

  const docs = recipientIds.map((userId) => ({
    user_id: userId,
    type: type || "general",
    title: payload.title,
    message: payload.message,
    ref_id: payload.ref_id || null,
    ref_type: payload.ref_type || null,
    is_read: false,
  }));

  const notifications = await Notification.insertMany(docs);

  // Push via socket for real-time delivery
  notifications.forEach((n) => {
    pushToSocket(n.user_id.toString(), n);
  });

  return notifications;
}
