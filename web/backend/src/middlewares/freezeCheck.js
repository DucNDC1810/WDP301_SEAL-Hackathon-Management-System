import Round from "../models/Round.js";

const MUTATION_METHODS = ["POST", "PATCH", "PUT", "DELETE"];
const WHITELIST_PREFIXES = ["/api/prize", "/api/export"];

export async function freezeCheck(req, res, next) {
  try {
    if (!MUTATION_METHODS.includes(req.method)) return next();

    const isWhitelisted = WHITELIST_PREFIXES.some(prefix => req.path.startsWith(prefix));
    if (isWhitelisted) return next();

    const round_id = req.params.round_id || req.body?.round_id;
    if (!round_id) return next();

    const round = await Round.findById(round_id).select("status");
    if (!round) return next();

    if (round.status === "FINISHED") {
      return res.status(423).json({
        error: "ROUND_FROZEN",
        message: "Round đã kết thúc — không thể thay đổi dữ liệu"
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
