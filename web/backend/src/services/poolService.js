import mongoose from "mongoose";
import Pool from "../models/Pool.js";
import Team from "../models/Team.js";
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
export const drawPools = async (contestId, { pool_count, round_id }) => {
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
      const err = new Error("Vòng đấu này đã được chia bảng. Vui lòng reset bảng đấu trước khi chia lại.");
      err.statusCode = 400;
      throw err;
    }

    const sortedRounds = [...contest.rounds].sort((a, b) => a.round_number - b.round_number);
    const roundIndex = sortedRounds.findIndex(r => r._id.toString() === targetRoundId.toString());

    let teams;
    if (roundIndex <= 0) {
      teams = await Team.find({ contest_id: contestId, status: "CONFIRMED" }).session(session);
    } else {
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

    if (teams.length < pool_count) {
      const err = new Error(`Không đủ đội để chia bảng (yêu cầu: ${pool_count}, hiện có: ${teams.length})`);
      err.statusCode = 400;
      throw err;
    }

    // Fisher-Yates shuffle
    const shuffledTeams = [...teams];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    const base = Math.floor(shuffledTeams.length / pool_count);
    const remainder = shuffledTeams.length % pool_count;

    const poolGroups = [];
    let currentIndex = 0;

    for (let p = 0; p < pool_count; p++) {
      const size = p < remainder ? base + 1 : base;
      poolGroups.push({
        pool_name: `Bảng ${String.fromCharCode(65 + p)}`,
        teams: shuffledTeams.slice(currentIndex, currentIndex + size),
      });
      currentIndex += size;
    }

    const poolsResult = [];

    for (let p = 0; p < pool_count; p++) {
      const group = poolGroups[p];

      const newPool = new Pool({
        contest_id: contestId,
        round_id: targetRoundId,
        pool_name: group.pool_name,
        teams: group.teams.map((t) => t._id),
        drive_link: "",
      });

      await newPool.save({ session });
      poolsResult.push(newPool);

      const teamIds = group.teams.map((t) => t._id);
      await Team.updateMany(
        { _id: { $in: teamIds } },
        { $set: { pool_id: newPool._id } },
        { session }
      );
    }

    const populatedPools = await Pool.find({ contest_id: contestId, round_id: targetRoundId })
      .populate("teams", "team_name status pool_id members")
      .session(session);

    await session.commitTransaction();
    return { pools: populatedPools };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Lấy danh sách bảng đấu của cuộc thi kèm đội.
 */
export const getPoolsByContest = async (contestId, roundId = null) => {
  const targetRoundId = roundId || await getDefaultRoundId(contestId);
  const pools = await Pool.find({ contest_id: contestId, round_id: targetRoundId })
    .populate("teams", "team_name status pool_id members");

  return pools;
};

/**
 * Xóa sạch tất cả bảng đấu và đặt lại trạng thái của đội thi.
 */
export const resetPools = async (contestId, roundId = null) => {
  const targetRoundId = roundId || await getDefaultRoundId(contestId);

  const poolsInRound = await Pool.find({ contest_id: contestId, round_id: targetRoundId });
  const teamIds = poolsInRound.flatMap(p => p.teams || []);

  if (teamIds.length > 0) {
    await Team.updateMany(
      { _id: { $in: teamIds } },
      { $set: { pool_id: null } }
    );
  }

  await Pool.deleteMany({ contest_id: contestId, round_id: targetRoundId });

  return { success: true };
};

/**
 * Tạo các bảng đấu trống ban đầu
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
          drive_link: (p.drive_link || "").trim(),
          teams: [],
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
          drive_link: "",
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
export const assignTeamsToExistingPools = async (contestId, { round_id }) => {
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

    const sortedRounds = [...contest.rounds].sort((a, b) => a.round_number - b.round_number);
    const roundIndex = sortedRounds.findIndex(r => r._id.toString() === targetRoundId.toString());

    let teams;
    if (roundIndex <= 0) {
      teams = await Team.find({ contest_id: contestId, status: "CONFIRMED" }).session(session);
    } else {
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

    const shuffledTeams = [...teams];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    const pool_count = existingPools.length;
    const base = Math.floor(shuffledTeams.length / pool_count);
    const remainder = shuffledTeams.length % pool_count;

    let currentIndex = 0;

    for (let p = 0; p < pool_count; p++) {
      const size = p < remainder ? base + 1 : base;
      const groupTeams = shuffledTeams.slice(currentIndex, currentIndex + size);
      const teamIds = groupTeams.map((t) => t._id);

      const pool = existingPools[p];
      pool.teams = teamIds;
      await pool.save({ session });

      await Team.updateMany(
        { _id: { $in: teamIds } },
        { $set: { pool_id: pool._id } },
        { session }
      );

      currentIndex += size;
    }

    const populatedPools = await Pool.find({ contest_id: contestId, round_id: targetRoundId })
      .populate("teams", "team_name status pool_id members")
      .session(session);

    await session.commitTransaction();
    return { pools: populatedPools };
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
export const addSinglePool = async (contestId, { pool_name, description, drive_link, round_id }) => {
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
    drive_link: (drive_link || "").trim(),
    teams: [],
  });

  await newPool.save();

  const populated = await Pool.findById(newPool._id)
    .populate("teams", "team_name status pool_id members");

  return populated;
};

/**
 * Cập nhật một bảng đấu (đổi tên, mô tả, link drive, danh sách đội)
 */
export const updatePool = async (poolId, { pool_name, description, drive_link, teams }) => {
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

    if (drive_link !== undefined) {
      pool.drive_link = drive_link.trim();
    }

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
      .populate("teams", "team_name status pool_id members");

    return populated;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Xóa một bảng đấu cụ thể.
 */
export const deleteSinglePool = async (poolId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pool = await Pool.findById(poolId).session(session);
    if (!pool) {
      const err = new Error("Không tìm thấy bảng đấu");
      err.statusCode = 404;
      throw err;
    }

    if (pool.teams && pool.teams.length > 0) {
      await Team.updateMany(
        { _id: { $in: pool.teams } },
        { $set: { pool_id: null } },
        { session }
      );
    }

    await Pool.findByIdAndDelete(poolId).session(session);
    await session.commitTransaction();
    return { success: true };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
