import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    submission_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    team_id:       { type: mongoose.Schema.Types.ObjectId, ref: "Team",    required: true },
    mentor_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    contest_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    round_id:      { type: mongoose.Schema.Types.ObjectId, required: true },
    total_score:   { type: Number, default: 0 },
    comment:       { type: String, default: "" },
    status:        { type: String, enum: ["draft", "submitted"], default: "draft" },
    submitted_at:  { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

scoreSchema.index({ mentor_id: 1, contest_id: 1, round_id: 1 });
scoreSchema.index({ team_id: 1, contest_id: 1, round_id: 1 });

const Score = mongoose.model("Score", scoreSchema);
export default Score;
