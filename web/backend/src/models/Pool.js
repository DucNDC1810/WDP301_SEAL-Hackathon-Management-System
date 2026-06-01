import mongoose from "mongoose";

const poolSchema = new mongoose.Schema(
  {
    contest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    pool_name: {
      type: String,
      required: true,
      trim: true,
    },
    teams: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Team",
        },
      ],
      default: [],
    },
    topic_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes for frequently queried fields
poolSchema.index({ contest_id: 1 });

const Pool = mongoose.model("Pool", poolSchema);
export default Pool;
