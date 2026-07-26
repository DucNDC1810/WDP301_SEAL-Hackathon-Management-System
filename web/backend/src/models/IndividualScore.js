import mongoose from "mongoose";

const seasonBreakdownSchema = new mongoose.Schema(
  {
    season_name: { type: String, default: "" },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const individualScoreSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contest_id: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    score_this_hackathon: { type: Number, default: 0 },
    cumulative_score: { type: Number, default: 0 },
    season_breakdown: { type: [seasonBreakdownSchema], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

individualScoreSchema.index({ user_id: 1, contest_id: 1 }, { unique: true });
individualScoreSchema.index({ contest_id: 1 });

const IndividualScore = mongoose.model("IndividualScore", individualScoreSchema);
export default IndividualScore;
