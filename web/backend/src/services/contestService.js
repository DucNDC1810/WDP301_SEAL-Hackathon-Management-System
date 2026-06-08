import Contest from "../models/Contest.js";
import Pool from '../models/Pool.js';
import Team from '../models/Team.js';
import Topic from '../models/Topic.js';

/**
 * Tạo cuộc thi mới.
 */
export const createContest = async ({
  title,
  description,
  start_date,
  end_date,
  registration_deadline,
  auto_close,
  max_teams_per_pool,
  created_by,
}) => {
  // Validate date logic
  if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
    const err = new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    err.statusCode = 400;
    throw err;
  }

  if (registration_deadline && start_date && 
      new Date(registration_deadline) >= new Date(start_date)) {
    const err = new Error('Hạn đăng ký phải trước ngày bắt đầu cuộc thi');
    err.statusCode = 400;
    throw err;
  }

  if (registration_deadline && new Date(registration_deadline) <= new Date()) {
    const err = new Error('Hạn đăng ký không thể là thời điểm trong quá khứ');
    err.statusCode = 400;
    throw err;
  }

  const newContest = new Contest({
    title,
    description,
    start_date,
    end_date,
    registration_deadline,
    auto_close,
    max_teams_per_pool,
    created_by,
  });

  await newContest.save();
  return newContest;
};

/**
 * Lấy chi tiết cuộc thi theo ID.
 */
export const getContestById = async (contestId) => {
  const contest = await Contest.findById(contestId).populate("created_by", "full_name email");
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }
  return contest;
};

/**
 * Lấy tất cả các cuộc thi có bộ lọc.
 */
export const getAllContests = async (filters = {}) => {
  const query = {};
  if (filters.status) {
    query.status = filters.status;
  }

  const contests = await Contest.find(query)
    .populate("created_by", "full_name email")
    .sort({ created_at: -1 });

  return contests;
};

/**
 * Cập nhật thông tin cuộc thi.
 */
export const updateContest = async (contestId, updateData) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  const allowedUpdates = [
    "title",
    "description",
    "start_date",
    "end_date",
    "registration_deadline",
    "status",
    "auto_close",
    "max_teams_per_pool",
  ];

  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      contest[field] = updateData[field];
    }
  });

  await contest.save();
  return contest;
};

/**
 * Xóa cuộc thi.
 */
export const deleteContest = async (contestId) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error('Không tìm thấy cuộc thi để xóa');
    err.statusCode = 404;
    throw err;
  }

  // Kiểm tra không cho xoá contest đang "open"
  if (contest.status === 'open') {
    const err = new Error('Không thể xóa cuộc thi đang mở đăng ký. Hãy đóng cuộc thi trước.');
    err.statusCode = 400;
    throw err;
  }

  // Cascade delete theo thứ tự: Pool → Team → Topic → Contest
  await Pool.deleteMany({ contest_id: contestId });
  await Team.deleteMany({ contest_id: contestId });
  await Topic.deleteMany({ contest_id: contestId });
  await Contest.findByIdAndDelete(contestId);

  return contest;
};

/**
 * Thêm vòng thi mới vào cuộc thi.
 */
export const addRound = async (
  contestId,
  { round_number, name, start_time, end_time }
) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  const roundExists = contest.rounds.some(
    (r) => r.round_number === Number(round_number)
  );
  if (roundExists) {
    const err = new Error(`Vòng thi số ${round_number} đã tồn tại`);
    err.statusCode = 400;
    throw err;
  }

  contest.rounds.push({
    round_number: Number(round_number),
    name,
    start_time: start_time || null,
    end_time: end_time || null,
    score_criteria: [],
  });

  await contest.save();
  return contest.rounds[contest.rounds.length - 1];
};

/**
 * Thêm tiêu chí chấm điểm vào một vòng thi.
 */
export const addScoreCriteria = async (
  contestId,
  roundId,
  { name, max_score, weight, description }
) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  const round = contest.rounds.id(roundId);
  if (!round) {
    const err = new Error("Không tìm thấy vòng thi");
    err.statusCode = 404;
    throw err;
  }

  round.score_criteria.push({
    name,
    max_score: Number(max_score),
    weight: weight !== undefined ? Number(weight) : 1,
    description: description || "",
  });

  await contest.save();
  return round;
};
