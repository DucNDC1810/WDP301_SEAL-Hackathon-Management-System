// Pure helpers for the overview endpoint. No DB access here so they stay testable.

// A user may only belong to one team in these statuses at a time.
// DISQUALIFIED and ELIMINATED are excluded on purpose: those are historical
// teams and must not block the user from joining a new one.
export const ACTIVE_TEAM_STATUSES = [
  "PENDING_MEMBERS",
  "ACTIVE",
  "WAITING_APPROVAL",
  "CONFIRMED",
  "REJECTED",
];

const toTime = (value) => (value ? new Date(value).getTime() : 0);

/**
 * Pick the team the overview should describe.
 * Returns a warning code when the data violates the one-active-team rule.
 */
export const selectActiveTeam = (teams) => {
  const list = Array.isArray(teams) ? teams : [];
  if (!list.length) return { team: null, warning: null };

  const active = list.filter((t) => ACTIVE_TEAM_STATUSES.includes(t.status));

  if (active.length === 1) return { team: active[0], warning: null };

  if (active.length > 1) {
    const newest = [...active].sort((a, b) => toTime(b.updated_at) - toTime(a.updated_at))[0];
    return { team: newest, warning: "multiple_active_teams" };
  }

  const newestFinished = [...list].sort((a, b) => toTime(b.created_at) - toTime(a.created_at))[0];
  return { team: newestFinished, warning: null };
};

/**
 * Keep only rounds whose scores are published, sorted by round_number ascending.
 */
export const buildScoreHistory = (results) => {
  if (!Array.isArray(results)) return [];
  return results
    .filter((r) => r.locked === true && r.total_score !== null && r.total_score !== undefined)
    .sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0))
    .map((r) => ({
      round_id: r.round_id,
      round_name: r.round_name,
      round_number: r.round_number,
      total_score: r.total_score,
      rank: r.rank ?? null,
      qualified: r.qualified ?? null,
      judge_count: r.judge_count ?? null,
      criteria: Array.isArray(r.criteria) ? r.criteria : [],
    }));
};

/**
 * Compare the two most recent published rounds.
 * delta_rank is positive when the team moved UP (rank_position decreased).
 */
export const computeDeltas = (scoreHistory) => {
  const history = Array.isArray(scoreHistory) ? scoreHistory : [];
  if (history.length < 2) return { delta_rank: null, delta_score: null };

  const previous = history[history.length - 2];
  const current = history[history.length - 1];

  const bothRanks = typeof previous.rank === "number" && typeof current.rank === "number";
  const bothScores =
    typeof previous.total_score === "number" && typeof current.total_score === "number";

  return {
    delta_rank: bothRanks ? previous.rank - current.rank : null,
    delta_score: bothScores ? current.total_score - previous.total_score : null,
  };
};

/**
 * Map team + contest progress onto one of the six overview states.
 */
export const resolveState = ({ team, activeRound = null, latestLockedRound = null } = {}) => {
  if (!team) return "no_team";

  const status = String(team.status || "").toUpperCase();

  if (status === "ELIMINATED" || status === "DISQUALIFIED") return "eliminated";
  if (status === "WAITING_APPROVAL" || status === "REJECTED" || status === "PENDING") {
    return "pending_approval";
  }
  if (!team.contest_id) return "forming";
  if (status === "PENDING_MEMBERS") return "forming";

  if (activeRound) return "competing";
  if (latestLockedRound) return "round_result";

  // Confirmed and registered, but the organiser has not started any round yet.
  return "pending_approval";
};
