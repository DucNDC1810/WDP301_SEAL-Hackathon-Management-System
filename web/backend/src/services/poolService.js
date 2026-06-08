import mongoose from "mongoose";
import Pool from "../models/Pool.js";
import Team from "../models/Team.js";
import Topic from "../models/Topic.js";
import Contest from "../models/Contest.js";

/**
 * Thuật toán chia bảng ngẫu nhiên cho các đội thi trong cuộc thi.
 */
export const drawPools = async (contestId, { pool_count, assign_topics }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Kiểm tra cuộc thi tồn tại
    const contest = await Contest.findById(contestId).session(session);
    if (!contest) {
      const err = new Error("Không tìm thấy cuộc thi");
      err.statusCode = 404;
      throw err;
    }

    // Kiểm tra nếu đã chia bảng trước đó
    const existingPools = await Pool.findOne({ contest_id: contestId }).session(session);
    if (existingPools) {
      const err = new Error("Cuộc thi này đã được chia bảng. Vui lòng reset bảng đấu trước khi chia lại.");
      err.statusCode = 400;
      throw err;
    }

    // Lấy tất cả đội thi có trạng thái "confirmed"
    const teams = await Team.find({ contest_id: contestId, status: "confirmed" }).session(session);

    // 2. Kiểm tra điều kiện số đội >= số bảng đấu
    if (teams.length < pool_count) {
      const err = new Error("Không đủ đội để chia bảng");
      err.statusCode = 400;
      throw err;
    }

    // 3. Shuffle danh sách các đội bằng thuật toán Fisher-Yates
    const shuffledTeams = [...teams];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    // 4. Chia đều các đội vào các bảng đấu
    const base = Math.floor(shuffledTeams.length / pool_count);
    const remainder = shuffledTeams.length % pool_count;

    const poolGroups = [];
    let currentIndex = 0;

    for (let p = 0; p < pool_count; p++) {
      const size = p < remainder ? base + 1 : base;
      const groupTeams = shuffledTeams.slice(currentIndex, currentIndex + size);
      poolGroups.push({
        pool_name: `Bảng ${String.fromCharCode(65 + p)}`, // Bảng A, Bảng B, ...
        teams: groupTeams,
      });
      currentIndex += size;
    }

    // 5. Xử lý gán đề tài (assign_topics)
    let warningMessage = null;
    let shouldAssignTopics = assign_topics;
    let shuffledTopics = [];

    if (shouldAssignTopics) {
      const availableTopics = await Topic.find({
        contest_id: contestId,
        is_assigned: false,
      }).session(session);

      if (availableTopics.length < pool_count) {
        warningMessage = `Không đủ đề tài trống để gán cho các bảng đấu (yêu cầu: ${pool_count}, hiện có: ${availableTopics.length}). Đã bỏ qua bước gán đề tài.`;
        shouldAssignTopics = false;
      } else {
        // Shuffle topics bằng Fisher-Yates
        shuffledTopics = [...availableTopics];
        for (let i = shuffledTopics.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledTopics[i], shuffledTopics[j]] = [shuffledTopics[j], shuffledTopics[i]];
        }
      }
    }

    // 6. Tạo Pool documents và cập nhật các Team + Topic tương ứng
    const poolsResult = [];

    for (let p = 0; p < pool_count; p++) {
      const group = poolGroups[p];
      const assignedTopicId = shouldAssignTopics ? shuffledTopics[p]._id : null;

      // Lưu pool mới
      const newPool = new Pool({
        contest_id: contestId,
        pool_name: group.pool_name,
        teams: group.teams.map((t) => t._id),
        topic_id: assignedTopicId,
      });

      await newPool.save({ session });
      poolsResult.push(newPool);

      // Cập nhật pool_id và topic_id cho các đội thuộc bảng đấu này
      const teamIds = group.teams.map((t) => t._id);
      await Team.updateMany(
        { _id: { $in: teamIds } },
        {
          $set: {
            pool_id: newPool._id,
            topic_id: assignedTopicId,
          },
        },
        { session }
      );

      // Đánh dấu đề tài đã được giao
      if (shouldAssignTopics && assignedTopicId) {
        await Topic.findByIdAndUpdate(assignedTopicId, {
          $set: { is_assigned: true },
        }, { session });
      }
    }

    // Lấy chi tiết các bảng đấu sau khi tạo kèm populate dữ liệu đầy đủ
    const populatedPools = await Pool.find({ contest_id: contestId })
      .populate("teams", "team_name status pool_id topic_id")
      .populate("topic_id", "title")
      .session(session);

    await session.commitTransaction();
    return {
      pools: populatedPools,
      warning: warningMessage,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Lấy danh sách bảng đấu của cuộc thi kèm đội và đề tài.
 */
export const getPoolsByContest = async (contestId) => {
  const pools = await Pool.find({ contest_id: contestId })
    .populate("teams", "team_name status pool_id topic_id")
    .populate("topic_id", "title");

  return pools;
};

/**
 * Xóa sạch tất cả bảng đấu và đặt lại trạng thái của đội thi + đề tài.
 */
export const resetPools = async (contestId) => {
  // 1. Đặt pool_id và topic_id của tất cả đội thi trong cuộc thi về null
  await Team.updateMany(
    { contest_id: contestId },
    { $set: { pool_id: null, topic_id: null } }
  );

  // 2. Trả lại trạng thái chưa giao (is_assigned = false) cho tất cả đề tài của cuộc thi
  await Topic.updateMany(
    { contest_id: contestId },
    { $set: { is_assigned: false } }
  );

  // 3. Xóa toàn bộ bảng đấu của cuộc thi
  await Pool.deleteMany({ contest_id: contestId });

  return { success: true };
};
