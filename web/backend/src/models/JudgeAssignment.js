import mongoose from "mongoose";

const judgeAssignmentSchema = new mongoose.Schema(
  {
    contest_id:  { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    round_id:    { type: mongoose.Schema.Types.ObjectId, required: true },
    pool_id:     { type: mongoose.Schema.Types.ObjectId, ref: "Pool",    default: null },
    team_id:     { type: mongoose.Schema.Types.ObjectId, ref: "Team",    required: true },
    judge_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    judge_type:  { type: String, enum: ["INTERNAL", "EXTERNAL"], default: "INTERNAL" },
    assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// 1 judge chỉ được assign 1 lần cho cùng team+round
judgeAssignmentSchema.index({ judge_id: 1, team_id: 1, round_id: 1 }, { unique: true });
judgeAssignmentSchema.index({ contest_id: 1, round_id: 1 });

const JudgeAssignment = mongoose.model("JudgeAssignment", judgeAssignmentSchema);
export default JudgeAssignment;
