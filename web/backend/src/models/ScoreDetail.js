import mongoose from "mongoose";

const scoreDetailSchema = new mongoose.Schema({
  score_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Score", required: true },
  criteria_name: { type: String,  required: true },
  score_value:   { type: Number,  required: true },
  weight:        { type: Number,  required: true },
  max_score:     { type: Number,  required: true },
});

scoreDetailSchema.index({ score_id: 1 });

const ScoreDetail = mongoose.model("ScoreDetail", scoreDetailSchema);
export default ScoreDetail;
