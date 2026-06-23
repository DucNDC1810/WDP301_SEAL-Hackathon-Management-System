import express from "express";
import {
  handleDrawPools,
  handleGetPoolsByContest,
  handleResetPools,
  handleCreateEmptyPools,
  handleAssignTeams,
  handleAddSinglePool,
  handleUpdatePool,
} from "../controllers/poolController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/pools/contests/:contestId/draw-pools - Chia bảng đấu ngẫu nhiên (Chỉ Admin)
router.post(
  "/contests/:contestId/draw-pools",
  authenticate,
  authorize("admin"),
  handleDrawPools
);

// POST /api/pools/contests/:contestId/create-empty - Tạo bảng đấu trống (Chỉ Admin)
router.post(
  "/contests/:contestId/create-empty",
  authenticate,
  authorize("admin"),
  handleCreateEmptyPools
);

// POST /api/pools/contests/:contestId/add-single - Thêm một bảng đấu đơn lẻ (Chỉ Admin)
router.post(
  "/contests/:contestId/add-single",
  authenticate,
  authorize("admin"),
  handleAddSinglePool
);

// PUT /api/pools/:poolId - Cập nhật bảng đấu (Chỉ Admin)
router.put(
  "/:poolId",
  authenticate,
  authorize("admin"),
  handleUpdatePool
);

// POST /api/pools/contests/:contestId/assign-teams - Xếp các đội vào bảng đấu ngẫu nhiên (Chỉ Admin)
router.post(
  "/contests/:contestId/assign-teams",
  authenticate,
  authorize("admin"),
  handleAssignTeams
);

// GET /api/pools/contests/:contestId/pools - Xem danh sách bảng đấu của cuộc thi (Đã đăng nhập)
router.get("/contests/:contestId/pools", authenticate, handleGetPoolsByContest);

// DELETE /api/pools/contests/:contestId/pools - Reset toàn bộ bảng đấu của cuộc thi (Chỉ Admin)
router.delete(
  "/contests/:contestId/pools",
  authenticate,
  authorize("admin"),
  handleResetPools
);

export default router;
