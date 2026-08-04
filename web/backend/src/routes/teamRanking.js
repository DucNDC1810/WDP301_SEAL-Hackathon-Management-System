import { Router } from "express";
import jwt from "jsonwebtoken";
import Round from "../models/Round.js";
import Score from "../models/Score.js";
import Team from "../models/Team.js";
import Contest from "../models/Contest.js";
import User from "../models/User.js";
import Chapter from "../models/Chapter.js";
import Season from "../models/Season.js";
import IndividualScore from "../models/IndividualScore.js";

// Giải mã token nếu có, không throw nếu thiếu/invalid
const tryGetUser = async (req) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    const payload = jwt.verify(header.split(" ")[1], process.env.JWT_ACCESS_SECRET);
    return await User.findById(payload.id).select("_id roles").lean();
  } catch {
    return null;
  }
};

const router = Router();

// GET /api/ranking/contests
// Admin : thấy tất cả contests + tất cả rounds
// User  : chỉ thấy contests mà họ có team tham gia,
//         và chỉ thấy các rounds đã scoring_locked
router.get("/contests", async (req, res, next) => {
  try {
    const caller = await tryGetUser(req);
    const isAdmin = caller?.roles?.some((r) => r.role_name === "admin");

    let allowedContestIds = null; // null = không giới hạn (admin)

    if (!isAdmin) {
      if (!caller) {
        // Chưa đăng nhập → không thấy gì
        return res.status(200).json({ success: true, data: [] });
      }
      // Lấy tất cả team user là thành viên hoặc leader
      const myTeams = await Team.find({
        $or: [
          { leader_id: caller._id },
          { "members.user_id": caller._id },
        ],
        status: { $in: ["ACTIVE", "CONFIRMED", "ELIMINATED", "DISQUALIFIED"] },
      }, "contest_id").lean();

      allowedContestIds = [...new Set(
        myTeams.map((t) => t.contest_id?.toString()).filter(Boolean)
      )];

      if (allowedContestIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
    }

    const query = isAdmin
      ? {}
      : { _id: { $in: allowedContestIds }, status: { $in: ["open", "closed"] } };

    const contests = await Contest.find(query, "title status start_date end_date rounds")
      .sort({ created_at: -1 })
      .lean();

    const result = contests.map((c) => {
      const rounds = (c.rounds || []).map((r) => ({
        _id: r._id,
        name: r.name,
        round_number: r.round_number,
        is_active: r.is_active,
        scoring_locked: r.scoring_locked,
        start_time: r.start_time,
        end_time: r.end_time,
      }));
      return {
        _id: c._id,
        title: c.title,
        status: c.status,
        start_date: c.start_date,
        end_date: c.end_date,
        rounds: isAdmin ? rounds : rounds.filter((r) => r.scoring_locked),
      };
    }).filter((c) => isAdmin || c.rounds.length > 0);

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/ranking/teams/:team_id/detail
// Chi tiết 1 team để hiển thị khi click từ bảng xếp hạng (public, không cần login).
// Chỉ trả các field an toàn để hiển thị công khai — không trả email/liên hệ.
router.get("/teams/:team_id/detail", async (req, res, next) => {
  try {
    const { team_id } = req.params;

    const team = await Team.findById(team_id)
      .populate("leader_id", "full_name avatar_url")
      .populate("members.user_id", "full_name avatar_url")
      .populate("topic_id", "title description difficulty")
      .lean();

    if (!team) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đội thi" });
    }

    const members = (team.members || []).map((m) => ({
      full_name: m.user_id?.full_name || m.full_name || "—",
      avatar_url: m.user_id?.avatar_url || null,
      role: m.role || "member",
      contribution_percentage: m.contribution_percentage ?? null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        team_id: team._id,
        team_name: team.team_name,
        status: team.status,
        assigned_group: team.assigned_group || "",
        topic: team.topic_id ? { title: team.topic_id.title, description: team.topic_id.description, difficulty: team.topic_id.difficulty } : null,
        leader: team.leader_id ? { full_name: team.leader_id.full_name, avatar_url: team.leader_id.avatar_url || null } : null,
        members,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/ranking/:round_id/teams
// Trả bảng xếp hạng team theo round. Chỉ hiển thị khi scoring_locked = true.
router.get("/:round_id/teams", async (req, res, next) => {
  try {
    const { round_id } = req.params;

    // 1. Tìm round: ưu tiên standalone Round model,
    //    nếu không có thì tìm trong Contest embedded rounds
    let roundName = null;
    let contestId = null;
    let scoringLocked = false;
    let contest = null;

    const standaloneRound = await Round.findById(round_id);

    if (standaloneRound) {
      // Có trong standalone collection
      roundName = standaloneRound.name;
      contestId = standaloneRound.contest_id;

      // Lấy scoring_locked từ embedded round trong Contest
      contest = await Contest.findById(contestId);
      if (contest?.rounds) {
        const embedded = contest.rounds.find((r) => r._id.toString() === round_id);
        scoringLocked = embedded?.scoring_locked === true;
        if (!roundName) roundName = embedded?.name;
      }
    } else {
      // Không có standalone → tìm trong Contest embedded rounds
      contest = await Contest.findOne({ "rounds._id": round_id });
      if (!contest) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy vòng thi",
        });
      }
      const embedded = contest.rounds.find((r) => r._id.toString() === round_id);
      roundName = embedded?.name;
      contestId = contest._id;
      scoringLocked = embedded?.scoring_locked === true;
    }

    // 2. Chỉ công bố khi scoring đã bị khóa — admin bypass
    if (!scoringLocked) {
      const user = await tryGetUser(req);
      const isAdmin = user?.roles?.some((r) => r.role_name === "admin");
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Kết quả chưa được công bố",
        });
      }
    }

    // 3. Lấy tất cả team ACTIVE trong contest này
    const teams = await Team.find({
      contest_id: contestId,
      status: { $in: ["ACTIVE", "CONFIRMED"] },
    });

    if (teams.length === 0) {
      return res.status(200).json({
        round_id,
        round_name: roundName,
        contest_name: contest?.title || "",
        teams: [],
      });
    }

    // 4. Lấy điểm NORMAL + is_final = true của round này
    const scores = await Score.find({
      round_id,
      score_type: "NORMAL",
      is_final: true,
    });

    // 5. Gom điểm theo team_id, tính trung bình weighted_avg_score
    const scoreMap = {};
    for (const score of scores) {
      const key = score.team_id.toString();
      if (!scoreMap[key]) scoreMap[key] = [];
      scoreMap[key].push(score.weighted_avg_score || 0);
    }

    // 6. Xây danh sách team có điểm final
    const teamList = [];
    for (const team of teams) {
      const teamScores = scoreMap[team._id.toString()];
      if (!teamScores || teamScores.length === 0) continue;

      const avg =
        teamScores.reduce((sum, v) => sum + v, 0) / teamScores.length;

      teamList.push({
        team_id: team._id,
        team_name: team.team_name || team.name || "Unknown",
        chapter: team.assigned_group || "",
        weighted_avg_score: Math.round(avg * 100) / 100,
      });
    }

    // 7. Sort DESC rồi gán rank
    teamList.sort((a, b) => b.weighted_avg_score - a.weighted_avg_score);
    const ranked = teamList.map((t, i) => ({ rank: i + 1, ...t }));

    return res.status(200).json({
      round_id,
      round_name: roundName,
      contest_name: contest?.title || "",
      teams: ranked,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/ranking/:round_id/chapters
// Bảng xếp hạng Chapter: best_team_score kỳ này + cumulative_score tích lũy
router.get("/:round_id/chapters", async (req, res, next) => {
  try {
    const { round_id } = req.params;

    // 1. Resolve round + contest (dùng lại logic tương tự /teams)
    let roundName = null;
    let contestId = null;
    let scoringLocked = false;
    let contest = null;

    const standaloneRound = await Round.findById(round_id);
    if (standaloneRound) {
      roundName = standaloneRound.name;
      contestId = standaloneRound.contest_id;
      contest = await Contest.findById(contestId);
      if (contest?.rounds) {
        const emb = contest.rounds.find((r) => r._id.toString() === round_id);
        scoringLocked = emb?.scoring_locked === true;
        if (!roundName) roundName = emb?.name;
      }
    } else {
      contest = await Contest.findOne({ "rounds._id": round_id });
      if (!contest) {
        return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
      }
      const emb = contest.rounds.find((r) => r._id.toString() === round_id);
      roundName = emb?.name;
      contestId = contest._id;
      scoringLocked = emb?.scoring_locked === true;
    }

    // 2. Gate: scoring_locked hoặc admin
    if (!scoringLocked) {
      const caller = await tryGetUser(req);
      const isAdmin = caller?.roles?.some((r) => r.role_name === "admin");
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: "Kết quả chưa được công bố" });
      }
    }

    // 3. Tìm season chứa contest này (nếu có)
    const season = await Season.findOne({ contest_ids: contestId }).lean();
    const seasonName = season?.name || contest?.title || roundName || "";

    // 4. Lấy teams ACTIVE + điểm final của round
    const teams = await Team.find({ contest_id: contestId, status: { $in: ["ACTIVE", "CONFIRMED"] } }).lean();

    const scores = await Score.find({
      round_id,
      score_type: "NORMAL",
      is_final: true,
    }).lean();

    // Gom điểm trung bình theo team
    const scoreMap = {};
    for (const s of scores) {
      const k = s.team_id.toString();
      if (!scoreMap[k]) scoreMap[k] = [];
      scoreMap[k].push(s.weighted_avg_score || 0);
    }
    const teamAvgMap = {};
    for (const [tid, vals] of Object.entries(scoreMap)) {
      teamAvgMap[tid] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    // 5. Group teams theo chapter (assigned_group), lấy best score
    const chapterMap = {}; // chapter_name → best_team_score
    for (const team of teams) {
      const chapterName = (team.assigned_group || "").trim();
      if (!chapterName) continue;
      const avg = teamAvgMap[team._id.toString()];
      if (avg === undefined) continue;
      if (chapterMap[chapterName] === undefined || avg > chapterMap[chapterName]) {
        chapterMap[chapterName] = avg;
      }
    }

    // 6. Load Chapter documents để lấy cumulative_score
    const chapterNames = Object.keys(chapterMap);
    const chapterDocs = await Chapter.find({ name: { $in: chapterNames } }).lean();
    const chapterDocMap = {};
    for (const doc of chapterDocs) {
      chapterDocMap[doc.name] = doc;
    }

    // 7. Build result list
    const chapterList = chapterNames.map((name) => {
      const doc = chapterDocMap[name];
      return {
        chapter_id: doc?._id || null,
        chapter_name: name,
        best_team_score_this_season: Math.round(chapterMap[name] * 100) / 100,
        cumulative_score: doc?.cumulative_score || 0,
      };
    });

    // Sort theo cumulative_score DESC, tie-break bằng best_team_score_this_season DESC
    chapterList.sort((a, b) =>
      b.cumulative_score !== a.cumulative_score
        ? b.cumulative_score - a.cumulative_score
        : b.best_team_score_this_season - a.best_team_score_this_season
    );

    const ranked = chapterList.map((c, i) => ({ rank: i + 1, ...c }));

    // 8. formula_defined: true khi có ít nhất 1 Chapter document với cumulative_score > 0
    const formulaDefined = chapterDocs.some((d) => d.cumulative_score > 0);

    return res.status(200).json({
      round_id,
      round_name: roundName,
      season_name: seasonName,
      formula_note: "Công thức tích lũy — Pending BTC #5",
      formula_defined: formulaDefined,
      chapters: ranked,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/ranking/:round_id/individuals
// Trả bảng xếp hạng cá nhân. Nếu contest chưa bật individual_ranking_enabled → { enabled: false }
router.get("/:round_id/individuals", async (req, res, next) => {
  try {
    const { round_id } = req.params;

    // 1. Resolve round → contest (same dual-storage logic)
    let roundName = null;
    let contestId = null;
    let scoringLocked = false;
    let contest = null;

    const standaloneRound = await Round.findById(round_id);
    if (standaloneRound) {
      roundName = standaloneRound.name;
      contestId = standaloneRound.contest_id;
      contest = await Contest.findById(contestId);
      if (contest?.rounds) {
        const emb = contest.rounds.find((r) => r._id.toString() === round_id);
        scoringLocked = emb?.scoring_locked === true;
        if (!roundName) roundName = emb?.name;
      }
    } else {
      contest = await Contest.findOne({ "rounds._id": round_id });
      if (!contest) {
        return res.status(404).json({ success: false, message: "Không tìm thấy vòng thi" });
      }
      const emb = contest.rounds.find((r) => r._id.toString() === round_id);
      roundName = emb?.name;
      contestId = contest._id;
      scoringLocked = emb?.scoring_locked === true;
    }

    // 2. Feature flag check
    if (!contest?.individual_ranking_enabled) {
      return res.status(200).json({ enabled: false });
    }

    // 3. Gate: scoring_locked hoặc admin
    if (!scoringLocked) {
      const caller = await tryGetUser(req);
      const isAdmin = caller?.roles?.some((r) => r.role_name === "admin");
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: "Kết quả chưa được công bố" });
      }
    }

    // 4. Season name
    const season = await Season.findOne({ contest_ids: contestId }).lean();
    const seasonName = season?.name || contest?.title || roundName || "";

    // 5. Load IndividualScore records cho contest này
    const individualScores = await IndividualScore.find({ contest_id: contestId })
      .populate("user_id", "full_name email assigned_group")
      .lean();

    // 6. Build list
    const list = individualScores.map((rec) => ({
      user_id: rec.user_id?._id,
      full_name: rec.user_id?.full_name || rec.user_id?.email || "Unknown",
      chapter: rec.user_id?.assigned_group || "",
      score_this_hackathon: rec.score_this_hackathon,
      cumulative_score: rec.cumulative_score,
    }));

    // 7. Sort cumulative DESC, tie-break score_this_hackathon DESC
    list.sort((a, b) =>
      b.cumulative_score !== a.cumulative_score
        ? b.cumulative_score - a.cumulative_score
        : b.score_this_hackathon - a.score_this_hackathon
    );

    const ranked = list.map((item, i) => ({ rank: i + 1, ...item }));

    return res.status(200).json({
      enabled: true,
      round_id,
      round_name: roundName,
      season_name: seasonName,
      individuals: ranked,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
