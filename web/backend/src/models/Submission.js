import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      default: null, // assigned later by admin
    },
    project_name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    repo_url: {
      type: String,
      default: "",
    },
    demo_url: {
      type: String,
      default: "",
    },
    pitch_deck_url: {
      type: String,
      default: "",
    },
    submitted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // The leader who submitted
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "late"],
      default: "draft",
    },
  },
  {
    timestamps: { createdAt: "submitted_at", updatedAt: "updated_at" },
  }
);

const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
