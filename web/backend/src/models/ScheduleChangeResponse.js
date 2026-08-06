import mongoose from "mongoose";

/**
 * Ghi nhận phản hồi của 1 judge/mentor khi round bị kích hoạt lệch lịch
 * (dời lịch sớm hơn dự kiến / sự cố). Mỗi bản ghi gắn với 1 assignment cụ thể
 * (JudgeAssignment hoặc MentorAssignment) để khi "từ chối", hệ thống biết chính
 * xác assignment nào cần xóa.
 */
const scheduleChangeResponseSchema = new mongoose.Schema(
  {
    contest_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    round_id:        { type: mongoose.Schema.Types.ObjectId, required: true },
    recipient_role:  { type: String, enum: ["judge", "mentor"], required: true },
    recipient_email: { type: String, required: true },
    // Tham chiếu tới đúng bản ghi phân công cần xóa nếu người này từ chối
    assignment_id:   { type: mongoose.Schema.Types.ObjectId, required: true },
    assignment_model: { type: String, enum: ["JudgeAssignment", "MentorAssignment"], required: true },
    reason:          { type: String, default: null }, // lý do dời lịch, lưu để hiển thị khi preview
    status:          { type: String, enum: ["pending", "confirmed", "declined"], default: "pending" },
    responded_at:    { type: Date, default: null },
    token:           { type: String, required: true },
    token_expires:   { type: Date, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

scheduleChangeResponseSchema.index({ token: 1 });
scheduleChangeResponseSchema.index({ round_id: 1, recipient_email: 1 });

const ScheduleChangeResponse = mongoose.model("ScheduleChangeResponse", scheduleChangeResponseSchema);
export default ScheduleChangeResponse;
