import { Router } from "express";
import {
  previewScheduleChangeResponse,
  confirmScheduleChangeResponse,
  declineScheduleChangeResponse,
} from "../services/scheduleChangeService.js";

const router = Router();

// Public — judge/mentor xác nhận/từ chối qua link trong email, không cần đăng nhập.

// GET /api/schedule-change/preview?token=
router.get("/preview", async (req, res, next) => {
  try {
    const { token } = req.query;
    const data = await previewScheduleChangeResponse(token);
    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
});

// POST /api/schedule-change/confirm?token=
router.post("/confirm", async (req, res, next) => {
  try {
    const { token } = req.query;
    await confirmScheduleChangeResponse(token);
    res.json({ success: true, message: "Đã xác nhận tiếp tục tham gia" });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
});

// POST /api/schedule-change/decline?token=
router.post("/decline", async (req, res, next) => {
  try {
    const { token } = req.query;
    const { reason } = req.body || {};
    await declineScheduleChangeResponse(token, { reasonNote: reason });
    res.json({ success: true, message: "Đã ghi nhận từ chối tiếp tục tham gia" });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
});

export default router;
