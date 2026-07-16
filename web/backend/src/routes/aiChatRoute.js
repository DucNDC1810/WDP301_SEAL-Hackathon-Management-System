import express from "express";
import { handleAdminChat } from "../controllers/aiChatController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/ai/chat — chatbox AI hỗ trợ admin thống kê & điều hành cuộc thi
router.post("/chat", authenticate, authorize("admin"), handleAdminChat);

export default router;
