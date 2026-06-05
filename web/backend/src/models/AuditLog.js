import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null = system action
    },
    actor_email: {
      type: String,
      default: "system",
    },
    action: {
      type: String,
      required: true,
      // format: "RESOURCE:VERB" — ví dụ: "USER:CREATE", "TEAM:DISQUALIFY"
    },
    resource: {
      type: String,
      required: true,
      enum: [
        "USER", "TEAM", "CONTEST", "POOL", "TOPIC",
        "SCORE", "RANKING", "INVITATION", "MENTOR_ASSIGNMENT",
        "APPEAL", "NOTIFICATION",
      ],
    },
    resource_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Snapshot trước và sau khi thay đổi
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ip_address: {
      type: String,
      default: null,
    },
    user_agent: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
    },
    error_message: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

auditLogSchema.index({ actor_id: 1, created_at: -1 });
auditLogSchema.index({ resource: 1, resource_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ created_at: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
