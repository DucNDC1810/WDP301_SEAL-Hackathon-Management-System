import mongoose from "mongoose";

const topicSchema = new mongoose.Schema(
  {
    competition_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
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
    requirements: {
      type: String,
      default: "",
    },
    max_teams: {
      type: Number,
      default: 0, // 0 = unlimited
    },
  },
  {
    timestamps: false,
  }
);

const Topic = mongoose.model("Topic", topicSchema);
export default Topic;
