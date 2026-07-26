import mongoose from "mongoose";

const prizeClaimSchema = new mongoose.Schema(
  {
    prize_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Prize", required: true },
    team_id:       { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    contact_name:  { type: String, default: "" },
    contact_email: { type: String, default: "" },
    bank_info:     { type: String, default: "" },
    note:          { type: String, default: "" },
    submitted_at:  { type: Date, default: Date.now },
    status:        { type: String, enum: ["PENDING", "CONFIRMED"], default: "PENDING" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

prizeClaimSchema.index({ prize_id: 1 }, { unique: true });
prizeClaimSchema.index({ team_id: 1 });

export default mongoose.model("PrizeClaim", prizeClaimSchema);
