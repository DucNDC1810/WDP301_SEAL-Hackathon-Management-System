import Contest from '../models/Contest.js';
import Team from '../models/Team.js';

/**
 * Tự động đóng các contest có auto_close=true và registration_deadline đã qua.
 * Đồng thời giải tán (xóa) toàn bộ đội thi thuộc các contest vừa đóng.
 */
export const autoCloseContests = async () => {
  try {
    // Tìm trước các contest sắp bị đóng để cascade delete teams
    const contestsToClose = await Contest.find(
      {
        status: 'open',
        auto_close: true,
        registration_deadline: { $lt: new Date() },
      },
      '_id'
    ).lean();

    if (!contestsToClose.length) return;

    const contestIds = contestsToClose.map((c) => c._id);

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
console.error('[AutoClose] Lỗi:', err.message);
  }
};
