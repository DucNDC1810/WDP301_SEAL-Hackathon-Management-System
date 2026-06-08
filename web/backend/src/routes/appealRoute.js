import express from "express";
import {
  handleCreateAppeal,
  handleGetAppeals,
  handleGetMyAppeals,
  handleResolveAppeal,
} from "../controllers/appealController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, authorize("contestant"), handleCreateAppeal);
router.get("/contests/:contestId", authenticate, authorize("admin", "mentor"), handleGetAppeals);
router.get("/contests/:contestId/my", authenticate, authorize("contestant"), handleGetMyAppeals);
router.put("/:id/resolve", authenticate, authorize("admin"), handleResolveAppeal);

export default router;
