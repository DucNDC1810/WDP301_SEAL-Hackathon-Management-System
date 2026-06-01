import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    full_name: {
      type: String,
      trim: true,
      default: "",
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    verify_token: {
      type: String,
      default: null,
    },
    verify_token_expires: {
      type: Date,
      default: null,
    },
  }
);

const teamSchema = new mongoose.Schema(
  {
    contest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    team_name: {
      type: String,
      required: true,
      trim: true,
    },
    leader_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "disqualified"],
      default: "pending",
    },
    pool_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pool",
      default: null,
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
teamSchema.index({ contest_id: 1 });
teamSchema.index({ status: 1 });
teamSchema.index({ "members.email": 1 });
teamSchema.index({ leader_id: 1 });

const Team = mongoose.model("Team", teamSchema);
export default Team;
