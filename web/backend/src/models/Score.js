import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    submission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
    },
    mentor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    total_score: {
      type: Number,
      default: 0,
    },
    feedback: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "scored_at", updatedAt: false },
  }
);

// Một mentor chỉ được chấm 1 submission 1 lần
scoreSchema.index({ submission_id: 1, mentor_id: 1 }, { unique: true });

const Score = mongoose.model("Score", scoreSchema);
export default Score;
