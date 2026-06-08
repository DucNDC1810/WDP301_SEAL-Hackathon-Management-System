import mongoose from "mongoose";

const appealSchema = new mongoose.Schema(
  {
    team_id:           { type: mongoose.Schema.Types.ObjectId, ref: "Team",    required: true },
    contest_id:        { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    round_id:          { type: mongoose.Schema.Types.ObjectId, required: true },
    content:           { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved_valid", "resolved_invalid"],
      default: "pending",
    },
    ai_classification: { type: String, default: null },
    ai_reason:         { type: String, default: null },
    resolved_by:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolved_at:       { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

appealSchema.index({ contest_id: 1, status: 1 });
appealSchema.index({ team_id: 1 });

const Appeal = mongoose.model("Appeal", appealSchema);
export default Appeal;
