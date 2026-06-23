import mongoose from "mongoose";
import Pool from "../models/Pool.js";
import Team from "../models/Team.js";
import Topic from "../models/Topic.js";
import Contest from "../models/Contest.js";

/**
 * Helper to resolve the default round ID for a contest (active round, or the first round)
 */
const getDefaultRoundId = async (contestId) => {
  const contest = await Contest.findById(contestId).lean();
  if (!contest || !contest.rounds || contest.rounds.length === 0) return null;
  const activeRound = contest.rounds.find(r => r.is_active);
  if (activeRound) return activeRound._id.toString();
  const sortedRounds = [...contest.rounds].sort((a, b) => a.round_number - b.round_number);
  return sortedRounds[0]._id.toString();
};

/**
 * Thuật toán chia bảng ngẫu nhiên cho các đội thi trong cuộc thi.
 */
export const drawPools = async (contestId, { pool_count, assign_topics, round_id }) => {
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

    const targetRoundId = round_id || await getDefaultRoundId(contestId);

    // Kiểm tra nếu đã chia bảng trước đó
    const existingPools = await Pool.findOne({ contest_id: contestId, round_id: targetRoundId }).session(session);
    if (existingPools) {
      const err = new Error("Vòng đấu này đã được chia bảng. Vui lòng reset bảng đấu trước khi chia lại.");
      err.statusCode = 400;
      throw err;
    }

    // Xác định đội thi hợp lệ cho vòng thi này
    const sortedRounds = [...contest.rounds].sort((a, b) => a.round_number - b.round_number);
    const roundIndex = sortedRounds.findIndex(r => r._id.toString() === targetRoundId.toString());

    let teams;
    if (roundIndex <= 0) {
      // Vòng 1: tất cả các đội thi đã CONFIRMED
      teams = await Team.find({ contest_id: contestId, status: "CONFIRMED" }).session(session);
    } else {
      // Vòng sau: chỉ lấy các đội qualified từ vòng trước
      const prevRound = sortedRounds[roundIndex - 1];
      const Ranking = mongoose.models.Ranking || mongoose.model("Ranking");
      const qualifiedRankings = await Ranking.find({
        contest_id: contestId,
        round_id: prevRound._id,
        qualified: true
      }).session(session);

      const qualifiedTeamIds = qualifiedRankings.map(r => r.team_id);
      teams = await Team.find({
        _id: { $in: qualifiedTeamIds },
        status: "CONFIRMED"
      }).session(session);
    }

    // 2. Kiểm tra điều kiện số đội >= số bảng đấu
    if (teams.length < pool_count) {
      const err = new Error(`Không đủ đội để chia bảng (yêu cầu: ${pool_count}, hiện có: ${teams.length})`);
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
        round_id: targetRoundId,
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
    const populatedPools = await Pool.find({ contest_id: contestId, round_id: targetRoundId })
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
export const getPoolsByContest = async (contestId, roundId = null) => {
  const targetRoundId = roundId || await getDefaultRoundId(contestId);
  const pools = await Pool.find({ contest_id: contestId, round_id: targetRoundId })
    .populate("teams", "team_name status pool_id topic_id")
    .populate("topic_id", "title");

  return pools;
};

/**
 * Xóa sạch tất cả bảng đấu và đặt lại trạng thái của đội thi + đề tài.
 */
export const resetPools = async (contestId, roundId = null) => {
  const targetRoundId = roundId || await getDefaultRoundId(contestId);

  const poolsInRound = await Pool.find({ contest_id: contestId, round_id: targetRoundId });
  const teamIds = poolsInRound.flatMap(p => p.teams || []);
  const topicIds = poolsInRound.map(p => p.topic_id).filter(Boolean);

  if (teamIds.length > 0) {
    await Team.updateMany(
      { _id: { $in: teamIds } },
      { $set: { pool_id: null, topic_id: null } }
    );
  }

  if (topicIds.length > 0) {
    await Topic.updateMany(
      { _id: { $in: topicIds } },
      { $set: { is_assigned: false } }
    );
  }

  await Pool.deleteMany({ contest_id: contestId, round_id: targetRoundId });

  return { success: true };
};

/**
 * Tạo các bảng đấu trống ban đầu (Chưa xếp đội)
 */
export const createEmptyPools = async (contestId, { pool_count, pools, round_id }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contest = await Contest.findById(contestId).session(session);
    if (!contest) {
      const err = new Error("Không tìm thấy cuộc thi");
      err.statusCode = 404;
      throw err;
    }

    const targetRoundId = round_id || await getDefaultRoundId(contestId);

    const existingPools = await Pool.findOne({ contest_id: contestId, round_id: targetRoundId }).session(session);
    if (existingPools) {
      const err = new Error("Giải đấu đã có bảng đấu trước đó ở vòng này. Vui lòng Reset trước khi tạo mới.");
      err.statusCode = 400;
      throw err;
    }

    const createdPools = [];
    if (pools && Array.isArray(pools) && pools.length > 0) {
      for (const p of pools) {
        if (!p.pool_name || !p.pool_name.trim()) {
          const err = new Error("Tên bảng đấu không được để trống.");
          err.statusCode = 400;
          throw err;
        }
        const newPool = new Pool({
          contest_id: contestId,
          round_id: targetRoundId,
          pool_name: p.pool_name.trim(),
          description: (p.description || "").trim(),
          teams: [],
          topic_id: null,
        });
        await newPool.save({ session });
        createdPools.push(newPool);
      }
    } else {
      const count = pool_count || 3;
      for (let p = 0; p < count; p++) {
        const newPool = new Pool({
          contest_id: contestId,
          round_id: targetRoundId,
          pool_name: `Bảng ${String.fromCharCode(65 + p)}`,
          teams: [],
          topic_id: null,
        });
        await newPool.save({ session });
        createdPools.push(newPool);
      }
    }

    await session.commitTransaction();
    return createdPools;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Xếp các đội đã CONFIRMED ngẫu nhiên và chia đều vào các bảng đấu hiện tại
 */
export const assignTeamsToExistingPools = async (contestId, { assign_topics, round_id }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contest = await Contest.findById(contestId).session(session);
    if (!contest) {
      const err = new Error("Không tìm thấy cuộc thi");
      err.statusCode = 404;
      throw err;
    }

    const targetRoundId = round_id || await getDefaultRoundId(contestId);

    const existingPools = await Pool.find({ contest_id: contestId, round_id: targetRoundId }).session(session);
    if (existingPools.length === 0) {
      const err = new Error("Chưa có bảng đấu nào được tạo sẵn. Vui lòng tạo bảng đấu trước.");
      err.statusCode = 400;
      throw err;
    }

    // Xác định đội thi hợp lệ cho vòng thi này
    const sortedRounds = [...contest.rounds].sort((a, b) => a.round_number - b.round_number);
    const roundIndex = sortedRounds.findIndex(r => r._id.toString() === targetRoundId.toString());

    let teams;
    if (roundIndex <= 0) {
      // Vòng 1: tất cả các đội thi đã CONFIRMED
      teams = await Team.find({ contest_id: contestId, status: "CONFIRMED" }).session(session);
    } else {
      // Vòng sau: chỉ lấy các đội qualified từ vòng trước
      const prevRound = sortedRounds[roundIndex - 1];
      const Ranking = mongoose.models.Ranking || mongoose.model("Ranking");
      const qualifiedRankings = await Ranking.find({
        contest_id: contestId,
        round_id: prevRound._id,
        qualified: true
      }).session(session);

      const qualifiedTeamIds = qualifiedRankings.map(r => r.team_id);
      teams = await Team.find({
        _id: { $in: qualifiedTeamIds },
        status: "CONFIRMED"
      }).session(session);
    }

    if (teams.length < existingPools.length) {
      const err = new Error(`Không đủ số đội thi để chia đều vào các bảng đấu (cần ít nhất ${existingPools.length} đội, hiện có ${teams.length} đội).`);
      err.statusCode = 400;
      throw err;
    }

    // Shuffle teams
    const shuffledTeams = [...teams];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    const pool_count = existingPools.length;
    const base = Math.floor(shuffledTeams.length / pool_count);
    const remainder = shuffledTeams.length % pool_count;

    let currentIndex = 0;

    // Deal with topics
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
        shuffledTopics = [...availableTopics];
        for (let i = shuffledTopics.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledTopics[i], shuffledTopics[j]] = [shuffledTopics[j], shuffledTopics[i]];
        }
      }
    }

    for (let p = 0; p < pool_count; p++) {
      const size = p < remainder ? base + 1 : base;
      const groupTeams = shuffledTeams.slice(currentIndex, currentIndex + size);
      const teamIds = groupTeams.map((t) => t._id);

      const pool = existingPools[p];
      const assignedTopicId = shouldAssignTopics ? shuffledTopics[p]._id : null;

      pool.teams = teamIds;
      if (assignedTopicId) {
        pool.topic_id = assignedTopicId;
      }
      await pool.save({ session });

      await Team.updateMany(
        { _id: { $in: teamIds } },
        {
          $set: {
            pool_id: pool._id,
            topic_id: assignedTopicId,
          },
        },
        { session }
      );

      if (shouldAssignTopics && assignedTopicId) {
        await Topic.findByIdAndUpdate(assignedTopicId, {
          $set: { is_assigned: true },
        }, { session });
      }

      currentIndex += size;
    }

    const populatedPools = await Pool.find({ contest_id: contestId, round_id: targetRoundId })
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
 * Thêm một bảng đấu đơn lẻ vào cuộc thi
 */
export const addSinglePool = async (contestId, { pool_name, description, round_id }) => {
  if (!pool_name || !pool_name.trim()) {
    const err = new Error("Tên bảng đấu không được để trống.");
    err.statusCode = 400;
    throw err;
  }

  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  const targetRoundId = round_id || await getDefaultRoundId(contestId);

  const newPool = new Pool({
    contest_id: contestId,
    round_id: targetRoundId,
    pool_name: pool_name.trim(),
    description: (description || "").trim(),
    teams: [],
    topic_id: null,
  });

  await newPool.save();

  // Populate data
  const populated = await Pool.findById(newPool._id)
    .populate("teams", "team_name status pool_id topic_id")
    .populate("topic_id", "title");

  return populated;
};

/**
 * Cập nhật một bảng đấu (đổi tên, mô tả, đề tài, danh sách đội)
 */
export const updatePool = async (poolId, { pool_name, description, teams, topic_id }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pool = await Pool.findById(poolId).session(session);
    if (!pool) {
      const err = new Error("Không tìm thấy bảng đấu");
      err.statusCode = 404;
      throw err;
    }

    if (pool_name !== undefined) {
      if (!pool_name.trim()) {
        const err = new Error("Tên bảng đấu không được để trống.");
        err.statusCode = 400;
        throw err;
      }
      pool.pool_name = pool_name.trim();
    }

    if (description !== undefined) {
      pool.description = description.trim();
    }

    // Xử lý thay đổi đề tài
    if (topic_id !== undefined) {
      const oldTopicId = pool.topic_id;
      if (oldTopicId && oldTopicId.toString() !== (topic_id ? topic_id.toString() : "")) {
        await Topic.findByIdAndUpdate(oldTopicId, { $set: { is_assigned: false } }, { session });
      }
      if (topic_id) {
        await Topic.findByIdAndUpdate(topic_id, { $set: { is_assigned: true } }, { session });
        pool.topic_id = topic_id;
      } else {
        pool.topic_id = null;
      }
    }

    // Xử lý thay đổi danh sách đội thi
    if (teams !== undefined && Array.isArray(teams)) {
      const oldTeams = pool.teams.map(id => id.toString());
      const newTeams = teams.map(id => id.toString());

      const removedTeams = oldTeams.filter(id => !newTeams.includes(id));
      const addedTeams = newTeams.filter(id => !oldTeams.includes(id));

      if (removedTeams.length > 0) {
        await Team.updateMany(
          { _id: { $in: removedTeams } },
          { $set: { pool_id: null } },
          { session }
        );
      }

      if (addedTeams.length > 0) {
        // Loại bỏ các đội này khỏi bảng đấu khác trong cùng vòng đấu (nếu có)
        const otherPools = await Pool.find({
          contest_id: pool.contest_id,
          round_id: pool.round_id,
          _id: { $ne: poolId },
          teams: { $in: addedTeams }
        }).session(session);

        for (const op of otherPools) {
          op.teams = op.teams.filter(tid => !addedTeams.includes(tid.toString()));
          await op.save({ session });
        }

        await Team.updateMany(
          { _id: { $in: addedTeams } },
          { $set: { pool_id: poolId } },
          { session }
        );
      }

      pool.teams = newTeams;
    }

    await pool.save({ session });
    await session.commitTransaction();

    const populated = await Pool.findById(poolId)
      .populate("teams", "team_name status pool_id topic_id")
      .populate("topic_id", "title");

    return populated;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
