import crypto from "crypto";
import mongoose from "mongoose";
import Team from "../models/Team.js";
import Contest from "../models/Contest.js";
import User from "../models/User.js";
import Topic from "../models/Topic.js";
import { sendMemberInviteEmail } from "./emailService.js";
import { writeLog } from "./auditLog.js";
import { sendNotification } from "./notification.js";
import { triggerReRank } from "./roundService.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Đăng ký đội thi mới.
 */
export const createTeam = async (
  contestId,
  { team_name, leader_id, members }
) => {
  if (contestId) {
    // 1. Kiểm tra contest tồn tại và status === "open"
    const contest = await Contest.findById(contestId);
    if (!contest) {
      const err = new Error("Không tìm thấy cuộc thi");
      err.statusCode = 404;
      throw err;
    }
    if (contest.status !== "open") {
      const err = new Error("Cuộc thi hiện tại đang không mở đăng ký");
      err.statusCode = 400;
      throw err;
    }
  }

  // Lấy thông tin leader
  const leader = await User.findById(leader_id);
  if (!leader) {
    const err = new Error("Không tìm thấy thông tin trưởng nhóm");
    err.statusCode = 404;
    throw err;
  }

  // Kiểm tra leader chưa có team đang hoạt động
  const activeTeamQuery = {
    leader_id: leader_id,
    status: { $in: ["PENDING_MEMBERS", "ACTIVE", "WAITING_APPROVAL", "CONFIRMED"] }
  };
  const existingActiveTeam = await Team.findOne(activeTeamQuery);
  if (existingActiveTeam) {
    const err = new Error("Bạn đã tham gia hoặc làm trưởng nhóm của một đội thi khác đang hoạt động");
    err.statusCode = 400;
    throw err;
  }

  if (contestId) {
    // 2. Kiểm tra leader chưa có team trong contest này
    const existingTeam = await Team.findOne({
      contest_id: contestId,
      $or: [{ leader_id: leader_id }, { "members.user_id": leader_id }],
    });
    if (existingTeam) {
      const err = new Error("Bạn đã tham gia một đội thi khác trong cuộc thi này");
      err.statusCode = 400;
      throw err;
    }
  }

  // 3. Xử lý danh sách thành viên và sinh token xác thực
  const processedMembers = [];
  const rawTokenMap = new Map();

  const leaderEmail = leader.email.toLowerCase();
  const hasLeader = members.some((m) => m.email && m.email.toLowerCase() === leaderEmail);
  const allMembers = hasLeader ? [...members] : [{ email: leaderEmail }, ...members];

  for (const m of allMembers) {
    if (!m.email) continue;
    const emailLower = m.email.toLowerCase();
    const isLeader = emailLower === leaderEmail;

    // Tìm xem email này đã đăng ký tài khoản User chưa
    const memberUser = await User.findOne({ email: emailLower });

    const rawToken = isLeader ? null : crypto.randomUUID();
    const verifyToken = rawToken ? hashToken(rawToken) : null;
    const verifyTokenExpires = isLeader
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ
    const emailVerified = isLeader;

    if (rawToken) {
      rawTokenMap.set(emailLower, rawToken);
    }

    processedMembers.push({
      user_id: memberUser ? memberUser._id : null,
      email: emailLower,
      full_name: m.full_name || (memberUser ? memberUser.full_name : ""),
      email_verified: emailVerified,
      verify_token: verifyToken,
      verify_token_expires: verifyTokenExpires,
    });
  }

  // Tạo team mới
  const newTeam = new Team({
    contest_id: contestId,
    team_name,
    leader_id,
    members: processedMembers,
    status: "PENDING_MEMBERS",
  });

  await newTeam.save();

  // 4. Gửi email verify cho từng member (trừ leader đã được verify sẵn)
  for (const member of newTeam.members) {
    if (!member.email_verified && member.verify_token) {
      const rawToken = rawTokenMap.get(member.email);
      sendMemberInviteEmail(member.email, member.full_name, rawToken).catch((err) =>
        console.error(`[sendMemberInviteEmail] ${member.email}:`, err)
      );
    }
  }

  // 5. Nếu tất cả thành viên đã verified (ví dụ: chỉ có trưởng nhóm) thì confirm luôn
  const allVerified = newTeam.members.every((m) => m.email_verified);
  if (allVerified && newTeam.members.length > 0) {
    newTeam.status = contestId ? "WAITING_APPROVAL" : "ACTIVE";
    await newTeam.save();
  }

  return newTeam;
};

/**
 * Xác thực email của thành viên thông qua token.
 */
export const verifyMemberEmail = async (token) => {
  const hashedToken = hashToken(token);

  // Tìm team có member tương ứng và token chưa hết hạn
  const team = await Team.findOne({
    members: {
      $elemMatch: {
        verify_token: hashedToken,
        verify_token_expires: { $gt: new Date() },
      },
    },
  });

  if (!team) {
    const err = new Error("Đường dẫn xác thực không chính xác hoặc đã hết hạn");
    err.statusCode = 400;
    throw err;
  }

  // Cập nhật trạng thái verified của thành viên
  const member = team.members.find((m) => m.verify_token === hashedToken);
  if (member) {
    member.email_verified = true;
    member.verify_token = null;
    member.verify_token_expires = null;
  }

  // Kiểm tra nếu tất cả thành viên trong đội đều đã xác nhận thành công
  const allVerified = team.members.every((m) => m.email_verified);
  if (allVerified) {
    team.status = team.contest_id ? "WAITING_APPROVAL" : "ACTIVE";
  }

  await team.save();
  return team;
};

/**
 * Lấy danh sách đội thi của user hiện tại (là leader hoặc member).
 */
export const getMyTeams = async (userId, userEmail) => {
  return Team.find({
    $or: [
      { leader_id: userId },
      { "members.user_id": userId },
      { "members.email": userEmail },
    ],
  })
    .populate("leader_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card")
    .populate("members.user_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card")
    .populate("topic_id", "title description difficulty status admin_note resources")
    .populate("contest_id", "title description status start_date end_date")
    .sort({ created_at: -1 });
};

/**
 * Lấy danh sách đội thi theo cuộc thi, hỗ trợ filter status.
 */
export const getTeamsByContest = async (contestId, { status } = {}) => {
  const query = { contest_id: contestId };
  if (status) query.status = status;

  const teams = await Team.find(query)
    .populate("leader_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card")
    .populate("members.user_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card")
    .populate("topic_id", "title description difficulty status admin_note resources")
    .populate("contest_id", "title description status start_date end_date")
    .sort({ created_at: -1 });

  return teams;
};

/**
 * Lấy chi tiết đội thi.
 */
export const getTeamById = async (teamId) => {
  const team = await Team.findById(teamId)
    .populate("leader_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card")
    .populate("members.user_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card")
    .populate("topic_id", "title description difficulty status admin_note resources")
    .populate("contest_id", "title description status start_date end_date");

  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  return team;
};

/**
 * Loại đội thi khỏi cuộc thi (Disqualify).
 */
export const disqualifyTeam = async (teamId) => {
  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  team.status = "DISQUALIFIED";
  await team.save();
  return team;
};

/**
 * Lấy đội của user hiện tại trong một contest.
 */
export const getMyTeam = async (contestId, userId) => {
  const team = await Team.findOne({
    contest_id: contestId,
    $or: [{ leader_id: userId }, { "members.user_id": userId }],
  })
    .populate("leader_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card")
    .populate("members.user_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card")
    .populate("topic_id", "title description difficulty status admin_note resources")
    .populate("contest_id", "title description status start_date end_date");

  return team;
};

/**
 * Cập nhật tên đội (chỉ leader, khi status còn pending).
 */
export const updateTeam = async (teamId, leaderId, { team_name }) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    const err = new Error("Team ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  if (team.leader_id.toString() !== leaderId.toString()) {
    const err = new Error("Chỉ trưởng nhóm mới có thể cập nhật thông tin đội");
    err.statusCode = 403;
    throw err;
  }

  if (["DISQUALIFIED", "ELIMINATED"].includes(team.status)) {
    const err = new Error("Không thể cập nhật đội đã bị loại");
    err.statusCode = 400;
    throw err;
  }

  if (team_name) team.team_name = team_name.trim();
  await team.save();

  return Team.findById(teamId)
    .populate("leader_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card")
    .populate("members.user_id", "full_name email avatar_url profile_verify_status is_profile_complete student_id student_card");
};

/**
 * Xóa đội thi (chỉ leader hoặc admin, khi status còn PENDING_MEMBERS).
 */
export const deleteTeam = async (teamId, requesterId, isAdmin = false) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    const err = new Error("Team ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  if (!isAdmin && team.leader_id.toString() !== requesterId.toString()) {
    const err = new Error("Chỉ trưởng nhóm hoặc admin mới có thể xóa đội thi");
    err.statusCode = 403;
    throw err;
  }

  if (!isAdmin && team.status !== "PENDING_MEMBERS") {
    const err = new Error("Chỉ có thể xóa đội thi khi đang ở trạng thái chờ xác nhận thành viên");
    err.statusCode = 400;
    throw err;
  }

  await Team.findByIdAndDelete(teamId);
};

/**
 * Admin duyệt đội (WAITING_APPROVAL → CONFIRMED).
 */
export const approveTeam = async (teamId) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    const err = new Error("Team ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  if (team.status !== "WAITING_APPROVAL") {
    const err = new Error(`Đội hiện tại ở trạng thái "${team.status}", không thể duyệt`);
    err.statusCode = 400;
    throw err;
  }

  team.status = "CONFIRMED";
  await team.save();
  return team;
};

/**
 * Admin từ chối duyệt đội (WAITING_APPROVAL → WAITING_APPROVAL, gửi thông báo).
 */
export const rejectTeam = async (teamId, reason) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    const err = new Error("Team ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  if (team.status !== "WAITING_APPROVAL") {
    const err = new Error(`Đội hiện tại ở trạng thái "${team.status}", không thể từ chối`);
    err.statusCode = 400;
    throw err;
  }

  team.status = "REJECTED";
  await team.save();

  // Gửi notification đến tất cả thành viên trong đội
  const recipientIds = [];
  if (team.leader_id) recipientIds.push(team.leader_id.toString());
  if (team.members && team.members.length > 0) {
    team.members.forEach((m) => {
      if (m.user_id) recipientIds.push(m.user_id.toString());
    });
  }
  const uniqueRecipients = [...new Set(recipientIds)];

  const reasonText = reason && reason.trim() ? reason.trim() : "Không có lý do cụ thể";

  await sendNotification({
    recipientIds: uniqueRecipients,
    type: "general",
    payload: {
      title: "Đăng ký đội thi bị từ chối",
      message: `Đội "${team.team_name}" đã bị từ chối duyệt. Lý do: ${reasonText}. Bạn có thể chỉnh sửa và đăng ký lại.`,
      ref_id: team._id,
      ref_type: "Team",
    },
  });

  return team;
};

/**
 * Tham gia đội bằng mã đội (team_code = team._id).
 * User đã xác thực nên email_verified = true ngay.
 */
export const joinTeam = async (teamCode, userId, userEmail) => {
  if (!mongoose.Types.ObjectId.isValid(teamCode)) {
    const err = new Error("Mã đội không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamCode);
  if (!team) {
    const err = new Error("Không tìm thấy đội với mã này");
    err.statusCode = 404;
    throw err;
  }

  if (["DISQUALIFIED", "ELIMINATED"].includes(team.status)) {
    const err = new Error("Đội này không hoạt động hoặc đã bị loại");
    err.statusCode = 400;
    throw err;
  }

  const isLeader = team.leader_id.toString() === userId.toString();
  const isMember = team.members.some(
    (m) =>
      (m.user_id && m.user_id.toString() === userId.toString()) ||
      m.email === userEmail.toLowerCase()
  );
  if (isLeader || isMember) {
    const err = new Error("Bạn đã là thành viên của đội này");
    err.statusCode = 409;
    throw err;
  }

  // Kiểm tra user chưa có đội trong cùng contest
  const existingTeam = await Team.findOne({
    contest_id: team.contest_id,
    $or: [
      { leader_id: userId },
      { "members.user_id": userId },
      { "members.email": userEmail.toLowerCase() },
    ],
  });
  if (existingTeam) {
    const err = new Error("Bạn đã tham gia một đội khác trong cuộc thi này");
    err.statusCode = 409;
    throw err;
  }

  const joiner = await User.findById(userId);

  team.members.push({
    user_id: userId,
    email: userEmail.toLowerCase(),
    full_name: joiner?.full_name || "",
    email_verified: true,
    verify_token: null,
    verify_token_expires: null,
  });

  const allVerified = team.members.every((m) => m.email_verified);
  if (allVerified) {
    team.status = "WAITING_APPROVAL";
  }

  await team.save();
  return team;
};

/**
 * Gửi lại email xác nhận cho thành viên chưa verify.
 * Chỉ leader mới được thực hiện.
 */
export const resendMemberVerification = async (teamId, memberEmail, leaderId) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    const err = new Error("Team ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  if (team.leader_id.toString() !== leaderId.toString()) {
    const err = new Error("Chỉ trưởng nhóm mới có thể gửi lại email xác nhận");
    err.statusCode = 403;
    throw err;
  }

  const member = team.members.find(
    (m) => m.email === memberEmail.toLowerCase()
  );

  if (!member) {
    const err = new Error("Không tìm thấy thành viên với email này");
    err.statusCode = 404;
    throw err;
  }

  if (member.email_verified) {
    const err = new Error("Thành viên này đã xác nhận email rồi");
    err.statusCode = 409;
    throw err;
  }

  const rawToken = crypto.randomUUID();
  member.verify_token = hashToken(rawToken);
  member.verify_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await team.save();

  await sendMemberInviteEmail(member.email, member.full_name, rawToken);
};

/**
 * Mời thành viên mới vào đội.
 * Chỉ leader mới được thực hiện.
 */
export const inviteMember = async (teamId, inviteeEmail, leaderId) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    const err = new Error("Team ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  if (team.leader_id.toString() !== leaderId.toString()) {
    const err = new Error("Chỉ trưởng nhóm mới có thể mời thành viên");
    err.statusCode = 403;
    throw err;
  }

  const email = inviteeEmail.toLowerCase().trim();

  // Kiểm tra email tồn tại trong hệ thống
  const inviteeUser = await User.findOne({ email });
  if (!inviteeUser) {
    const err = new Error("Email này chưa đăng ký trong hệ thống");
    err.statusCode = 404;
    throw err;
  }

  // Kiểm tra đã có trong đội chưa
  const alreadyInTeam = team.members.some((m) => m.email === email);
  if (alreadyInTeam) {
    const err = new Error("Thành viên này đã có trong đội");
    err.statusCode = 409;
    throw err;
  }

  // Kiểm tra đã có trong đội khác trong cùng contest chưa
  const conflictTeam = await Team.findOne({
    _id: { $ne: teamId },
    contest_id: team.contest_id,
    "members.email": email,
  });
  if (conflictTeam) {
    const err = new Error("Người dùng này đã tham gia một đội khác trong cùng cuộc thi");
    err.statusCode = 409;
    throw err;
  }

  const rawToken = crypto.randomUUID();
  team.members.push({
    user_id: inviteeUser._id,
    email,
    full_name: inviteeUser.full_name || "",
    email_verified: false,
    verify_token: hashToken(rawToken),
    verify_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await team.save();
  await sendMemberInviteEmail(email, inviteeUser.full_name || email, rawToken);

  return team;
};

export const selectTopic = async (teamId, topicId, userId) => {
  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội");
    err.statusCode = 404;
    throw err;
  }

  if (team.leader_id.toString() !== userId.toString()) {
    const err = new Error("Chỉ trưởng nhóm mới có thể chọn đề tài");
    err.statusCode = 403;
    throw err;
  }

  const contest = await Contest.findById(team.contest_id);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  if (new Date() >= new Date(contest.start_date)) {
    const err = new Error("Không thể chọn đề tài sau khi contest đã bắt đầu");
    err.statusCode = 400;
    throw err;
  }

  if (team.topic_id) {
    const existingTopic = await Topic.findById(team.topic_id);
    if (existingTopic && existingTopic.status !== "rejected") {
      const err = new Error("Đội đã có đề tài");
      err.statusCode = 400;
      throw err;
    }
  }

  const topic = await Topic.findById(topicId);
  if (!topic) {
    const err = new Error("Không tìm thấy đề tài");
    err.statusCode = 404;
    throw err;
  }
  if (topic.status !== "active") {
    const err = new Error("Đề tài không khả dụng");
    err.statusCode = 400;
    throw err;
  }
  if (topic.is_assigned) {
    const err = new Error("Đề tài đã được chọn bởi đội khác");
    err.statusCode = 400;
    throw err;
  }
  if (topic.contest_id.toString() !== contest._id.toString()) {
    const err = new Error("Đề tài không thuộc cuộc thi này");
    err.statusCode = 400;
    throw err;
  }

  topic.is_assigned = true;
  await topic.save();

  team.topic_id = topic._id;
  await team.save();

  return topic;
};

export const proposeTopic = async (teamId, { title, description }, userId) => {
  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội");
    err.statusCode = 404;
    throw err;
  }

  if (team.leader_id.toString() !== userId.toString()) {
    const err = new Error("Chỉ trưởng nhóm mới có thể đề xuất đề tài");
    err.statusCode = 403;
    throw err;
  }

  const contest = await Contest.findById(team.contest_id);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  if (new Date() >= new Date(contest.start_date)) {
    const err = new Error("Không thể đề xuất đề tài sau khi contest đã bắt đầu");
    err.statusCode = 400;
    throw err;
  }

  if (team.topic_id) {
    const existingTopic = await Topic.findById(team.topic_id);
    if (existingTopic && existingTopic.status !== "rejected") {
      const err = new Error("Đội đã có đề tài đang xử lý");
      err.statusCode = 400;
      throw err;
    }
  }

  const newTopic = new Topic({
    contest_id: team.contest_id,
    title,
    description: description || "",
    status: "pending",
    proposed_by_team_id: teamId,
  });
  await newTopic.save();

  team.topic_id = newTopic._id;
  await team.save();

  return newTopic;
};

/**
 * Eliminates a team and triggers leaderboard re-rank.
 */
export const eliminateTeam = async (teamId, { reason }, actorId) => {
  if (!reason || !reason.trim()) {
    const err = new Error("Lý do loại đội thi là bắt buộc");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  team.status = "ELIMINATED";
  await team.save();

  await writeLog({
    action: "TEAM_ELIMINATE",
    actorId,
    targetId: team._id,
    targetModel: "Team",
    detail: { reason },
  });

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
      title: "Đội của bạn đã bị loại",
      message: `Đội "${team.team_name}" đã bị loại khỏi cuộc thi. Lý do: ${reason}`,
      ref_id: team._id,
      ref_type: "Team",
    },
  });

  const contest = await Contest.findById(team.contest_id);
  let activeRoundId = null;
  if (contest && contest.rounds) {
    const activeRound = contest.rounds.find((r) => r.is_active);
    if (activeRound) activeRoundId = activeRound._id;
  }

  await triggerReRank(team.contest_id, activeRoundId, team.pool_id);

  return team;
};

/**
 * Đăng ký đội vào cuộc thi.
 */
export const registerContest = async (teamId, contestId, userId) => {
  const team = await Team.findById(teamId)
    .populate("leader_id")
    .populate("members.user_id");
  if (!team) {
    const err = new Error("Không tìm thấy thông tin đội thi");
    err.statusCode = 404;
    throw err;
  }

  // Phải là leader mới được đăng ký
  if (team.leader_id._id.toString() !== userId.toString()) {
    const err = new Error("Chỉ trưởng nhóm mới có quyền đăng ký cuộc thi");
    err.statusCode = 403;
    throw err;
  }

  // Đội thi phải ở trạng thái ACTIVE hoặc REJECTED mới cho đăng ký
  if (!["ACTIVE", "REJECTED"].includes(team.status)) {
    const err = new Error("Trạng thái đội thi không hợp lệ để đăng ký cuộc thi");
    err.statusCode = 400;
    throw err;
  }

  // Phải có đủ 4 thành viên
  if (!team.members || team.members.length < 4) {
    const err = new Error(`Đội phải có đủ 4 thành viên để đăng ký cuộc thi (hiện có ${team.members?.length ?? 0} thành viên)`);
    err.statusCode = 400;
    throw err;
  }

  // Tất cả thành viên phải đã được admin duyệt thông tin (profile_verify_status === 'approved')
  const notJoined = team.members.filter(m => !m.user_id);
  if (notJoined.length > 0) {
    const err = new Error(`Có thành viên chưa đăng ký tài khoản hoặc chưa tham gia đội thi.`);
    err.statusCode = 400;
    throw err;
  }

  const unapproved = team.members.filter((m) => m.user_id.profile_verify_status !== "approved");
  if (unapproved.length > 0) {
    const err = new Error(`Còn ${unapproved.length} thành viên chưa được Admin phê duyệt thông tin cá nhân.`);
    err.statusCode = 400;
    throw err;
  }

  // Kiểm tra contest tồn tại và status === "open"
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }
  if (contest.status !== "open") {
    const err = new Error("Cuộc thi hiện tại đang không mở đăng ký");
    err.statusCode = 400;
    throw err;
  }

  // Kiểm tra xem leader và bất kỳ thành viên nào của đội đã tham gia đội khác trong contest này chưa
  const memberUserIds = team.members.map(m => m.user_id).filter(id => id);
  const memberEmails = team.members.map(m => m.email);

  const existingTeam = await Team.findOne({
    contest_id: contestId,
    _id: { $ne: team._id },
    $or: [
      { leader_id: { $in: [team.leader_id, ...memberUserIds] } },
      { "members.user_id": { $in: [team.leader_id, ...memberUserIds] } },
      { "members.email": { $in: memberEmails } }
    ]
  });

  if (existingTeam) {
    const err = new Error("Một hoặc nhiều thành viên trong đội của bạn đã tham gia một đội thi khác trong cuộc thi này");
    err.statusCode = 400;
    throw err;
  }

  // Cập nhật cuộc thi và chuyển trạng thái sang WAITING_APPROVAL
  team.contest_id = contestId;
  team.status = "WAITING_APPROVAL";

  await team.save();
  return team;
};

/**
 * Cập nhật đánh giá đóng góp của các thành viên (chỉ leader mới được thực hiện).
 */
export const updateTeamContributions = async (teamId, leaderId, contributions) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    const err = new Error("Team ID không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const err = new Error("Không tìm thấy đội thi");
    err.statusCode = 404;
    throw err;
  }

  if (team.leader_id.toString() !== leaderId.toString()) {
    const err = new Error("Chỉ trưởng nhóm mới có quyền đánh giá thành viên");
    err.statusCode = 403;
    throw err;
  }

  for (const item of contributions) {
    const member = team.members.find(m => m.email.toLowerCase() === item.email.toLowerCase());
    if (member) {
      if (typeof item.contribution_percentage === "number") {
        member.contribution_percentage = item.contribution_percentage;
      }
      if (typeof item.contribution_rating === "number") {
        member.contribution_rating = item.contribution_rating;
      }
      if (typeof item.contribution_note === "string") {
        member.contribution_note = item.contribution_note.trim();
      }
    }
  }

  await team.save();
  return team;
};
