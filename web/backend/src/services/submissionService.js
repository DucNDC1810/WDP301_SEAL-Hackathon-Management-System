import Submission from "../models/Submission.js";
import Team from "../models/Team.js";
import Contest from "../models/Contest.js";
import { writeLog } from "./auditLog.js";
import { sendNotification } from "./notification.js";

/**
 * Validates a repository URL.
 * Must be GitHub or GitLab.
 *
 * @param {string} url
 * @returns {boolean}
 */
export const validateRepoUrl = (url) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  const isGit = lowerUrl.includes("github.com") || lowerUrl.includes("gitlab.com");
  const isInvalidDomain = lowerUrl.includes("drive.google.com") || lowerUrl.includes("notion.so") || lowerUrl.includes("confluence");
  return isGit && !isInvalidDomain;
};

/**
 * Validates a slide URL.
 * Must NOT be a PDF link or Confluence link - must be a slide URL.
 *
 * @param {string} url
 * @returns {boolean}
 */
export const validateSlideUrl = (url) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  const isInvalid = lowerUrl.endsWith(".pdf") || lowerUrl.includes(".pdf?") || lowerUrl.includes("confluence");
  const isValidSlide = lowerUrl.includes("docs.google.com/presentation") || 
                        lowerUrl.includes("canva.com") || 
                        lowerUrl.includes("office.live.com") || 
                        lowerUrl.includes("sharepoint.com") || 
                        lowerUrl.includes("slides") || 
                        lowerUrl.includes("powerpoint");
  return !isInvalid && isValidSlide;
};

/**
 * Creates a submission.
 *
 * @param {Object} params
 * @param {string} params.repo_url - Repository URL
 * @param {string} params.demo_url - Demo URL
 * @param {string} params.slide_url - Slide URL
 * @param {string} params.team_id - Team ID
 * @param {string} params.round_id - Round ID
 * @param {boolean} [params.is_accessible] - Flag indicating if repository is accessible or access is granted
 * @param {string} actorId - ID of current user (actor)
 * @returns {Promise<Object>} The created Submission document
 */
export const createSubmission = async ({ repo_url, demo_url, slide_url, team_id, round_id, is_accessible }, actorId) => {
  if (!validateRepoUrl(repo_url)) {
    const err = new Error("Đường dẫn repository phải là GitHub hoặc GitLab");
    err.statusCode = 400;
    throw err;
  }

  if (!validateSlideUrl(slide_url)) {
    const err = new Error("Đường dẫn slide phải là slide trực tuyến (Google Slides, Canva, PowerPoint) và không được là PDF/Confluence");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(team_id);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  const contest = await Contest.findOne({ "rounds._id": round_id });
  if (!contest) {
    const err = new Error("Không tìm thấy vòng thi");
    err.statusCode = 404;
    throw err;
  }

  const round = contest.rounds.id(round_id);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi");
    err.statusCode = 404;
    throw err;
  }

  const finalIsAccessible = is_accessible === true || is_accessible === 'true' || is_accessible === undefined;

  const now = new Date();
  let status = "SUBMITTED";
  let late_duration = 0;

  if (round.submission_deadline && now > new Date(round.submission_deadline)) {
    status = "LATE_PENDING";
    late_duration = Math.ceil((now - new Date(round.submission_deadline)) / (1000 * 60));
  }

  const submission = await Submission.create({
    repo_url,
    demo_url: demo_url || "",
    slide_url,
    team_id,
    round_id,
    is_accessible: finalIsAccessible,
    status,
    late_duration,
    submitted_at: now,
  });

  // Write audit log
  await writeLog({
    action: "SUBMISSION_CREATED",
    actorId,
    targetId: submission._id,
    targetModel: "Submission",
    detail: {
      repo_url,
      slide_url,
      status,
      late_duration,
    },
  });

  return submission;
};

/**
 * Gets submission list.
 *
 * @param {Object} queryParams
 * @param {string} [queryParams.round_id]
 * @param {string} [queryParams.status]
 * @returns {Promise<Object[]>} List of submissions
 */
export const getSubmissions = async ({ round_id, status }) => {
  const query = {};
  if (round_id) query.round_id = round_id;
  if (status) query.status = status;

  return await Submission.find(query)
    .populate("team_id", "team_name")
    .sort({ submitted_at: -1 });
};

/**
 * Review a late submission.
 *
 * @param {string} id - Submission ID
 * @param {Object} reviewData
 * @param {string} reviewData.decision - "LATE_APPROVED" | "REJECTED"
 * @param {string} [reviewData.reason] - Required if REJECTED
 * @param {string} actorId - COORDINATOR user ID
 * @returns {Promise<Object>} The updated Submission
 */
export const reviewLateSubmission = async (id, { decision, reason }, actorId) => {
  if (!["LATE_APPROVED", "REJECTED"].includes(decision)) {
    const err = new Error("Quyết định không hợp lệ. Chỉ chấp nhận LATE_APPROVED hoặc REJECTED");
    err.statusCode = 400;
    throw err;
  }

  if (decision === "REJECTED" && (!reason || !reason.trim())) {
    const err = new Error("Phải nhập lý do từ chối");
    err.statusCode = 400;
    throw err;
  }

  const submission = await Submission.findById(id);
  if (!submission) {
    const err = new Error("Không tìm thấy bài nộp");
    err.statusCode = 404;
    throw err;
  }

  if (submission.status !== "LATE_PENDING") {
    const err = new Error("Bài nộp này không ở trạng thái chờ duyệt muộn (LATE_PENDING)");
    err.statusCode = 400;
    throw err;
  }

  submission.status = decision;
  await submission.save();

  // Write AuditLog
  await writeLog({
    action: "SUBMISSION_REVIEWED",
    actorId,
    targetId: submission._id,
    targetModel: "Submission",
    detail: { decision, reason },
  });

  // Notify the team
  const team = await Team.findById(submission.team_id);
  if (team) {
    const recipientIds = [];
    if (team.leader_id) recipientIds.push(team.leader_id.toString());
    if (team.members && team.members.length > 0) {
      team.members.forEach((m) => {
        if (m.user_id) recipientIds.push(m.user_id.toString());
      });
    }
    const uniqueRecipients = [...new Set(recipientIds)];

    await sendNotification({
      recipientIds: uniqueRecipients,
      type: "general",
      payload: {
        title: "Kết quả duyệt bài nộp muộn",
        message: `Bài nộp của đội "${team.team_name}" đã được ${decision === "LATE_APPROVED" ? "chấp nhận" : "từ chối"}.${reason ? ` Lý do: ${reason}` : ""}`,
        ref_id: team._id,
        ref_type: "Team",
      },
    });
  }

  return submission;
};
