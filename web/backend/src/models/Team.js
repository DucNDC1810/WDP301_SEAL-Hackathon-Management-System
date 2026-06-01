import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    competition_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
    },
    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    assigned_topic_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    team_name: {
      type: String,
      required: true,
      trim: true,
    },
    max_members: {
      type: Number,
      default: 5,
    },
    status: {
      type: String,
      enum: ["open", "full", "locked", "disqualified"],
      default: "open",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes
teamSchema.index({ competition_id: 1 });
teamSchema.index({ competition_id: 1, team_name: 1 }, { unique: true });
teamSchema.index({ status: 1 });

const Team = mongoose.model("Team", teamSchema);
export default Team;
