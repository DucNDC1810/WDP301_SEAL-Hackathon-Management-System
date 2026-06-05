import express from "express";
import {
  handleCreateTopic,
  handleGetTopicsByContest,
  handleGetTopicById,
  handleUpdateTopic,
  handleDeleteTopic,
  handleAddResource,
  handleRemoveResource,
  handleGetProposalsByContest,
  handleReviewProposal,
} from "../controllers/topicController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/topics/contests/:contestId/topics - Tạo đề tài mới cho cuộc thi (chỉ Admin)
router.post(
  "/contests/:contestId/topics",
  authenticate,
  authorize("admin"),
  handleCreateTopic
);

// GET /api/topics/contests/:contestId/topics - Lấy danh sách đề tài của cuộc thi (đã đăng nhập)
router.get("/contests/:contestId/topics", authenticate, handleGetTopicsByContest);

// GET /api/topics/contests/:contestId/proposals - Admin xem đề xuất đang chờ duyệt
router.get(
  "/contests/:contestId/proposals",
  authenticate,
  authorize("admin"),
  handleGetProposalsByContest
);

// GET /api/topics/:id - Lấy chi tiết một đề tài (đã đăng nhập)
router.get("/:id", authenticate, handleGetTopicById);

// PATCH /api/topics/:id/review - Admin duyệt/từ chối đề xuất
router.patch("/:id/review", authenticate, authorize("admin"), handleReviewProposal);

// PUT /api/topics/:id - Cập nhật thông tin đề tài (chỉ Admin)
router.put("/:id", authenticate, authorize("admin"), handleUpdateTopic);

// DELETE /api/topics/:id - Xóa đề tài (chỉ Admin, chỉ xóa khi chưa giao)
router.delete("/:id", authenticate, authorize("admin"), handleDeleteTopic);

// POST /api/topics/:id/resources - Thêm tài nguyên mới vào đề tài (chỉ Admin)
router.post("/:id/resources", authenticate, authorize("admin"), handleAddResource);

// DELETE /api/topics/:id/resources/:resourceId - Xóa tài nguyên khỏi đề tài (chỉ Admin)
router.delete(
  "/:id/resources/:resourceId",
  authenticate,
  authorize("admin"),
  handleRemoveResource
);

export default router;
