import * as chatService from "../services/chatService.js";
import { uploadToCloudinary } from "../middlewares/uploadMiddleware.js";

export const getTeamMentors = async (req, res) => {
  try {
    const { teamId } = req.params;
    // Kiểm tra user thuộc team này hoặc là admin
    const userRoles = req.user.roles.map((r) => r.role_name);
    if (!userRoles.includes("admin")) {
      const Team = (await import("../models/Team.js")).default;
      const team = await Team.findById(teamId).select("leader_id members");
      if (!team) return res.status(404).json({ success: false, message: "Không tìm thấy đội" });
      const userId = req.user._id.toString();
      const isLeader = team.leader_id?.toString() === userId;
      const isMember = team.members?.some((m) => m.user_id?.toString() === userId);
      if (!isLeader && !isMember) {
        return res.status(403).json({ success: false, message: "Bạn không thuộc đội này" });
      }
    }
    const mentors = await chatService.getTeamMentors(teamId, req.user._id);
    res.json({ success: true, data: mentors });
  } catch (err) {
    console.error("[getTeamMentors]", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const mentorId = req.user._id;
    const conversations = await chatService.getMentorConversations(mentorId);
    res.json({ success: true, data: conversations });
  } catch (err) {
    console.error("[getConversations]", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { contestId, roundId, teamId, mentorId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;
    const userRoles = req.user.roles.map((r) => r.role_name);

    const allowed = await chatService.canAccessChat(userId, userRoles, {
      contestId, roundId, teamId, mentorId,
    });
    if (!allowed) return res.status(403).json({ success: false, message: "Bạn không có quyền truy cập cuộc trò chuyện này" });

    // Mark as read
    await chatService.markMessagesRead({ contestId, roundId, teamId, mentorId, userId });

    const result = await chatService.getMessages({
      contestId, roundId, teamId, mentorId,
      page: Number(page),
      limit: Number(limit),
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[getMessages]", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { contestId, roundId, teamId, mentorId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    const userRoles = req.user.roles.map((r) => r.role_name);

    const hasContent = content?.trim();
    const hasFiles = req.files?.length > 0;
    if (!hasContent && !hasFiles) {
      return res.status(400).json({ success: false, message: "Tin nhắn phải có nội dung hoặc file đính kèm" });
    }

    const allowed = await chatService.canAccessChat(userId, userRoles, {
      contestId, roundId, teamId, mentorId,
    });
    if (!allowed) return res.status(403).json({ success: false, message: "Bạn không có quyền gửi tin nhắn" });

    const isOpen = await chatService.isRoundChatOpen(contestId, roundId);
    if (!isOpen) {
      return res.status(403).json({ success: false, message: "Cuộc trò chuyện đã đóng do kỳ thi đã kết thúc" });
    }

    // Upload files to Cloudinary
    const attachments = hasFiles
      ? await Promise.all(req.files.map((f) => uploadToCloudinary(f)))
      : [];

    const msg = await chatService.sendMessage({
      contestId, roundId, teamId, mentorId,
      senderId: userId,
      content: hasContent ? content.trim() : "",
      attachments,
    });

    // Emit socket event tới phòng chat
    const { getIO } = await import("../socket/index.js");
    const io = getIO();
    const room = `chat:${contestId}:${roundId}:${teamId}:${mentorId}`;
    io.to(room).emit("chat:message", msg);

    res.status(201).json({ success: true, data: msg });
  } catch (err) {
    console.error("[sendMessage]", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

export const checkChatStatus = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const isOpen = await chatService.isRoundChatOpen(contestId, roundId);
    res.json({ success: true, data: { isOpen } });
  } catch (err) {
    console.error("[checkChatStatus]", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
