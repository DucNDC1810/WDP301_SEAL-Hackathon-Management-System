import mongoose from "mongoose";

const presentationSlotSchema = new mongoose.Schema(
  {
    contest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    round_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    pool_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pool",
      required: true,
    },
    start_time: { type: Date, required: true },
    end_time:   { type: Date, required: true },
    room:       { type: String, default: "" },
    booked_team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    booked_at: { type: Date, default: null },
    status: {
      type: String,
      enum: ["available", "booked", "cancelled", "completed"],
      default: "available",
    },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Prevent a team from booking more than 1 slot per round (only when booked_team_id is set)
presentationSlotSchema.index(
  { round_id: 1, booked_team_id: 1 },
  { unique: true, partialFilterExpression: { booked_team_id: { $type: "objectId" } } }
);
presentationSlotSchema.index({ contest_id: 1, round_id: 1, pool_id: 1 });

const PresentationSlot = mongoose.model("PresentationSlot", presentationSlotSchema);
export default PresentationSlot;
