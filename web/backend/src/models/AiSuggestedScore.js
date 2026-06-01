import mongoose from "mongoose";

const aiSuggestedScoreSchema = new mongoose.Schema(
  {
    ai_review_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiReview",
      required: true,
    },
    criterion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScoreCriteria",
      required: true,
    },
    suggested_score: {
      type: Number,
      required: true,
      min: 0,
    },
    reasoning: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: false,
  }
);

const AiSuggestedScore = mongoose.model("AiSuggestedScore", aiSuggestedScoreSchema);
export default AiSuggestedScore;
