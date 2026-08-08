import Contest from "../models/Contest.js";
import Pool from "../models/Pool.js";
import Submission from "../models/Submission.js";
import Ranking from "../models/Ranking.js";
import PresentationSlot from "../models/PresentationSlot.js";
import TeamInvitation from "../models/TeamInvitation.js";
import Notification from "../models/Notification.js";
import { getMyTeams } from "./teamService.js";
import { getMyTeamResults } from "./scoreService.js";
import { getTeamMentors } from "./chatService.js";
import { getTeamGitStats } from "./teamGitStatsService.js";
import { getRoundStatusKey } from "../utils/roundStatus.js";
import {
  selectActiveTeam,
  buildScoreHistory,
  computeDeltas,
  resolveState,
} from "../utils/overviewSelectors.js";

const NOTIFICATION_LIMIT = 5;
const LEADERBOARD_LIMIT = 5;

/** Run a block and record a warning code instead of failing the whole request. */
const safely = async (code, warnings, fn, fallback = null) => {
  try {
    return await fn();
  } catch (err) {
    console.error(`[overviewService] ${code}`, err.message);
    warnings.push(code);
    return fallback;
  }
};

const shapeMember = (m, leaderId) => ({
  email: m.email,
  full_name: m.full_name || m.user_id?.full_name || "",
  avatar_url: m.user_id?.avatar_url || "",
  email_verified: !!m.email_verified,
  profile_verify_status: m.user_id?.profile_verify_status || "unsubmitted",
  is_leader: String(m.user_id?._id ?? m.user_id ?? "") === String(leaderId ?? ""),
  contribution_percentage: m.contribution_percentage ?? 0,
  contribution_rating: m.contribution_rating ?? null,
  contribution_note: m.contribution_note || "",
});

const shapeRound = (round) => ({
  _id: round._id,
  name: round.name,
  round_number: round.round_number,
  start_time: round.start_time,
  submission_deadline: round.submission_deadline,
  problem_released_at: round.problem_released_at,
  coding_duration_hours: round.coding_duration_hours,
  top_n_advance: round.top_n_advance,
  wildcard_enabled: round.wildcard_enabled,
  drive_link: round.drive_link,
  scoring_locked: round.scoring_locked,
  status_key: getRoundStatusKey(round),
});

export const getOverviewForUser = async (user) => {
  const warnings = [];
  const userId = user._id;

  const teams = await getMyTeams(userId, user.email);
  const { team, warning } = selectActiveTeam(teams);
  if (warning) warnings.push(warning);

  const userBlock = {
    full_name: user.full_name,
    avatar_url: user.avatar_url || "",
    profile_verify_status: user.profile_verify_status || "unsubmitted",
    has_phone: !!user.phone,
    has_student_id: !!user.student_id,
    has_student_card: !!user.student_card,
  };

  const notifications = await safely(
    "notifications_unavailable",
    warnings,
    async () => {
      const [items, unread_count] = await Promise.all([
        Notification.find({ user_id: userId })
          .sort({ created_at: -1 })
          .limit(NOTIFICATION_LIMIT)
          .select("type title message created_at")
          .lean(),
        Notification.countDocuments({ user_id: userId, is_read: false }),
      ]);
      return { unread_count, items };
    },
    { unread_count: 0, items: [] }
  );

  // ── No team: only the onboarding blocks are relevant ──────────────────────
  if (!team) {
    const [invitations, openContests] = await Promise.all([
      safely("invitations_unavailable", warnings, () => listPendingInvitations(userId), []),
      safely("open_contests_unavailable", warnings, () => listOpenContests(), []),
    ]);
    return {
      state: "no_team",
      warnings,
      user: userBlock,
      team: null,
      contest: null,
      round: null,
      next_round: null,
      submission: null,
      ranking: null,
      score_history: [],
      presentation: null,
      mentors: [],
      notifications,
      invitations,
      open_contests: openContests,
      git: null,
    };
  }

  const contestId = team.contest_id?._id ?? team.contest_id ?? null;
  const contestDoc = contestId
    ? await safely("contest_unavailable", warnings, () => Contest.findById(contestId).lean())
    : null;

  const rounds = contestDoc?.rounds ?? [];
  const activeRound = rounds.find((r) => getRoundStatusKey(r) === "active") ?? null;
  const lockedRounds = rounds.filter((r) => r.scoring_locked);
  const latestLockedRound = lockedRounds.length
    ? [...lockedRounds].sort((a, b) => (b.round_number ?? 0) - (a.round_number ?? 0))[0]
    : null;
  const nextRound =
    !activeRound
      ? rounds
          .filter((r) => r.start_time && new Date(r.start_time).getTime() > Date.now())
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0] ?? null
      : null;

  const state = resolveState({ team, activeRound, latestLockedRound });
  const focusRound = activeRound ?? latestLockedRound ?? null;

  const orderedRounds = [...rounds].sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0));
  const isFinalRound =
    !!focusRound &&
    String(orderedRounds[orderedRounds.length - 1]?._id ?? "") === String(focusRound._id);

  const teamResults = contestId
    ? await safely("results_unavailable", warnings, () => getMyTeamResults(contestId, userId), null)
    : null;
  const scoreHistory = buildScoreHistory(teamResults?.results);
  const deltas = computeDeltas(scoreHistory);

  const poolId = team.pool_id?._id ?? team.pool_id ?? null;
  const pool = poolId
    ? await safely("pool_unavailable", warnings, () => Pool.findById(poolId).lean())
    : null;

  const [submission, ranking, presentation, mentors] = await Promise.all([
    focusRound
      ? safely("submission_unavailable", warnings, () =>
          Submission.findOne({ team_id: team._id, round_id: focusRound._id })
            .sort({ created_at: -1 })
            .lean()
        )
      : null,
    focusRound && contestId
      ? safely("rankings_unavailable", warnings, () =>
          buildRankingBlock({ contestId, round: focusRound, team, pool, deltas, isFinalRound })
        )
      : null,
    activeRound && contestId && activeRound.round_number > 1
      ? safely("presentation_unavailable", warnings, () =>
          buildPresentationBlock({ contestId, round: activeRound, team, pool })
        )
      : null,
    safely("mentors_unavailable", warnings, () => listMentors(team._id, userId), []),
  ]);

  const [invitations, openContests] = await Promise.all([
    state === "forming"
      ? safely("invitations_unavailable", warnings, () => listPendingInvitations(userId), [])
      : [],
    state === "forming"
      ? safely("open_contests_unavailable", warnings, () => listOpenContests(), [])
      : [],
  ]);

  const leaderId = team.leader_id?._id ?? team.leader_id;

  return {
    state,
    warnings,
    user: userBlock,
    team: {
      _id: team._id,
      team_name: team.team_name,
      status: team.status,
      pool_name: pool?.pool_name ?? null,
      pool_drive_link: poolId ? pool?.drive_link || null : focusRound?.drive_link || null,
      penalty_score: team.penalty_score ?? 0,
      tiebreak_status: team.tiebreak_status ?? null,
      created_at: team.created_at,
      updated_at: team.updated_at,
      is_leader: String(leaderId ?? "") === String(userId),
      members: (team.members ?? []).map((m) => shapeMember(m, leaderId)),
    },
    contest: contestDoc
      ? {
          _id: contestDoc._id,
          title: contestDoc.title,
          description: contestDoc.description,
          registration_deadline: contestDoc.registration_deadline,
          min_team_size: contestDoc.min_team_size,
          max_team_size: contestDoc.max_team_size,
          rounds_count: rounds.length,
          wildcard_enabled: contestDoc.wildcard_enabled,
        }
      : null,
    round: focusRound ? shapeRound(focusRound) : null,
    next_round: nextRound
      ? { _id: nextRound._id, name: nextRound.name, start_time: nextRound.start_time }
      : null,
    submission: submission
      ? {
          _id: submission._id,
          repo_url: submission.repo_url,
          slide_url: submission.slide_url,
          demo_url: submission.demo_url,
          is_accessible: submission.is_accessible,
          status: submission.status,
          submitted_at: submission.submitted_at,
          late_duration: submission.late_duration,
        }
      : null,
    ranking,
    score_history: scoreHistory,
    presentation,
    mentors,
    notifications,
    invitations,
    open_contests: openContests,
    // Cache-only on purpose: a dashboard load must never spend GitHub quota.
    // The Team page's endpoint is what warms this cache.
    git: focusRound
      ? await safely("git_unavailable", warnings, () =>
          getTeamGitStats({ teamId: team._id, roundId: focusRound._id, allowFetch: false })
        )
      : null,
  };
};

// ─── Block builders ──────────────────────────────────────────────────────────

const buildRankingBlock = async ({ contestId, round, team, pool, deltas, isFinalRound }) => {
  const query = { contest_id: contestId, round_id: round._id };
  if (pool?._id) query.board_id = pool._id;

  const rows = await Ranking.find(query).sort({ rank_position: 1 }).lean();
  if (!rows.length) return null;

  const mine = rows.find((r) => String(r.team_id) === String(team._id)) ?? null;

  const top = rows.slice(0, LEADERBOARD_LIMIT);
  const board = [...top];
  if (mine && !top.some((r) => String(r.team_id) === String(mine.team_id))) {
    board.push(mine);
  }

  return {
    rank_position: mine?.rank_position ?? null,
    final_score: mine?.final_score ?? null,
    qualified: mine?.qualified ?? null,
    is_final_round: isFinalRound,
    // rankingService currently derives the advance cut-off itself and ignores
    // round.top_n_advance, so the UI must mirror that same rule or the cut line
    // will contradict the `qualified` flag. Keep these two in sync until
    // rankingService is changed to read the configured value.
    effective_top_n: isFinalRound ? 3 : 6,
    pool_team_count: pool?.teams?.length ?? rows.length,
    delta_rank: deltas.delta_rank,
    delta_score: deltas.delta_score,
    board: board.map((r) => ({
      rank_position: r.rank_position,
      team_name: r.team_name,
      final_score: r.final_score,
      qualified: r.qualified,
      is_mine: String(r.team_id) === String(team._id),
    })),
  };
};

const buildPresentationBlock = async ({ contestId, round, team, pool }) => {
  const booked = await PresentationSlot.findOne({
    contest_id: contestId,
    round_id: round._id,
    booked_team_id: team._id,
  }).lean();

  const availableQuery = {
    contest_id: contestId,
    round_id: round._id,
    status: "available",
    booked_team_id: null,
  };
  if (pool?._id) availableQuery.pool_id = pool._id;
  const available_count = await PresentationSlot.countDocuments(availableQuery);

  return {
    booked: booked
      ? {
          _id: booked._id,
          start_time: booked.start_time,
          end_time: booked.end_time,
          room: booked.room,
          note: booked.note,
        }
      : null,
    available_count,
  };
};

// Reuse the chat service so `chatOpen` keeps one definition across the app:
// contest not closed AND round active AND scoring not locked. Re-deriving it
// here would drift the moment that rule changes.
const listMentors = async (teamId, userId) => {
  const rows = await getTeamMentors(teamId, userId);
  return rows.map((r) => ({
    mentorId: r.mentorId,
    mentorName: r.mentorName,
    mentorAvatar: r.mentorAvatar || "",
    chatOpen: r.chatOpen,
    lastMessage: r.lastMessage
      ? { content: r.lastMessage.content, created_at: r.lastMessage.created_at }
      : null,
  }));
};

const listPendingInvitations = async (userId) => {
  const rows = await TeamInvitation.find({
    invitee_user_id: userId,
    status: "pending",
    expires_at: { $gt: new Date() },
  })
    .populate("team_id", "team_name members")
    .populate("invited_by", "full_name")
    .populate("contest_id", "title")
    .sort({ created_at: -1 })
    .lean();
  return rows.map((r) => ({
    _id: r._id,
    team_name: r.team_id?.team_name ?? "Đội không tên",
    inviter_name: r.invited_by?.full_name ?? "Ai đó",
    contest_title: r.contest_id?.title ?? "",
    member_count: r.team_id?.members?.length ?? 0,
    created_at: r.created_at,
  }));
};

const listOpenContests = async () => {
  const rows = await Contest.find({ status: "open" })
    .select("title description registration_deadline min_team_size rounds")
    .lean();
  return rows.map((c) => ({
    _id: c._id,
    title: c.title,
    description: c.description,
    registration_deadline: c.registration_deadline,
    min_team_size: c.min_team_size,
    rounds_count: c.rounds?.length ?? 0,
  }));
};
