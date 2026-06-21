import mongoose from "mongoose";

const judgeAssignmentSchema = new mongoose.Schema(
  {
    contest_id:        { type: mongoose.Schema.Types.ObjectId, ref: "Contest",    default: null },
    round_id:          { type: mongoose.Schema.Types.ObjectId,                    required: true },
    pool_id:           { type: mongoose.Schema.Types.ObjectId, ref: "Pool",       default: null },
    judge_id:          { type: mongoose.Schema.Types.ObjectId, ref: "User",       default: null },
    judge_type:        { type: String, enum: ["INTERNAL", "EXTERNAL"],             default: "INTERNAL" },
    external_email:    { type: String, default: null },
    invitation_id:     { type: mongoose.Schema.Types.ObjectId, ref: "Invitation", default: null },
    invitation_status: { type: String, enum: ["active", "pending_invite"],         default: "active" },
    assigned_by:       { type: mongoose.Schema.Types.ObjectId, ref: "User",       default: null },
    assigned_at:       { type: Date, default: Date.now }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Unique pool-judge constraint only when pool_id is set (not null)
judgeAssignmentSchema.index({ pool_id: 1, round_id: 1 }, { 
  unique: true, 
  partialFilterExpression: { pool_id: { $exists: true, $ne: null } } 
});
judgeAssignmentSchema.index({ contest_id: 1, round_id: 1 });
judgeAssignmentSchema.index({ judge_id: 1, round_id: 1 }, { unique: true });

const JudgeAssignment = mongoose.model("JudgeAssignment", judgeAssignmentSchema);
export default JudgeAssignment;
