import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    contest_id:  { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    round_id:    { type: mongoose.Schema.Types.ObjectId, required: true },
    team_id:     { type: mongoose.Schema.Types.ObjectId, ref: "Team",    required: true },
    mentor_id:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    sender_id:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    content:     { type: String, default: "", trim: true, maxlength: 2000 },
    attachments: [{
      url:          { type: String, required: true },
      original_name:{ type: String, required: true },
      mime_type:    { type: String, default: "" },
      size:         { type: Number, default: 0 },
    }],
    read_by:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

chatMessageSchema.index({ contest_id: 1, round_id: 1, team_id: 1, mentor_id: 1, created_at: 1 });

chatMessageSchema.pre("validate", function (next) {
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    return next(new Error("Tin nhắn phải có nội dung hoặc file đính kèm"));
  }
  next();
});

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;
