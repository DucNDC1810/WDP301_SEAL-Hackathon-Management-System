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

// 1 pool có thể có nhiều judge, nhưng 1 judge chỉ chấm 1 pool trong cùng round
judgeAssignmentSchema.index(
  { pool_id: 1, round_id: 1, judge_id: 1 },
  { unique: true, partialFilterExpression: { judge_id: { $type: "objectId" } } }
);
judgeAssignmentSchema.index(
  { pool_id: 1, round_id: 1, external_email: 1 },
  { unique: true, partialFilterExpression: { external_email: { $type: "string" } } }
);
judgeAssignmentSchema.index({ contest_id: 1, round_id: 1 });
judgeAssignmentSchema.index({ judge_id: 1, round_id: 1 }, { unique: true });

const JudgeAssignment = mongoose.model("JudgeAssignment", judgeAssignmentSchema);
export default JudgeAssignment;
