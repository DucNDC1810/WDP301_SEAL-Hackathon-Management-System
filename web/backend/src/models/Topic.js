import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["drive", "github", "doc", "other"],
      default: "other",
    },
  }
);

const topicSchema = new mongoose.Schema(
  {
    contest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    is_assigned: {
      type: Boolean,
      default: false,
    },
    resources: {
      type: [resourceSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes for frequently queried fields
topicSchema.index({ contest_id: 1 });

const Topic = mongoose.model("Topic", topicSchema);
export default Topic;
