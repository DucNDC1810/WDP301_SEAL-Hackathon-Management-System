import mongoose from "mongoose";

const criteriaSchema = new mongoose.Schema(
  {
    round_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Round",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index to find criteria for a round quickly
criteriaSchema.index({ round_id: 1 });

const Criteria = mongoose.model("Criteria", criteriaSchema);
export default Criteria;
