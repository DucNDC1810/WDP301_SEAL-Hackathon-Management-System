import mongoose from "mongoose";

// Sub-schema cho roles nhúng vào user (theo mongodb_schema.md)
const embeddedRoleSchema = new mongoose.Schema(
  {
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    role_name: {
      type: String,
      required: true,
      enum: ["admin", "mentor", "judge", "contestant"],
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    provider_id: {
      type: String,
      default: null,
    },
    avatar_url: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    is_verified: {
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
    reset_token: {
      type: String,
      default: null,
    },
    reset_token_expires: {
      type: Date,
      default: null,
    },
    roles: {
      type: [embeddedRoleSchema],
      default: [],
    },
    is_profile_complete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes
userSchema.index({ "roles.role_name": 1 });

const User = mongoose.model("User", userSchema);
export default User;
