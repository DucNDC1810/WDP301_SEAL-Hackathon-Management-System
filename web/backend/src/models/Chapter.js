import mongoose from "mongoose";

const seasonScoreSchema = new mongoose.Schema(
  {
    season_id: { type: mongoose.Schema.Types.ObjectId, ref: "Season", default: null },
    season_name: { type: String, default: "" },
    best_team_score: { type: Number, default: 0 },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    cumulative_score: { type: Number, default: 0 },
    season_scores: { type: [seasonScoreSchema], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

chapterSchema.index({ name: 1 }, { unique: true });

const Chapter = mongoose.model("Chapter", chapterSchema);
export default Chapter;
