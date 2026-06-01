import express from "express";
import {
  handleAssignMentor,
  handleGetAssignments,
  handleRemoveAssignment,
} from "../controllers/mentorAssignmentController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/contests/:contestId/rounds/:roundId",
  authenticate, authorize("admin"),
  handleAssignMentor
);
router.get(
  "/contests/:contestId/rounds/:roundId",
  authenticate, authorize("admin", "mentor"),
  handleGetAssignments
);
router.delete("/:id", authenticate, authorize("admin"), handleRemoveAssignment);

export default router;
