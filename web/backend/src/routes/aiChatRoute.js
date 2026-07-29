import express from "express";
import { handleAdminChat, handleDashboardStats } from "../controllers/aiChatController.js";
import { handleGenerateEmail, handleSendEmail, handleEmailHistory } from "../controllers/aiEmailController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/ai/chat — chatbox AI hỗ trợ admin thống kê & điều hành cuộc thi
router.post("/chat", authenticate, authorize("admin"), handleAdminChat);

// GET /api/ai/dashboard-stats — số liệu thật cho status cards ở trang AI Assistant
router.get("/dashboard-stats", authenticate, authorize("admin"), handleDashboardStats);

// POST /api/ai/email/generate — AI soạn nháp email theo mẫu + đối tượng nhận thật
router.post("/email/generate", authenticate, authorize("admin"), handleGenerateEmail);

// POST /api/ai/email/send — gửi email đã soạn tới danh sách người nhận thật
router.post("/email/send", authenticate, authorize("admin"), handleSendEmail);

// GET /api/ai/email/history — lịch sử gửi email gần đây (từ Audit Log)
router.get("/email/history", authenticate, authorize("admin"), handleEmailHistory);

export default router;
