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
  kickoff_date,
  auto_close,
  max_teams_per_pool,
  min_team_size,
  max_team_size,
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

  if (min_team_size && max_team_size && Number(max_team_size) < Number(min_team_size)) {
    const err = new Error('Số thành viên tối đa phải lớn hơn hoặc bằng số thành viên tối thiểu');
    err.statusCode = 400;
    throw err;
  }

  const newContest = new Contest({
    title,
    description,
    start_date,
    end_date,
    registration_deadline,
    kickoff_date,
    auto_close,
    max_teams_per_pool,
    min_team_size,
    max_team_size,
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
    "kickoff_date",
    "status",
    "auto_close",
    "max_teams_per_pool",
    "min_team_size",
    "max_team_size",
    "rounds",
  ];

  // Ngày kết thúc thi thực tế: dùng giá trị mới nếu có trong request này, không thì lấy giá trị hiện tại.
  // start_date/kickoff_date chỉ là ngày khai mạc (phát áo, ăn uống, sự kiện mở màn) — KHÔNG có thi.
  // Cả 2 vòng đấu diễn ra trong đúng ngày end_date, nên hạn nộp bài của mọi round phải rơi đúng
  // vào ngày này, không được sớm hơn (rơi vào ngày kickoff) hay muộn hơn.
  const effectiveEndDate = updateData.end_date !== undefined ? updateData.end_date : contest.end_date;
  if (effectiveEndDate && Array.isArray(updateData.rounds)) {
    const examDate = new Date(effectiveEndDate);
    for (const r of updateData.rounds) {
      if (!r.submission_deadline) continue;
      const deadline = new Date(r.submission_deadline);
      const isSameDay =
        deadline.getFullYear() === examDate.getFullYear() &&
        deadline.getMonth() === examDate.getMonth() &&
        deadline.getDate() === examDate.getDate();
      if (!isSameDay) {
        const err = new Error(
          `Hạn nộp bài của vòng "${r.name || r.round_number}" phải rơi đúng vào ngày thi đấu chính thức (ngày kết thúc cuộc thi).`
        );
        err.statusCode = 400;
        throw err;
      }
    }
  }

  allowedUpdates.forEach((field) => {
    if (field === "rounds") {
      if (Array.isArray(updateData.rounds)) {
        // Update in-place to preserve subdocument IDs (_id) if match is found by round_number
        const updatedRounds = updateData.rounds.map((newRound) => {
          const existing = contest.rounds.find(
            (r) => r.round_number === newRound.round_number
          );
          if (existing) {
            existing.name = newRound.name || existing.name;
            existing.start_time = newRound.start_time !== undefined ? newRound.start_time : existing.start_time;
            existing.end_time = newRound.end_time !== undefined ? newRound.end_time : existing.end_time;
            existing.submission_deadline = newRound.submission_deadline !== undefined ? newRound.submission_deadline : existing.submission_deadline;
            existing.problem_released_at = newRound.problem_released_at !== undefined ? newRound.problem_released_at : existing.problem_released_at;
            existing.is_active = newRound.is_active !== undefined ? newRound.is_active : existing.is_active;
            existing.scoring_locked = newRound.scoring_locked !== undefined ? newRound.scoring_locked : existing.scoring_locked;
            existing.force_lock_reason = newRound.force_lock_reason !== undefined ? newRound.force_lock_reason : existing.force_lock_reason;
            existing.coding_duration_hours = newRound.coding_duration_hours !== undefined ? newRound.coding_duration_hours : existing.coding_duration_hours;
            existing.top_n_advance = newRound.top_n_advance !== undefined ? newRound.top_n_advance : existing.top_n_advance;
            existing.wildcard_enabled = newRound.wildcard_enabled !== undefined ? newRound.wildcard_enabled : existing.wildcard_enabled;

            // In-place update score criteria
            if (Array.isArray(newRound.score_criteria)) {
              const updatedCriteria = newRound.score_criteria.map((newCrit, critIdx) => {
                const existingCrit = existing.score_criteria[critIdx];
                if (existingCrit) {
                  existingCrit.name = newCrit.name || existingCrit.name;
                  existingCrit.max_score = newCrit.max_score !== undefined ? newCrit.max_score : existingCrit.max_score;
                  existingCrit.weight = newCrit.weight !== undefined ? newCrit.weight : existingCrit.weight;
                  existingCrit.description = newCrit.description !== undefined ? newCrit.description : existingCrit.description;
                  return existingCrit;
                }
                return newCrit;
              });
              existing.score_criteria = updatedCriteria;
            }
            return existing;
          }
          return newRound;
        });
        contest.rounds = updatedRounds;
      }
    } else if (updateData[field] !== undefined) {
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
