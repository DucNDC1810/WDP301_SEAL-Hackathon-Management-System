import mongoose from "mongoose";

const prizeSchema = new mongoose.Schema(
  {
    contest_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    name:            { type: String, required: true, trim: true },
    description:     { type: String, default: "" },
    value:           { type: String, default: "" },
    rank_required:   { type: Number, default: null },
    awarded_team_id: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

prizeSchema.index({ contest_id: 1, rank_required: 1 });

export default mongoose.model("Prize", prizeSchema);
