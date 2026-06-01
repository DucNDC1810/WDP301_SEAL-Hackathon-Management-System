import express from "express";
import { setupAdmin } from "../controllers/setupController.js";

const router = express.Router();

// POST /api/setup/admin — Khởi tạo Admin theo database notation crows-foot
router.post("/admin", setupAdmin);

export default router;
