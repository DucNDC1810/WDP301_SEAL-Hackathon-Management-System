import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";

/**
 * Writes an audit log entry.
 *
 * @param {Object} params
 * @param {string} params.action - The action performed (e.g. "SUBMISSION_REVIEWED", "TEAM_ELIMINATE").
 * @param {string|Object} [params.actorId] - The ID of the actor (User) performing the action.
 * @param {string|Object} [params.targetId] - The ID of the resource affected.
 * @param {string} params.targetModel - The model of the resource affected (e.g. "Team", "Submission", "Round").
 * @param {Object} [params.detail] - Extra details of the action, saved in the 'after' field.
 * @returns {Promise<Object>} The created AuditLog document.
 */
export async function writeLog({ action, actorId, targetId, targetModel, detail }) {
  let actorEmail = "system";

  if (actorId) {
    const actor = await User.findById(actorId).select("email");
    if (actor) {
      actorEmail = actor.email;
    }
  }

  const resource = targetModel ? targetModel.toUpperCase() : "SYSTEM";

  const logEntry = await AuditLog.create({
    actor_id: actorId || null,
    actor_email: actorEmail,
    action,
    resource,
    resource_id: targetId || null,
    after: detail || null,
    status: "success",
  });

  return logEntry;
}
