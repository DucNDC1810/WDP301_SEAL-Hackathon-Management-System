import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: false,
      trim: true,
    },
    message: {
      type: String,
      required: false,
      trim: true,
    },
    // Tham chiếu đến entity liên quan (contest, team, v.v.)
    ref_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    ref_type: {
      type: String,
      enum: ["Contest", "Team", "Invitation", "Score", "User", null],
      default: null,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    read_at: {
      type: Date,
      default: null,
    },
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
