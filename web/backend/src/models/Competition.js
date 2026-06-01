import mongoose from "mongoose";

const competitionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "registration", "in_progress", "judging", "completed", "cancelled"],
      default: "draft",
    },
    registration_start: {
      type: Date,
      default: null,
    },
    registration_end: {
      type: Date,
      default: null,
    },
    submission_deadline: {
      type: Date,
      default: null,
    },
    final_date: {
      type: Date,
      default: null,
    },
    auto_close: {
      type: Boolean,
      default: false,
    },
    max_team_size: {
      type: Number,
      default: 5,
    },
    allow_resubmit: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes
competitionSchema.index({ status: 1 });
competitionSchema.index({ registration_start: 1, registration_end: 1 });

const Competition = mongoose.model("Competition", competitionSchema);
export default Competition;
