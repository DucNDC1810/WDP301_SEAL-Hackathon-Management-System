import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    role_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

const Role = mongoose.model("Role", roleSchema);
export default Role;
