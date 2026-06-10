import { Router } from "express";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import * as chatController from "../controllers/chatController.js";

const router = Router();

// Lấy danh sách cuộc trò chuyện của mentor hiện tại
router.get(
  "/conversations",
  authenticate,
  authorize("mentor"),
  chatController.getConversations
);

// Lấy danh sách mentor được phân công cho team của contestant (theo team_id)
router.get(
  "/team/:teamId/mentors",
  authenticate,
  authorize("contestant", "admin"),
  chatController.getTeamMentors
);

// Lấy tin nhắn trong một cuộc trò chuyện cụ thể
router.get(
  "/:contestId/:roundId/:teamId/:mentorId/messages",
  authenticate,
  authorize("mentor", "contestant", "admin"),
  chatController.getMessages
);

// Gửi tin nhắn
router.post(
  "/:contestId/:roundId/:teamId/:mentorId/messages",
  authenticate,
  authorize("mentor", "contestant", "admin"),
  chatController.sendMessage
);

// Kiểm tra trạng thái chat (open/closed)
router.get(
  "/:contestId/:roundId/status",
  authenticate,
  chatController.checkChatStatus
);

export default router;
