import { getAuditLogs } from "../services/auditLogService.js";

/**
 * GET /api/audit-logs
 * Query params: actor_id, resource, resource_id, action, status, from, to, page, limit
 */
export const handleGetAuditLogs = async (req, res) => {
  try {
    const { actor_id, resource, resource_id, action, status, from, to, page, limit } = req.query;

    const result = await getAuditLogs({
      actor_id,
      resource,
      resource_id,
      action,
      status,
      from,
      to,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      data: result.logs,
    });
  } catch (error) {
    console.error("[handleGetAuditLogs]", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
