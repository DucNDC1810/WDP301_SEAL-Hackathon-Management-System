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
    drive_link: {
      type: String,
      trim: true,
      default: "",
    },
    force_lock_reason: {
      type: String,
      default: null,
    },
    early_activation_reason: {
      type: String,
      default: null,
    },
    coding_duration_hours: {
      type: Number,
      default: 24,
    },
    top_n_advance: {
      type: Number,
      default: 10,
    },
    wildcard_enabled: {
      type: Boolean,
      default: false,
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
      default: () => [
        {
          round_number: 1,
          name: "Vòng sơ loại",
          is_active: false,
          scoring_locked: false,
        },
        {
          round_number: 2,
          name: "Vòng chung kết",
          is_active: false,
          scoring_locked: false,
        }
      ],
    },
    max_teams_per_pool: {
      type: Number,
      default: 10,
    },
    min_team_size: {
      type: Number,
      default: 4,
      min: 1,
    },
    max_team_size: {
      type: Number,
      default: 4,
      min: 1,
    },
    wildcard_enabled: {
      type: Boolean,
      default: false,
    },
    individual_ranking_enabled: {
      type: Boolean,
      default: false,
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
