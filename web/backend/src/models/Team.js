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
    contribution_percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    contribution_rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    contribution_note: {
      type: String,
      default: "",
    },
  }
);

const teamSchema = new mongoose.Schema(
  {
    contest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: false,
      default: null,
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
      enum: ["PENDING_MEMBERS", "ACTIVE", "WAITING_APPROVAL", "CONFIRMED", "REJECTED", "DISQUALIFIED", "ELIMINATED"],
      default: "PENDING_MEMBERS",
      set: v => typeof v === 'string' ? v.toUpperCase() : v,
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

// Pre-save hook to normalize status to uppercase to avoid validation errors with legacy or lowercase statuses
teamSchema.pre("save", function () {
  if (typeof this.status === "string") {
    this.status = this.status.toUpperCase();
    if (this.status === "PENDING") {
      this.status = "WAITING_APPROVAL";
    }
  }
});

// Post-save middleware to trigger re-rank when status is changed to ELIMINATED
teamSchema.post("save", async function (doc) {
  if (doc.status === "ELIMINATED") {
    try {
      const { triggerReRank } = await import("../services/roundService.js");
      const Contest = mongoose.model("Contest");
      const contest = await Contest.findById(doc.contest_id);
      let activeRoundId = null;
      if (contest && contest.rounds) {
        const activeRound = contest.rounds.find((r) => r.is_active);
        if (activeRound) {
          activeRoundId = activeRound._id;
        }
      }
      // Trigger re-rank/cache invalidation
      await triggerReRank(doc.contest_id, activeRoundId, doc.pool_id);
    } catch (err) {
      console.error("[Team post-save hook re-rank error]", err);
    }
  }
});

const Team = mongoose.model("Team", teamSchema);
export default Team;
