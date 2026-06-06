import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    submission_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    team_id:       { type: mongoose.Schema.Types.ObjectId, ref: "Team",    required: true },
    judge_id:      { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    // giữ mentor_id alias để backward compat
    mentor_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User",    default: null },
    contest_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    round_id:      { type: mongoose.Schema.Types.ObjectId, required: true },
    total_score:   { type: Number, default: 0 },
    comment:       { type: String, default: "" },
    score_type:    { type: String, enum: ["NORMAL", "CALIBRATION", "PENALTY"], default: "NORMAL" },
    status:        { type: String, enum: ["draft", "submitted"], default: "draft" },
    is_final:      { type: Boolean, default: false },
    submitted_at:  { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

scoreSchema.index({ judge_id: 1, contest_id: 1, round_id: 1 });
scoreSchema.index({ mentor_id: 1, contest_id: 1, round_id: 1 });
scoreSchema.index({ team_id: 1, contest_id: 1, round_id: 1 });
// Unique: 1 judge chỉ có 1 score record per (team, round)
scoreSchema.index({ judge_id: 1, team_id: 1, round_id: 1 }, { unique: true });

const Score = mongoose.model("Score", scoreSchema);
export default Score;
