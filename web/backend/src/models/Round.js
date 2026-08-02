import mongoose from "mongoose";

const roundSchema = new mongoose.Schema(
  {
    contest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["PRELIMINARY", "FINAL"],
      required: true,
    },
    is_active: {
      type: Boolean,
      default: false,
    },
    round_start: {
      type: Date,
      default: null,
    },
    round_end: {
      type: Date,
      default: null,
    },
    top_n: {
      type: Number,
      default: 6,
    },
    wildcard_enabled: {
      type: Boolean,
      default: false,
    },
    wildcard_count: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "SCORING", "PENDING_CONFIRM", "FINISHED"],
      default: "DRAFT",
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
    early_activation_reason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Round = mongoose.model("Round", roundSchema);
export default Round;
