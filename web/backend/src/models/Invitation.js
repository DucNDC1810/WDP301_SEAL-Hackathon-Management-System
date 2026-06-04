import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    contest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["mentor"],
      default: "mentor",
    },
    invited_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      default: null,
    },
    token_expires: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired", "cancelled"],
      default: "pending",
    },
    accepted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

invitationSchema.index({ contest_id: 1, email: 1 }, { unique: true });
invitationSchema.index({ token: 1 });
invitationSchema.index({ status: 1 });

const Invitation = mongoose.model("Invitation", invitationSchema);
export default Invitation;
