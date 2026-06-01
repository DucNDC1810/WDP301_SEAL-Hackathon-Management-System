import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import TeamMember from "../models/TeamMember.js";
import Submission from "../models/Submission.js";
import {
  generateVerificationCode,
  sendVerificationEmail as sendVerificationEmailService,
} from "./emailService.js";

// ─── Email Verification ─────────────────────────────────────────────────────

/**
 * Gửi email xác thực cho contestant.
 * Tạo verification token (JWT) và gửi link xác thực qua email.
 * @param {string} userId - ID của contestant
 * @returns {Object} { email, verifyUrl }
 */
export const sendVerificationEmail = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Người dùng không tồn tại");
    err.statusCode = 404;
    throw err;
  }

  if (user.is_verified) {
    const err = new Error("Email của bạn đã được xác thực");
    err.statusCode = 400;
    throw err;
  }

  // Generate verification code (6 digits)
  const verificationCode = generateVerificationCode();

  // Generate verification token (JWT, expires in 1 hour)
  const verificationToken = jwt.sign(
    { userId, code: verificationCode },
    process.env.JWT_VERIFICATION_SECRET || process.env.JWT_ACCESS_SECRET,
    { expiresIn: "1h" },
  );

  // Save code to database (expires in 30 minutes)
  user.verification_code = verificationCode;
  user.verification_code_expires_at = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  // Generate verification URL
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  // Send email with code
  await sendVerificationEmailService(
    user.email,
    user.full_name,
    verificationCode,
  );

  return {
    email: user.email,
    verifyUrl,
  };
};

/**
 * Xác thực email bằng verification token.
 * @param {string} token - JWT verification token
 * @returns {Object} { message }
 */
export const verifyEmail = async (token) => {
  if (!token) {
    const err = new Error("Không tìm thấy verification token");
    err.statusCode = 400;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(
      token,
      process.env.JWT_VERIFICATION_SECRET || process.env.JWT_ACCESS_SECRET,
    );
  } catch (error) {
    const err = new Error("Verification token không hợp lệ hoặc đã hết hạn");
    err.statusCode = 400;
    throw err;
  }

  const { userId, code } = payload;
  const user = await User.findById(userId);

  if (!user) {
    const err = new Error("Người dùng không tồn tại");
    err.statusCode = 404;
    throw err;
  }

  if (user.is_verified) {
    const err = new Error("Email của bạn đã được xác thực");
    err.statusCode = 400;
    throw err;
  }

  // Check if code exists
  if (!user.verification_code) {
    const err = new Error("Chưa có mã xác thực nào được gửi");
    err.statusCode = 400;
    throw err;
  }

  // Check if code is expired
  if (new Date() > user.verification_code_expires_at) {
    const err = new Error("Mã xác thực đã hết hạn");
    err.statusCode = 400;
    throw err;
  }

  // Check if code matches
  if (user.verification_code !== code) {
    const err = new Error("Mã xác thực không đúng");
    err.statusCode = 400;
    throw err;
  }

  // Mark email as verified
  user.is_verified = true;
  user.verification_code = null;
  user.verification_code_expires_at = null;
  await user.save();

  return {
    message: "Email đã được xác thực thành công",
  };
};

// ─── Onboarding Status ──────────────────────────────────────────────────────

/**
 * Lấy trạng thái onboarding của contestant.
 * @param {string} userId - ID của contestant
 * @returns {Object} { is_verified, has_team, has_submission, team, submission }
 */
export const getOnboardingStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("Người dùng không tồn tại");
    err.statusCode = 404;
    throw err;
  }

  // Check if user is in any team
  let has_team = false;
  let teamInfo = null;
  let submissionInfo = null;
  
  // Need to import TeamMember. Since it might not be imported at the top, we use mongoose.models to be safe
  const TeamMember = mongoose.models.TeamMember || mongoose.model("TeamMember");
  const teamMemberships = await TeamMember.find({ user_id: userId }).populate({
    path: "team_id",
    populate: { path: "competition_id", select: "title status max_team_size" }
  });

  let teamsInfo = [];

  if (teamMemberships && teamMemberships.length > 0) {
    has_team = true;
    
    for (const membership of teamMemberships) {
      if (!membership.team_id) continue;
      
      const teamId = membership.team_id._id;
      // Fetch members for this team
      const teamMembers = await TeamMember.find({ team_id: teamId }).populate("user_id", "full_name github_username");
      
      // Check for submission for this team
      const submission = await Submission.findOne({ team_id: teamId });
      if (submission) {
        // Just keeping the last one found for backward compatibility, 
        // ideally we should attach submissions to their respective teams.
        submissionInfo = submission;
      }
      
      teamsInfo.push({
        _id: teamId,
        team_name: membership.team_id.team_name,
        competition: membership.team_id.competition_id,
        is_leader: membership.is_leader,
        is_checked_in: membership.is_checked_in,
        submission: submission || null,
        members: teamMembers.map(m => ({
          _id: m.user_id?._id,
          full_name: m.user_id?.full_name,
          github_username: m.user_id?.github_username || "",
          is_leader: m.is_leader,
        })),
      });
    }
  }

  return {
    is_verified: user.is_verified,
    has_team,
    has_submission: !!submissionInfo,
    submission: submissionInfo,
    team: teamsInfo[0] || null, // Keep for backward compatibility with ContestantDashboard
    teams: teamsInfo, // Array of all teams the user belongs to
    email: user.email,
    user: {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      avatar_url: user.avatar_url,
      github_username: user.github_username,
      github_link: user.github_link,
    },
  };
};
