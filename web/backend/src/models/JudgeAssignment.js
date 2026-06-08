import mongoose from "mongoose";

const judgeAssignmentSchema = new mongoose.Schema(
  {
    contest_id:        { type: mongoose.Schema.Types.ObjectId, ref: "Contest",    required: true },
    round_id:          { type: mongoose.Schema.Types.ObjectId,                    required: true },
    pool_id:           { type: mongoose.Schema.Types.ObjectId, ref: "Pool",       required: true },
    judge_id:          { type: mongoose.Schema.Types.ObjectId, ref: "User",       default: null },
    judge_type:        { type: String, enum: ["INTERNAL", "EXTERNAL"],             default: "INTERNAL" },
    external_email:    { type: String, default: null },
    invitation_id:     { type: mongoose.Schema.Types.ObjectId, ref: "Invitation", default: null },
    invitation_status: { type: String, enum: ["active", "pending_invite"],         default: "active" },
    assigned_by:       { type: mongoose.Schema.Types.ObjectId, ref: "User",       required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// 1 pool chỉ có 1 judge trong cùng round
judgeAssignmentSchema.index({ pool_id: 1, round_id: 1 }, { unique: true });
judgeAssignmentSchema.index({ contest_id: 1, round_id: 1 });

const JudgeAssignment = mongoose.model("JudgeAssignment", judgeAssignmentSchema);
export default JudgeAssignment;
