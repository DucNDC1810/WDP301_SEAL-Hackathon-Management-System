import Contest from '../models/Contest.js';
import Team from '../models/Team.js';
import JudgeAssignment from '../models/JudgeAssignment.js';
import MentorAssignment from '../models/MentorAssignment.js';
import { writeLog } from '../services/auditLog.js';
import { createBulkNotifications } from '../services/notificationService.js';

/**
 * Tự động đóng các contest có auto_close=true và registration_deadline đã qua.
 * Deactivate mọi round đang active của các contest này (cuộc thi đã đóng thì
 * không thể còn vòng thi "đang chạy"), rồi giải tán (xóa) toàn bộ đội thi.
 */
export const autoCloseContests = async () => {
  try {
    const contestsToClose = await Contest.find({
      status: 'open',
      auto_close: true,
      registration_deadline: { $lt: new Date() },
    });

    if (!contestsToClose.length) return;

    const contestIds = contestsToClose.map((c) => c._id);

    // Deactivate mọi round đang active — cuộc thi đóng thì không còn vòng nào "đang chạy" nữa.
    // Không tự khóa chấm điểm (scoring_locked) để admin vẫn xem lại/khóa thủ công sau.
    for (const contest of contestsToClose) {
      const activeRounds = contest.rounds.filter((r) => r.is_active);
      if (activeRounds.length === 0) continue;

      const recipientIds = new Set();
      for (const round of activeRounds) {
        round.is_active = false;

        const [judgeIds, mentorIds] = await Promise.all([
          JudgeAssignment.find({ contest_id: contest._id, round_id: round._id }).distinct('judge_id'),
          MentorAssignment.find({ contest_id: contest._id, round_id: round._id, status: 'accepted' }).distinct('mentor_id'),
        ]);
        [...judgeIds, ...mentorIds].forEach((id) => recipientIds.add(id.toString()));

        await writeLog({
          action: 'ROUND_AUTO_DEACTIVATED',
          actorId: null,
          targetId: round._id,
          targetModel: 'Round',
          detail: { contest_id: contest._id, reason: 'Contest tự động đóng do hết hạn đăng ký' },
        });
      }
      await contest.save();

      if (recipientIds.size > 0) {
        createBulkNotifications({
          user_ids: [...recipientIds],
          type: 'general',
          title: `Cuộc thi "${contest.title}" đã đóng`,
          message: `Cuộc thi "${contest.title}" đã tự động đóng. Các vòng thi đang chạy đã được dừng lại.`,
          ref_id: contest._id,
          ref_type: 'Contest',
        }).catch((e) => console.error('[AutoClose] notify error:', e));
      }
    }

    // Giải tán toàn bộ đội thuộc các contest này
    const teamResult = await Team.deleteMany({ contest_id: { $in: contestIds } });

    // Đóng các contest
    const result = await Contest.updateMany(
      { _id: { $in: contestIds } },
      { $set: { status: 'closed' } }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[AutoClose] Đã đóng ${result.modifiedCount} cuộc thi, giải tán ${teamResult.deletedCount} đội`
      );
    }
  } catch (err) {
    console.error('[AutoClose] Lỗi:', err.message);
  }
};
