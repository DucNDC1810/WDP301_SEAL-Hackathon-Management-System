import mongoose from "mongoose";

const seasonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contest_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contest" }],
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Season = mongoose.model("Season", seasonSchema);
export default Season;
