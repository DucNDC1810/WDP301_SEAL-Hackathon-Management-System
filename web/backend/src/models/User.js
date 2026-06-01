import mongoose from "mongoose";

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
    github_username: {
      type: String,
      default: "",
    },
    github_link: {
      type: String,
      default: "",
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    verification_code: {
      type: String,
      default: null,
    },
    verification_code_expires_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

const User = mongoose.model("User", userSchema);
export default User;
