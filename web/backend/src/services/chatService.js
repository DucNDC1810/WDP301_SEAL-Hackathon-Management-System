import ChatMessage from "../models/ChatMessage.js";
import MentorAssignment from "../models/MentorAssignment.js";
import Contest from "../models/Contest.js";

/**
 * Kiểm tra người dùng có quyền chat trong phòng này không.
 * - Mentor: phải được phân công cho team này trong round này
 * - Team member: phải thuộc team này
 */
export const canAccessChat = async (userId, userRoles, { contestId, roundId, teamId, mentorId }) => {
  const isMentor = userRoles.includes("mentor");

  if (isMentor) {
    const assignment = await MentorAssignment.findOne({
      contest_id: contestId,
      round_id: roundId,
      team_id: teamId,
      mentor_id: userId,
    });
    return !!assignment;
  }

  // Contestant/team member — kiểm tra thuộc team
  const Team = (await import("../models/Team.js")).default;
  const team = await Team.findById(teamId).select("leader_id members team_name");
  if (!team) return false;

  const isLeader = team.leader_id?.toString() === userId.toString();
  const isMember = team.members?.some((m) => m.user_id?.toString() === userId.toString());
  return isLeader || isMember;
};

/**
 * Kiểm tra round có còn active không (chat chỉ mở khi round chưa kết thúc).
 * Round kết thúc khi: contest closed HOẶC scoring_locked = true HOẶC is_active = false và round đã qua end_time
 */
export const isRoundChatOpen = async (contestId, roundId) => {
  const contest = await Contest.findById(contestId).select("status rounds");
  if (!contest) return false;
  if (contest.status === "closed") return false;

  const round = contest.rounds.find((r) => r._id.toString() === roundId.toString());
  if (!round) return false;

  // Nếu scoring đã bị lock hoặc round không còn active thì đóng chat
  if (round.scoring_locked) return false;
  if (!round.is_active) return false;

  return true;
};

export const getMessages = async ({ contestId, roundId, teamId, mentorId, page = 1, limit = 50 }) => {
  const skip = (page - 1) * limit;
  const messages = await ChatMessage.find({
    contest_id: contestId,
    round_id: roundId,
    team_id: teamId,
    mentor_id: mentorId,
  })
    .sort({ created_at: 1 })
    .skip(skip)
    .limit(limit)
    .populate("sender_id", "full_name email");

  const total = await ChatMessage.countDocuments({
    contest_id: contestId,
    round_id: roundId,
    team_id: teamId,
    mentor_id: mentorId,
  });

  return { messages, total, page, limit };
};

export const sendMessage = async ({ contestId, roundId, teamId, mentorId, senderId, content, attachments = [] }) => {
  const msg = await ChatMessage.create({
    contest_id: contestId,
    round_id: roundId,
    team_id: teamId,
    mentor_id: mentorId,
    sender_id: senderId,
    content: content || "",
    attachments,
    read_by: [senderId],
  });

  return await msg.populate("sender_id", "full_name email");
};

export const markMessagesRead = async ({ contestId, roundId, teamId, mentorId, userId }) => {
  await ChatMessage.updateMany(
    {
      contest_id: contestId,
      round_id: roundId,
      team_id: teamId,
      mentor_id: mentorId,
      read_by: { $ne: userId },
    },
    { $addToSet: { read_by: userId } }
  );
};

/** Lấy danh sách mentor được phân công cho một team (để team biết ai để chat) */
export const getTeamMentors = async (teamId, userId) => {
  const assignments = await MentorAssignment.find({ team_id: teamId })
    .populate("contest_id", "title status rounds")
    .populate("mentor_id", "full_name email");

  const result = await Promise.all(
    assignments.map(async (a) => {
      const contest = a.contest_id;
      const round = contest?.rounds?.find((r) => r._id.toString() === a.round_id.toString());

      const lastMsg = await ChatMessage.findOne({
        contest_id: a.contest_id._id,
        round_id: a.round_id,
        team_id: teamId,
        mentor_id: a.mentor_id._id,
      })
        .sort({ created_at: -1 })
        .select("content created_at sender_id");

      const unreadCount = userId
        ? await ChatMessage.countDocuments({
            contest_id: a.contest_id._id,
            round_id: a.round_id,
            team_id: teamId,
            mentor_id: a.mentor_id._id,
            read_by: { $ne: userId },
          })
        : 0;

      const chatOpen = contest.status !== "closed" && round && !round.scoring_locked && round.is_active;

      return {
        assignmentId: a._id,
        contestId: a.contest_id._id,
        contestTitle: contest.title,
        contestStatus: contest.status,
        roundId: a.round_id,
        roundName: round?.name || "—",
        roundActive: round?.is_active || false,
        roundLocked: round?.scoring_locked || false,
        teamId,
        mentorId: a.mentor_id._id,
        mentorName: a.mentor_id.full_name,
        mentorEmail: a.mentor_id.email,
        chatOpen,
        lastMessage: lastMsg || null,
      };
    })
  );

  return result;
};

/** Lấy danh sách các cuộc trò chuyện của mentor (gom nhóm theo contest/round/team) */
export const getMentorConversations = async (mentorId) => {
  const assignments = await MentorAssignment.find({ mentor_id: mentorId })
    .populate("contest_id", "title status start_date end_date rounds")
    .populate("team_id", "team_name leader_id members");

  const conversations = await Promise.all(
    assignments.map(async (a) => {
      const contest = a.contest_id;
      const round = contest?.rounds?.find((r) => r._id.toString() === a.round_id.toString());

      const lastMsg = await ChatMessage.findOne({
        contest_id: a.contest_id._id,
        round_id: a.round_id,
        team_id: a.team_id._id,
        mentor_id: mentorId,
      })
        .sort({ created_at: -1 })
        .select("content created_at sender_id");

      const unreadCount = await ChatMessage.countDocuments({
        contest_id: a.contest_id._id,
        round_id: a.round_id,
        team_id: a.team_id._id,
        mentor_id: mentorId,
        read_by: { $ne: mentorId },
      });

      const chatOpen = contest.status !== "closed" && round && !round.scoring_locked && round.is_active;

      return {
        assignmentId: a._id,
        contestId: a.contest_id._id,
        contestTitle: contest.title,
        contestStatus: contest.status,
        roundId: a.round_id,
        roundName: round?.name || "—",
        roundActive: round?.is_active || false,
        roundLocked: round?.scoring_locked || false,
        teamId: a.team_id._id,
        teamName: a.team_id.team_name,
        mentorId: mentorId,
        chatOpen,
        lastMessage: lastMsg || null,
        unreadCount,
      };
    })
  );

  return conversations;
};
