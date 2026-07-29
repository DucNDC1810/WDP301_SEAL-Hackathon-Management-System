import MentorAssignment from "../models/MentorAssignment.js";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import { sendMentorAssignedEmail } from "./emailService.js";
import { notifyMentorAssignedToTeam, notifyTeamMentorAssigned } from "./notificationService.js";

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
  });
  await assignment.save();

  await assignment.populate([
    { path: "mentor_id", select: "full_name email" },
    { path: "team_id",   select: "team_name status members leader_id" },
    { path: "board_id",  select: "pool_name" },
  ]);

  // Gửi thông báo thời gian thực & email cho Mentor và Đội thi
  try {
    const mentorUser = assignment.mentor_id;
    const teamObj = assignment.team_id;
    const poolObj = assignment.board_id;

    if (mentorUser && teamObj) {
      // 1. Notify Mentor (In-app)
      await notifyMentorAssignedToTeam({
        user_id: mentorUser._id,
        contestTitle: contest.title,
        poolName: poolObj?.pool_name || "Bảng đấu",
        teamName: teamObj.team_name,
        ref_id: teamObj._id,
      });

      // 2. Notify Mentor (Email)
      sendMentorAssignedEmail(
        mentorUser.email,
        mentorUser.full_name || "Mentor",
        contest.title,
        teamObj.team_name
      ).catch((mailErr) => console.error("[sendMentorAssignedEmail error]", mailErr));

      // 3. Notify Team members (In-app)
      const memberUserIds = (teamObj.members || [])
        .filter((m) => m.user_id && m.email_verified)
        .map((m) => m.user_id.toString());
      if (teamObj.leader_id && !memberUserIds.includes(teamObj.leader_id.toString())) {
        memberUserIds.push(teamObj.leader_id.toString());
      }

      if (memberUserIds.length > 0) {
        await notifyTeamMentorAssigned({
          user_ids: memberUserIds,
          contestTitle: contest.title,
          mentorName: mentorUser.full_name || "Mentor",
          ref_id: teamObj._id,
        });
      }
    }
  } catch (notifErr) {
    console.error("[assignMentor notifications error]", notifErr);
  }

  return { assignment, warnings };
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
