import mongoose from "mongoose";

const criteriaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    max_score: {
      type: Number,
      required: true,
    },
    weight: {
      type: Number,
      default: 1,
    },
    description: {
      type: String,
      default: "",
    },
  }
);

const roundSchema = new mongoose.Schema(
  {
    round_number: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    start_time: {
      type: Date,
      default: null,
    },
    end_time: {
      type: Date,
      default: null,
    },
    submission_deadline: {
      type: Date,
      default: null,
    },
    problem_released_at: {
      type: Date,
      default: null,
    },
    score_criteria: {
      type: [criteriaSchema],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: false,
    },
    scoring_locked: {
      type: Boolean,
      default: false,
    },
    force_lock_reason: {
      type: String,
      default: null,
    },
  }
);

const contestSchema = new mongoose.Schema(
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
    start_date: {
      type: Date,
      default: null,
    },
    end_date: {
      type: Date,
      default: null,
    },
    registration_deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "open", "closed"],
      default: "draft",
    },
    auto_close: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rounds: {
      type: [roundSchema],
      default: [],
    },
    max_teams_per_pool: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes for frequently queried fields
contestSchema.index({ status: 1 });
contestSchema.index({ created_by: 1 });

const Contest = mongoose.model("Contest", contestSchema);
export default Contest;
