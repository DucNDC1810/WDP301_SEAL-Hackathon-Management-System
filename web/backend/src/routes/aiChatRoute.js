import express from "express";
import { handleAdminChat, handleDashboardStats } from "../controllers/aiChatController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/ai/chat — chatbox AI hỗ trợ admin thống kê & điều hành cuộc thi
router.post("/chat", authenticate, authorize("admin"), handleAdminChat);

// GET /api/ai/dashboard-stats — số liệu thật cho status cards ở trang AI Assistant
router.get("/dashboard-stats", authenticate, authorize("admin"), handleDashboardStats);

export default router;
