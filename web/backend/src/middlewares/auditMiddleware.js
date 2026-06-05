import { log } from "../services/auditLogService.js";

/**
 * Middleware factory để tự động ghi audit log sau khi response hoàn thành.
 *
 * Dùng trong route: router.post("/", authenticate, audit("USER", "CREATE"), handler)
 *
 * @param {string} resource — tên resource (USER, TEAM, CONTEST, ...)
 * @param {string} verb     — hành động (CREATE, UPDATE, DELETE, ...)
 */
export const audit = (resource, verb) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

      log({
        action: `${resource}:${verb}`,
        resource,
        actor: req.user ?? null,
        resource_id: req.params?.id || body?.data?._id || null,
        after: isSuccess ? (body?.data ?? null) : null,
        ip_address: req.ip || req.headers["x-forwarded-for"] || null,
        user_agent: req.headers["user-agent"] || null,
        status: isSuccess ? "success" : "failure",
        error_message: !isSuccess ? (body?.message ?? null) : null,
      });

      return originalJson(body);
    };

    next();
  };
};
