import crypto from "crypto";
import mongoose from "mongoose";
import Team from "../models/Team.js";
import Contest from "../models/Contest.js";
import User from "../models/User.js";
import { sendMemberInviteEmail } from "./emailService.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Đăng ký đội thi mới.
 */
export const createTeam = async (
  contestId,
  { team_name, leader_id, members }
) => {
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

  // Lấy thông tin leader
  const leader = await User.findById(leader_id);
  if (!leader) {
    const err = new Error("Không tìm thấy thông tin trưởng nhóm");
    err.statusCode = 404;
    throw err;
  }

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

  // 3. Xử lý danh sách thành viên và sinh token xác thực
  const processedMembers = [];
  const rawTokenMap = new Map();

  for (const m of members) {
    const emailLower = m.email.toLowerCase();
    const isLeader = emailLower === leader.email.toLowerCase();

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
    status: "pending",
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
    newTeam.status = "confirmed";
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
    team.status = "confirmed";
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
    .populate("leader_id", "full_name email")
    .populate("members.user_id", "full_name email")
    .populate("topic_id", "title")
    .sort({ created_at: -1 });
};

/**
 * Lấy danh sách đội thi theo cuộc thi, hỗ trợ filter status.
 */
export const getTeamsByContest = async (contestId, { status } = {}) => {
  const query = { contest_id: contestId };
  if (status) query.status = status;

  const teams = await Team.find(query)
    .populate("leader_id", "full_name email avatar_url")
    .populate("members.user_id", "full_name email avatar_url")
    .populate("topic_id", "title")
    .sort({ created_at: -1 });

  return teams;
};

/**
 * Lấy chi tiết đội thi.
 */
export const getTeamById = async (teamId) => {
  const team = await Team.findById(teamId)
    .populate("leader_id", "full_name email")
    .populate("members.user_id", "full_name email")
    .populate("topic_id", "title");

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

  team.status = "disqualified";
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
    .populate("leader_id", "full_name email avatar_url")
    .populate("members.user_id", "full_name email avatar_url")
    .populate("topic_id", "title");

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

  if (team.status === "disqualified") {
    const err = new Error("Không thể cập nhật đội đã bị loại");
    err.statusCode = 400;
    throw err;
  }

  if (team_name) team.team_name = team_name.trim();
  await team.save();

  return Team.findById(teamId)
    .populate("leader_id", "full_name email avatar_url")
    .populate("members.user_id", "full_name email avatar_url");
};

/**
 * Xóa đội thi (chỉ leader hoặc admin, khi status còn pending).
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

  if (!isAdmin && team.status !== "pending") {
    const err = new Error("Chỉ có thể xóa đội thi khi đang ở trạng thái chờ xác nhận");
    err.statusCode = 400;
    throw err;
  }

  await Team.findByIdAndDelete(teamId);
};

/**
 * Admin duyệt đội (pending → confirmed).
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

  if (team.status !== "pending") {
    const err = new Error(`Đội hiện tại ở trạng thái "${team.status}", không thể duyệt`);
    err.statusCode = 400;
    throw err;
  }

  team.status = "confirmed";
  await team.save();
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

  if (team.status === "disqualified") {
    const err = new Error("Đội này đã bị loại khỏi cuộc thi");
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
