import mongoose from "mongoose";

const userRoleSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "assigned_at", updatedAt: false },
  }
);

userRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });

const UserRole = mongoose.model("UserRole", userRoleSchema);
export default UserRole;
