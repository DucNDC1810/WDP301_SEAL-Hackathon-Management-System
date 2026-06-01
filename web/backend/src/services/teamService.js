import mongoose from "mongoose";
import Team from "../models/Team.js";
import TeamMember from "../models/TeamMember.js";
import Competition from "../models/Competition.js";

// ─── getAvailableTeams ──────────────────────────────────────────────────────

/**
 * Lấy danh sách teams đang mở trong một cuộc thi,
 * kèm số thành viên hiện tại.
 */
export const getAvailableTeams = async (competitionId) => {
  if (!mongoose.Types.ObjectId.isValid(competitionId)) {
    const err = new Error("Competition ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const competition = await Competition.findById(competitionId);
  if (!competition) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  const teams = await Team.find({
    competition_id: competitionId,
    status: "open",
  }).lean();

  // Attach member count to each team
  const teamIds = teams.map((t) => t._id);
  const memberCounts = await TeamMember.aggregate([
    { $match: { team_id: { $in: teamIds } } },
    { $group: { _id: "$team_id", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(
    memberCounts.map((m) => [m._id.toString(), m.count])
  );

  return teams.map((t) => ({
    ...t,
    member_count: countMap[t._id.toString()] || 0,
    max_team_size: competition.max_team_size,
  }));
};

// ─── getActiveCompetitions ──────────────────────────────────────────────────

/**
 * Lấy danh sách cuộc thi đang mở đăng ký hoặc đang diễn ra.
 */
export const getActiveCompetitions = async () => {
  return Competition.find({
    status: { $in: ["registration", "in_progress"] },
  })
    .sort({ registration_start: -1 })
    .lean();
};

// ─── createTeam ─────────────────────────────────────────────────────────────

/**
 * Tạo team mới, user trở thành leader.
 * @returns {{ team, membership }}
 */
export const createTeam = async (userId, teamName, competitionId, maxMembers = 5) => {
  if (!mongoose.Types.ObjectId.isValid(competitionId)) {
    const err = new Error("Competition ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const competition = await Competition.findById(competitionId);
  if (!competition) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  if (!["registration", "in_progress"].includes(competition.status)) {
    const err = new Error("Cuộc thi không mở đăng ký");
    err.statusCode = 400;
    throw err;
  }

  // Check if user already in a team for this competition
  const existingMembership = await TeamMember.findOne({
    user_id: userId,
  }).populate("team_id");
  if (
    existingMembership &&
    existingMembership.team_id?.competition_id?.toString() ===
      competitionId.toString()
  ) {
    const err = new Error("Bạn đã tham gia một đội trong cuộc thi này");
    err.statusCode = 409;
    throw err;
  }

  // Check unique team name within competition
  const duplicateName = await Team.findOne({
    competition_id: competitionId,
    team_name: teamName,
  });
  if (duplicateName) {
    const err = new Error("Tên đội đã tồn tại trong cuộc thi này");
    err.statusCode = 409;
    throw err;
  }

  // Validate maxMembers against competition limits if applicable
  const finalMaxMembers = Math.min(Math.max(Number(maxMembers) || 5, 1), competition.max_team_size || 5);

  const team = new Team({
    competition_id: competitionId,
    team_name: teamName,
    max_members: finalMaxMembers,
    status: "open",
  });
  await team.save();

  const membership = new TeamMember({
    team_id: team._id,
    user_id: userId,
    is_leader: true,
    email_verified: true,
  });
  await membership.save();

  return { team, membership };
};

// ─── joinTeam ───────────────────────────────────────────────────────────────

/**
 * Tham gia một đội đang mở.
 * @returns {{ team, membership }}
 */
export const joinTeam = async (userId, teamId) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    const err = new Error("Team ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội");
    err.statusCode = 404;
    throw err;
  }

  if (team.status !== "open") {
    const err = new Error("Đội này không còn mở đăng ký");
    err.statusCode = 400;
    throw err;
  }

  // Check if user already in a team for this competition
  const existingMembership = await TeamMember.findOne({
    user_id: userId,
  }).populate("team_id");
  if (
    existingMembership &&
    existingMembership.team_id?.competition_id?.toString() ===
      team.competition_id.toString()
  ) {
    const err = new Error("Bạn đã tham gia một đội trong cuộc thi này");
    err.statusCode = 409;
    throw err;
  }

  // Check team capacity
  const competition = await Competition.findById(team.competition_id);
  const currentMembers = await TeamMember.countDocuments({ team_id: teamId });
  if (currentMembers >= (competition?.max_team_size || 5)) {
    // Auto-close the team
    team.status = "full";
    await team.save();
    const err = new Error("Đội đã đầy");
    err.statusCode = 400;
    throw err;
  }

  const membership = new TeamMember({
    team_id: teamId,
    user_id: userId,
    is_leader: false,
    email_verified: true,
  });
  await membership.save();

  // If team is now full, update status
  if (currentMembers + 1 >= (competition?.max_team_size || 5)) {
    team.status = "full";
    await team.save();
  }

  return { team, membership };
};

// ─── getMyTeam ──────────────────────────────────────────────────────────────

/**
 * Lấy thông tin đội của user (bao gồm danh sách thành viên).
 */
export const getMyTeam = async (userId) => {
  const membership = await TeamMember.findOne({ user_id: userId });
  if (!membership) {
    return null;
  }

  const team = await Team.findById(membership.team_id)
    .populate("competition_id")
    .lean();

  const members = await TeamMember.find({ team_id: membership.team_id })
    .populate("user_id", "full_name email avatar_url")
    .lean();

  return {
    ...team,
    is_leader: membership.is_leader,
    members: members.map((m) => ({
      _id: m.user_id._id,
      full_name: m.user_id.full_name,
      email: m.user_id.email,
      avatar_url: m.user_id.avatar_url,
      is_leader: m.is_leader,
      joined_at: m.joined_at,
    })),
  };
};

/**
 * Nộp bài dự thi.
 * @param {string} userId - ID của user
 * @param {string} teamId - ID của team
 * @param {Object} data - Dữ liệu nộp bài (project_name, description, repo_url)
 */
export const submitProject = async (userId, teamId, data) => {
  // Check if user is leader of the team
  // Need to use mongoose.models for late import resolution
  const TeamMember = mongoose.models.TeamMember || mongoose.model("TeamMember");
  const membership = await TeamMember.findOne({ user_id: userId, team_id: teamId });
  
  if (!membership) {
    const err = new Error("Bạn không phải thành viên của đội này");
    err.statusCode = 403;
    throw err;
  }
  if (!membership.is_leader) {
    const err = new Error("Chỉ đội trưởng mới có quyền nộp bài");
    err.statusCode = 403;
    throw err;
  }

  // Need to use mongoose.models for late import resolution
  const Submission = mongoose.models.Submission || mongoose.model("Submission");
  
  let submission = await Submission.findOne({ team_id: teamId });
  
  if (submission) {
    // Update existing
    submission.project_name = data.project_name;
    submission.description = data.description;
    submission.repo_url = data.repo_url;
    submission.submitted_by = userId;
    submission.status = "submitted";
    await submission.save();
  } else {
    // Create new
    submission = new Submission({
      team_id: teamId,
      project_name: data.project_name,
      description: data.description,
      repo_url: data.repo_url,
      submitted_by: userId,
      status: "submitted"
    });
    await submission.save();
  }

  // Update User model with github info
  const User = mongoose.models.User || mongoose.model("User");
  const user = await User.findById(userId);
  if (user) {
    user.github_username = data.project_name;
    user.github_link = data.repo_url;
    await user.save();
  }

  return submission;
};
