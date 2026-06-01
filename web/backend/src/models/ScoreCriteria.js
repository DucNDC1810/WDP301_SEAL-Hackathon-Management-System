import mongoose from "mongoose";

const scoreCriteriaSchema = new mongoose.Schema(
  {
    round_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Round",
      required: true,
    },
    criterion_name: {
      type: String,
      required: true,
      trim: true,
    },
    max_score: {
      type: Number,
      default: 10,
    },
    weight: {
      type: Number,
      default: 1.0,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: false,
  }
);

const ScoreCriteria = mongoose.model("ScoreCriteria", scoreCriteriaSchema);
export default ScoreCriteria;
