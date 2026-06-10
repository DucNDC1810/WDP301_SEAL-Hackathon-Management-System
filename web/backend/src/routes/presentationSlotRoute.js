import express from "express";
import {
  handleCreateSlot,
  handleBulkCreateSlots,
  handleGetSlots,
  handleUpdateSlot,
  handleCancelSlot,
  handleGetMyPoolSlots,
  handleGetMyBooking,
  handleBookSlot,
  handleCancelMyBooking,
} from "../controllers/presentationSlotController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.post(  "/",          authenticate, authorize("admin"), handleCreateSlot);
router.post(  "/bulk",      authenticate, authorize("admin"), handleBulkCreateSlots);
router.get(   "/",          authenticate, authorize("admin"), handleGetSlots);
router.put(   "/:id",       authenticate, authorize("admin"), handleUpdateSlot);
router.delete("/:id/cancel",authenticate, authorize("admin"), handleCancelSlot);

// ─── Student routes ───────────────────────────────────────────────────────────
router.get(   "/my-pool",           authenticate, handleGetMyPoolSlots);
router.get(   "/my-booking",        authenticate, handleGetMyBooking);
router.post(  "/:id/book",          authenticate, handleBookSlot);
router.delete("/:id/cancel-booking",authenticate, handleCancelMyBooking);

export default router;
