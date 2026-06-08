import AuditLog from "../models/AuditLog.js";

// ─── log ─────────────────────────────────────────────────────────────────────

/**
 * Ghi một audit log entry.
 * Fire-and-forget — không throw để tránh làm sập luồng chính.
 *
 * @param {object} opts
 * @param {string}  opts.action        — "USER:CREATE", "TEAM:DISQUALIFY", v.v.
 * @param {string}  opts.resource      — tên resource (USER, TEAM, ...)
 * @param {object}  [opts.actor]       — req.user (có thể null cho system action)
 * @param {string}  [opts.resource_id] — ID của resource bị tác động
 * @param {object}  [opts.before]      — snapshot trước khi thay đổi
 * @param {object}  [opts.after]       — snapshot sau khi thay đổi
 * @param {string}  [opts.ip_address]
 * @param {string}  [opts.user_agent]
 * @param {string}  [opts.status]      — "success" | "failure"
 * @param {string}  [opts.error_message]
 */
export const log = ({
  action,
  resource,
  actor = null,
  resource_id = null,
  before = null,
  after = null,
  ip_address = null,
  user_agent = null,
  status = "success",
  error_message = null,
}) => {
  AuditLog.create({
    actor_id: actor?._id ?? null,
    actor_email: actor?.email ?? "system",
    action,
    resource,
    resource_id,
    before,
    after,
    ip_address,
    user_agent,
    status,
    error_message,
  }).catch((err) => console.error("[AuditLog]", err));
};

// ─── getAuditLogs ─────────────────────────────────────────────────────────────

/**
 * Query audit logs với filter đầy đủ.
 */
export const getAuditLogs = async ({
  actor_id,
  resource,
  resource_id,
  action,
  status,
  from,
  to,
  page = 1,
  limit = 50,
} = {}) => {
  const query = {};

  if (actor_id) query.actor_id = actor_id;
  if (resource) query.resource = resource.toUpperCase();
  if (resource_id) query.resource_id = resource_id;
  if (action) query.action = { $regex: action, $options: "i" };
  if (status) query.status = status;

  if (from || to) {
    query.created_at = {};
    if (from) query.created_at.$gte = new Date(from);
    if (to) query.created_at.$lte = new Date(to);
  }

  const skip = (Math.max(1, page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate("actor_id", "full_name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(query),
  ]);

  return { logs, total, page: Number(page), limit: Number(limit) };
};
