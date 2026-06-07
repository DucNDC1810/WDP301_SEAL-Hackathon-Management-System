import express from "express";
import { handleGetAuditLogs } from "../controllers/auditLogController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/audit-logs — chỉ admin xem được
// Query: ?actor_id=&resource=USER&action=DELETE&status=success&from=2026-01-01&to=2026-12-31&page=1&limit=50
router.get("/", authenticate, authorize("admin"), handleGetAuditLogs);

export default router;
