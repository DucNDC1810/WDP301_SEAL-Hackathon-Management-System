import Contest from '../models/Contest.js';

/**
 * Tự động đóng các contest có auto_close=true
 * và registration_deadline đã qua.
 */
export const autoCloseContests = async () => {
  try {
    const result = await Contest.updateMany(
      {
        status: 'open',
        auto_close: true,
        registration_deadline: { $lt: new Date() },
      },
      { $set: { status: 'closed' } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[AutoClose] Đã tự động đóng ${result.modifiedCount} cuộc thi`);
    }
  } catch (err) {
    console.error('[AutoClose] Lỗi:', err.message);
  }
};
