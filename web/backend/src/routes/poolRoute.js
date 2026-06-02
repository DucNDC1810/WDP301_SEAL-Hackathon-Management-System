import express from "express";
import {
  handleDrawPools,
  handleGetPoolsByContest,
  handleResetPools,
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
