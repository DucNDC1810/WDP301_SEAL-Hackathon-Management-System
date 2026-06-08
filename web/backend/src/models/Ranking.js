import mongoose from "mongoose";

const rankingSchema = new mongoose.Schema(
  {
    contest_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    round_id:      { type: mongoose.Schema.Types.ObjectId, required: true },
    board_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Pool",    required: true },
    team_id:       { type: mongoose.Schema.Types.ObjectId, ref: "Team",    required: true },
    team_name:     { type: String, required: true },
    final_score:   { type: Number, default: 0 },
    rank_position: { type: Number, default: 0 },
    qualified:     { type: Boolean, default: false },
    calculated_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

rankingSchema.index({ contest_id: 1, round_id: 1, rank_position: 1 });

const Ranking = mongoose.model("Ranking", rankingSchema);
export default Ranking;
