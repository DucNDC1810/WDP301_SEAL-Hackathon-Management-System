import mongoose from "mongoose";

const mentorAssignmentSchema = new mongoose.Schema(
  {
    contest_id:  { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    round_id:    { type: mongoose.Schema.Types.ObjectId, required: true },
    board_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Pool",    default: null },
    team_id:     { type: mongoose.Schema.Types.ObjectId, ref: "Team",    required: true },
    // mentor_id = null khi mentor là người ngoài (external) chưa có tài khoản —
    // được điền vào khi họ bấm "Chấp nhận" qua email (xem acceptMentorAssignmentByToken).
    mentor_id:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    mentor_type:    { type: String, enum: ["INTERNAL", "EXTERNAL"],      default: "INTERNAL" },
    external_email: { type: String, default: null },
    assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    assigned_at: { type: Date, default: Date.now },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
    decline_reason: { type: String, default: null },
    responded_at: { type: Date, default: null },
    // Token dùng để mentor xác nhận/từ chối trực tiếp qua email, không cần đăng nhập trước.
    response_token: { type: String, default: null },
    response_token_expires: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

mentorAssignmentSchema.index(
  { mentor_id: 1, round_id: 1, team_id: 1 },
  { unique: true, partialFilterExpression: { mentor_id: { $type: "objectId" } } }
);
mentorAssignmentSchema.index(
  { external_email: 1, round_id: 1, team_id: 1 },
  { unique: true, partialFilterExpression: { external_email: { $type: "string" } } }
);
mentorAssignmentSchema.index({ contest_id: 1, round_id: 1 });
mentorAssignmentSchema.index({ response_token: 1 });

const MentorAssignment = mongoose.model("MentorAssignment", mentorAssignmentSchema);
export default MentorAssignment;
