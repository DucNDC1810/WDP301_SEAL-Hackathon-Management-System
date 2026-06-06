import MentorAssignment from "../models/MentorAssignment.js";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import User from "../models/User.js";

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
    { path: "team_id",   select: "team_name status" },
    { path: "board_id",  select: "pool_name" },
  ]);

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

export const removeAssignment = async (assignmentId) => {
  const assignment = await MentorAssignment.findById(assignmentId);
  if (!assignment) {
    const err = new Error("Không tìm thấy phân công"); err.statusCode = 404; throw err;
  }
  await assignment.deleteOne();
  return { success: true };
};
