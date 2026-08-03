import express from "express";
import { handleGetMyOverview } from "../controllers/overviewController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/overview/me — aggregated data for the student Overview page
router.get("/me", authenticate, handleGetMyOverview);

export default router;
