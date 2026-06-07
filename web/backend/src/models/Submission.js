import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    repo_url: {
      type: String,
      required: true,
      trim: true,
    },
    demo_url: {
      type: String,
      trim: true,
      default: "",
    },
    slide_url: {
      type: String,
      required: true,
      trim: true,
    },
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    round_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    is_accessible: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["SUBMITTED", "LATE_PENDING", "LATE_APPROVED", "REJECTED"],
      default: "SUBMITTED",
    },
    submitted_at: {
      type: Date,
      default: Date.now,
    },
    late_duration: {
      type: Number, // in minutes
      default: 0,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

submissionSchema.index({ round_id: 1, status: 1 });
submissionSchema.index({ team_id: 1 });

const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
