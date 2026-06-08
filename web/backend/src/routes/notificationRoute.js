import express from "express";
import {
  handleGetMyNotifications,
  handleMarkAsRead,
  handleMarkAllAsRead,
  handleDeleteNotification,
  handleSendBulk,
} from "../controllers/notificationController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Tất cả routes đều yêu cầu đăng nhập
router.use(authenticate);

// GET    /api/notifications              — danh sách thông báo của tôi
router.get("/", handleGetMyNotifications);

// PATCH  /api/notifications/read-all    — đánh dấu tất cả đã đọc
router.patch("/read-all", handleMarkAllAsRead);

// PATCH  /api/notifications/:id/read    — đánh dấu 1 thông báo đã đọc
router.patch("/:id/read", handleMarkAsRead);

// DELETE /api/notifications/:id         — xóa 1 thông báo
router.delete("/:id", handleDeleteNotification);

// POST   /api/notifications/broadcast   — admin gửi thông báo hàng loạt
router.post("/broadcast", authorize("admin"), handleSendBulk);

export default router;
