import express from "express";
import {
  handleCreateContest,
  handleGetAllContests,
  handleGetContestById,
  handleUpdateContest,
  handleDeleteContest,
  handleAddRound,
  handleAddScoreCriteria,
} from "../controllers/contestController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/contests - Tạo cuộc thi mới (chỉ Admin)
router.post("/", authenticate, authorize("admin"), handleCreateContest);

// GET /api/contests - Lấy danh sách các cuộc thi (đã đăng nhập)
router.get("/", authenticate, handleGetAllContests);

// GET /api/contests/:id - Lấy chi tiết một cuộc thi (đã đăng nhập)
router.get("/:id", authenticate, handleGetContestById);

// PUT /api/contests/:id - Cập nhật thông tin cuộc thi (chỉ Admin)
router.put("/:id", authenticate, authorize("admin"), handleUpdateContest);

// DELETE /api/contests/:id - Xóa cuộc thi (chỉ Admin)
router.delete("/:id", authenticate, authorize("admin"), handleDeleteContest);

// POST /api/contests/:id/rounds - Thêm vòng thi mới (chỉ Admin)
router.post("/:id/rounds", authenticate, authorize("admin"), handleAddRound);

// POST /api/contests/:id/rounds/:roundId/criteria - Thêm tiêu chí chấm điểm cho vòng thi (chỉ Admin)
router.post(
  "/:id/rounds/:roundId/criteria",
  authenticate,
  authorize("admin"),
  handleAddScoreCriteria
);

export default router;
