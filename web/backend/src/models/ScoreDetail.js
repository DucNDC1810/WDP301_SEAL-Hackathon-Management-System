import mongoose from "mongoose";

const scoreDetailSchema = new mongoose.Schema(
  {
    score_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Score",
      required: true,
    },
    criterion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScoreCriteria", // Assumes we have a ScoreCriteria model or will create one
      required: true,
    },
    score_value: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: false,
  }
);

const ScoreDetail = mongoose.model("ScoreDetail", scoreDetailSchema);
export default ScoreDetail;
