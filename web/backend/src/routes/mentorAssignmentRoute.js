import express from "express";
import {
  handleAssignMentor,
  handleGetAssignments,
  handleGetMyAssignments,
  handleRemoveAssignment,
  handleAcceptAssignment,
  handleDeclineAssignment,
  handlePreviewAssignmentByToken,
  handleAcceptAssignmentByToken,
  handleDeclineAssignmentByToken,
} from "../controllers/mentorAssignmentController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ─── Public: xác nhận/từ chối qua token trong email (không cần đăng nhập) ────────
// Đặt trước "/me" và "/:id" để không bị các route có param nuốt nhầm.
router.get("/token/preview", handlePreviewAssignmentByToken);
router.post("/token/accept", handleAcceptAssignmentByToken);
router.post("/token/decline", handleDeclineAssignmentByToken);

// /me phải đặt trước /:id để không bị hiểu nhầm là param
router.get("/me", authenticate, authorize("mentor", "admin"), handleGetMyAssignments);

router.post(
  "/contests/:contestId/rounds/:roundId",
  authenticate, authorize("admin"),
  handleAssignMentor
);
router.get(
  "/contests/:contestId/rounds/:roundId",
  authenticate, authorize("admin", "mentor"),
  handleGetAssignments
);
router.patch("/:id/accept", authenticate, authorize("mentor"), handleAcceptAssignment);
router.patch("/:id/decline", authenticate, authorize("mentor"), handleDeclineAssignment);
router.delete("/:id", authenticate, authorize("admin"), handleRemoveAssignment);

export default router;
