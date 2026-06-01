import mongoose from "mongoose";

const roundSchema = new mongoose.Schema(
  {
    competition_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
    },
    round_name: {
      type: String,
      required: true,
      trim: true,
    },
    round_order: {
      type: Number,
      required: true,
    },
    start_date: {
      type: Date,
      default: null,
    },
    end_date: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: false,
  }
);

const Round = mongoose.model("Round", roundSchema);
export default Round;
