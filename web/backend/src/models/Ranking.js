import mongoose from "mongoose";

const rankingSchema = new mongoose.Schema(
  {
    round_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Round",
      required: true,
    },
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    final_score: {
      type: Number,
      required: true,
      default: 0,
    },
    rank: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

// Một team chỉ có 1 ranking trong 1 round
rankingSchema.index({ round_id: 1, team_id: 1 }, { unique: true });

const Ranking = mongoose.model("Ranking", rankingSchema);
export default Ranking;
