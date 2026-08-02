import MentorAssignment from "../models/MentorAssignment.js";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import { sendMentorAssignedEmail, sendCustomEmail } from "./emailService.js";
import { notifyMentorAssignedToTeam, notifyTeamMentorAssigned, createNotification } from "./notificationService.js";

const FPT_DOMAINS = ["@fpt.edu.vn", "@fe.edu.vn", "@fpt.com.vn"];
const MAX_TEAMS_PER_MENTOR_PER_ROUND = 3;

export const assignMentor = async ({ contest_id, round_id, board_id, team_id, mentor_id, assigned_by }) => {
  const mentor = await User.findById(mentor_id).select("email full_name");
  if (!mentor) {
    const err = new Error("Không tìm thấy mentor"); err.statusCode = 404; throw err;
  }
  const isFptEmail = FPT_DOMAINS.some((d) => mentor.email.endsWith(d));
  if (!isFptEmail) {
    const err = new Error("Mentor phải có email FPT (@fpt.edu.vn / @fe.edu.vn / @fpt.com.vn)");
    err.statusCode = 400; throw err;
  }

  const contest = await Contest.findById(contest_id);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi"); err.statusCode = 404; throw err;
  }
  const round = contest.rounds.id(round_id);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi"); err.statusCode = 404; throw err;
  }

  const team = await Team.findById(team_id);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi"); err.statusCode = 404; throw err;
  }

  // Mỗi bảng chỉ được 1 mentor phụ trách 1 đội — các đội khác trong cùng bảng phải có mentor khác
  const conflictInBoard = await MentorAssignment.findOne({
    mentor_id, contest_id, round_id, board_id, team_id: { $ne: team_id },
  }).populate("team_id", "team_name");
  if (conflictInBoard) {
    const err = new Error(
      `Mentor "${mentor.full_name}" đã phụ trách đội "${conflictInBoard.team_id?.team_name || 'khác'}" trong bảng này. Mỗi mentor chỉ được phụ trách 1 đội/bảng — các đội trong cùng bảng phải có mentor khác nhau.`
    );
    err.statusCode = 409; throw err;
  }

  // Đếm số teams mentor đang phụ trách trong cùng round
  const currentCount = await MentorAssignment.countDocuments({
    mentor_id, contest_id, round_id,
  });
  const warnings = [];
  if (currentCount >= MAX_TEAMS_PER_MENTOR_PER_ROUND) {
    warnings.push(
      `Mentor "${mentor.full_name}" đã phụ trách ${currentCount} đội trong vòng này (vượt giới hạn ${MAX_TEAMS_PER_MENTOR_PER_ROUND}). Hãy kiểm tra lại.`
    );
  }

  const assignment = new MentorAssignment({
    contest_id, round_id, board_id, team_id, mentor_id,
    assigned_by, assigned_at: new Date(),
    status: "pending",
  });
  await assignment.save();

  await assignment.populate([
    { path: "mentor_id", select: "full_name email" },
    { path: "team_id",   select: "team_name status members leader_id" },
    { path: "board_id",  select: "pool_name" },
  ]);

  // Gửi thông báo thời gian thực & email cho Mentor yêu cầu xác nhận.
  // Đội thi CHƯA được thông báo ở bước này — chỉ báo sau khi mentor accept (xem acceptMentorAssignment).
  try {
    const mentorUser = assignment.mentor_id;
    const teamObj = assignment.team_id;
    const poolObj = assignment.board_id;

    if (mentorUser && teamObj) {
      await notifyMentorAssignedToTeam({
        user_id: mentorUser._id,
        contestTitle: contest.title,
        poolName: poolObj?.pool_name || "Bảng đấu",
        teamName: teamObj.team_name,
        ref_id: teamObj._id,
      });

      sendMentorAssignedEmail(
        mentorUser.email,
        mentorUser.full_name || "Mentor",
        contest.title,
        teamObj.team_name
      ).catch((mailErr) => console.error("[sendMentorAssignedEmail error]", mailErr));
    }
  } catch (notifErr) {
    console.error("[assignMentor notifications error]", notifErr);
  }

  return { assignment, warnings };
};

/**
 * Mentor chấp nhận phân công (status: pending → accepted).
 * Sau khi accept, đội thi mới được thông báo là đã có mentor.
 */
export const acceptMentorAssignment = async (assignmentId, mentorId) => {
  const assignment = await MentorAssignment.findById(assignmentId)
    .populate("mentor_id", "full_name email")
    .populate("team_id", "team_name members leader_id")
    .populate("contest_id", "title");
  if (!assignment) {
    const err = new Error("Không tìm thấy phân công"); err.statusCode = 404; throw err;
  }
  if (assignment.mentor_id._id.toString() !== mentorId.toString()) {
    const err = new Error("Bạn không có quyền xác nhận phân công này"); err.statusCode = 403; throw err;
  }
  if (assignment.status !== "pending") {
    const err = new Error("Phân công này đã được xử lý trước đó"); err.statusCode = 400; throw err;
  }

  assignment.status = "accepted";
  assignment.responded_at = new Date();
  await assignment.save();

  const teamObj = assignment.team_id;
  const contestObj = assignment.contest_id;
  try {
    if (teamObj) {
      const memberUserIds = (teamObj.members || [])
        .filter((m) => m.user_id && m.email_verified)
        .map((m) => m.user_id.toString());
      if (teamObj.leader_id && !memberUserIds.includes(teamObj.leader_id.toString())) {
        memberUserIds.push(teamObj.leader_id.toString());
      }
      if (memberUserIds.length > 0) {
        await notifyTeamMentorAssigned({
          user_ids: memberUserIds,
          contestTitle: contestObj?.title || "cuộc thi",
          mentorName: assignment.mentor_id?.full_name || "Mentor",
          ref_id: teamObj._id,
        });
      }
    }
  } catch (notifErr) {
    console.error("[acceptMentorAssignment notify team error]", notifErr);
  }

  return assignment;
};

/**
 * Mentor từ chối phân công (status: pending → declined). Thông báo admin qua in-app + email.
 */
export const declineMentorAssignment = async (assignmentId, mentorId, { reason } = {}) => {
  const assignment = await MentorAssignment.findById(assignmentId)
    .populate("mentor_id", "full_name email")
    .populate("team_id", "team_name")
    .populate("contest_id", "title")
    .populate("assigned_by", "full_name email");
  if (!assignment) {
    const err = new Error("Không tìm thấy phân công"); err.statusCode = 404; throw err;
  }
  if (assignment.mentor_id._id.toString() !== mentorId.toString()) {
    const err = new Error("Bạn không có quyền xác nhận phân công này"); err.statusCode = 403; throw err;
  }
  if (assignment.status !== "pending") {
    const err = new Error("Phân công này đã được xử lý trước đó"); err.statusCode = 400; throw err;
  }

  assignment.status = "declined";
  assignment.decline_reason = reason && reason.trim() ? reason.trim() : null;
  assignment.responded_at = new Date();
  await assignment.save();

  const mentorName = assignment.mentor_id?.full_name || assignment.mentor_id?.email || "Mentor";
  const teamName = assignment.team_id?.team_name || "đội thi";
  const contestTitle = assignment.contest_id?.title || "cuộc thi";
  const reasonText = assignment.decline_reason ? ` Lý do: ${assignment.decline_reason}` : "";

  if (assignment.assigned_by) {
    createNotification({
      user_id: assignment.assigned_by._id,
      type: "general",
      title: "Mentor đã từ chối phân công",
      message: `${mentorName} đã từ chối phân công hỗ trợ đội "${teamName}" trong cuộc thi "${contestTitle}".${reasonText}`,
      ref_id: assignment.team_id?._id || null,
      ref_type: "Team",
    }).catch((e) => console.error("[declineMentorAssignment notify]", e));

    if (assignment.assigned_by.email) {
      sendCustomEmail(
        assignment.assigned_by.email,
        `[SEAL Hackathon] ${mentorName} đã từ chối làm Mentor cho đội ${teamName}`,
        `<p>Xin chào,</p>
         <p><strong>${mentorName}</strong> đã <strong>từ chối</strong> phân công hỗ trợ đội <strong>${teamName}</strong> trong cuộc thi <strong>${contestTitle}</strong>.${reasonText}</p>
         <p>Vui lòng tìm mentor khác nếu cần.</p>
         <p>Trân trọng,<br/>Hệ thống SEAL Hackathon</p>`
      ).catch((e) => console.error("[declineMentorAssignment email]", e));
    }
  }

  return assignment;
};

export const getAssignmentsByRound = async (contestId, roundId) => {
  return MentorAssignment.find({ contest_id: contestId, round_id: roundId })
    .populate("mentor_id", "full_name email")
    .populate("team_id",   "team_name status")
    .populate("board_id",  "pool_name");
};

export const getMentorAssignments = async (contestId, roundId, mentorId) => {
  return MentorAssignment.find({ contest_id: contestId, round_id: roundId, mentor_id: mentorId })
    .populate("team_id",  "team_name status topic_id")
    .populate("board_id", "pool_name");
};

export const getMyAssignments = async (mentorId) => {
  return MentorAssignment.find({ mentor_id: mentorId })
    .populate("contest_id", "title start_date end_date status rounds")
    .populate({
      path: "team_id",
      select: "team_name status members topic_id leader_id pool_id",
      populate: { path: "topic_id", select: "title" },
    })
    .populate({
      path: "board_id",
      select: "pool_name teams",
      populate: {
        path: "teams",
        select: "team_name status topic_id members leader_id",
        populate: { path: "topic_id", select: "title" },
      },
    })
    .sort({ assigned_at: -1 });
};

export const removeAssignment = async (assignmentId) => {
  const assignment = await MentorAssignment.findById(assignmentId);
  if (!assignment) {
    const err = new Error("Không tìm thấy phân công"); err.statusCode = 404; throw err;
  }
  await assignment.deleteOne();
  return { success: true };
};
