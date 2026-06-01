import crypto from "crypto";
import nodemailer from "nodemailer";
import Team from "../models/Team.js";
import Contest from "../models/Contest.js";
import User from "../models/User.js";

/**
 * Gửi email xác thực tham gia đội thi.
 */
export const sendVerifyEmail = async (email, full_name, token) => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/team-verify?token=${token}`;

  const mailOptions = {
    from: `"SEAL Hackathon" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Xác thực tham gia đội thi - SEAL Hackathon",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #007bff; text-align: center;">SEAL Hackathon</h2>
        <p>Chào <strong>${full_name || email}</strong>,</p>
        <p>Bạn đã được mời tham gia vào một đội thi trên hệ thống quản lý cuộc thi SEAL Hackathon.</p>
        <p>Vui lòng click vào nút bên dưới để xác nhận đồng ý tham gia đội thi (liên kết có giá trị trong vòng 24 giờ):</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Xác nhận tham gia
          </a>
        </div>
        <p>Nếu nút trên không hoạt động, bạn có thể sao chép liên kết dưới đây vào trình duyệt của mình:</p>
        <p style="word-break: break-all; color: #555;"><a href="${verifyUrl}">${verifyUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;"/>
        <p style="font-size: 12px; color: #888; text-align: center;">Đây là email tự động từ hệ thống SEAL Hackathon. Vui lòng không phản hồi lại email này.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

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
  for (const m of members) {
    const emailLower = m.email.toLowerCase();
    const isLeader = emailLower === leader.email.toLowerCase();

    // Tìm xem email này đã đăng ký tài khoản User chưa
    const memberUser = await User.findOne({ email: emailLower });

    const verifyToken = isLeader ? null : crypto.randomUUID();
    const verifyTokenExpires = isLeader
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ
    const emailVerified = isLeader;

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
      try {
        await sendVerifyEmail(
          member.email,
          member.full_name,
          member.verify_token
        );
      } catch (mailError) {
        console.error(`[Mail Error] Gửi mail xác nhận tới ${member.email} thất bại:`, mailError);
        // Trong môi trường dev, không ném lỗi ra ngoài làm sập luồng tạo team
      }
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
  // Tìm team có member tương ứng và token chưa hết hạn
  const team = await Team.findOne({
    members: {
      $elemMatch: {
        verify_token: token,
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
  const member = team.members.find((m) => m.verify_token === token);
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
 * Lấy danh sách đội thi theo cuộc thi.
 */
export const getTeamsByContest = async (contestId) => {
  const teams = await Team.find({ contest_id: contestId })
    .populate("leader_id", "full_name email")
    .populate("members.user_id", "full_name email")
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
