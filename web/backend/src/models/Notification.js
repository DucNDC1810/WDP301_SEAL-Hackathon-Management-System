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
      enum: [
        "finalist_announcement",   // vào vòng chung kết
        "deadline_reminder",       // reminder deadline
        "missing_submission",      // thiếu submission
        "mentor_assigned",         // được phân công mentor
        "invitation",              // lời mời mentor
        "team_member_verified",    // thành viên đã xác nhận
        "score_published",         // điểm đã được công bố
        "general",                 // thông báo chung
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // Tham chiếu đến entity liên quan (contest, team, v.v.)
    ref_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    ref_type: {
      type: String,
      enum: ["Contest", "Team", "Invitation", "Score", null],
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
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
