import mongoose from "mongoose";

const aiQuestionSchema = new mongoose.Schema(
  {
    ai_review_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiReview",
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    context: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: false,
  }
);

const AiQuestion = mongoose.model("AiQuestion", aiQuestionSchema);
export default AiQuestion;
