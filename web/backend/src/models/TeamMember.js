import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    is_leader: {
      type: Boolean,
      default: false,
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    is_checked_in: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "joined_at", updatedAt: "updated_at" },
  }
);

// Indexes — a user can only be in one team per team (prevent duplicates)
teamMemberSchema.index({ team_id: 1, user_id: 1 }, { unique: true });
teamMemberSchema.index({ user_id: 1 });
teamMemberSchema.index({ team_id: 1 });

const TeamMember = mongoose.model("TeamMember", teamMemberSchema);
export default TeamMember;
