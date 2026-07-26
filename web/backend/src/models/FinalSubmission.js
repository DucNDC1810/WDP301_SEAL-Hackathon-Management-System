import mongoose from "mongoose";

const criteriaSubmissionSchema = new mongoose.Schema(
  {
    criteria_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Criteria",
    },
    criteria_name: {
      type: String,
      trim: true,
    },
    file_url: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const finalSubmissionSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    round_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Round",
      required: true,
    },
    criteria_submissions: [criteriaSubmissionSchema],
    status: {
      type: String,
      enum: ["SUBMITTED", "LATE_REJECTED"],
      default: "SUBMITTED",
    },
    submitted_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

finalSubmissionSchema.index({ round_id: 1, team_id: 1 }, { unique: true });
finalSubmissionSchema.index({ round_id: 1, status: 1 });

const FinalSubmission = mongoose.model("FinalSubmission", finalSubmissionSchema);
export default FinalSubmission;
