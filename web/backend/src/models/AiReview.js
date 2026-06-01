import mongoose from "mongoose";

const aiReviewSchema = new mongoose.Schema(
  {
    submission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
      unique: true, // Thường 1 bài nộp chỉ được AI review 1 lần chính thức (hoặc có thể tùy logic)
    },
    overall_feedback: {
      type: String,
      default: "",
    },
    strengths: {
      type: String,
      default: "",
    },
    weaknesses: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "reviewed_at", updatedAt: false },
  }
);

const AiReview = mongoose.model("AiReview", aiReviewSchema);
export default AiReview;
