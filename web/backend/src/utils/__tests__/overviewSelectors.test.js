import { describe, it, expect } from "vitest";
import {
  selectActiveTeam,
  buildScoreHistory,
  computeDeltas,
  resolveState,
} from "../overviewSelectors.js";

describe("selectActiveTeam", () => {
  it("returns null team when the user has no teams", () => {
    expect(selectActiveTeam([])).toEqual({ team: null, warning: null });
  });

  it("prefers the single active team over an eliminated one", () => {
    const teams = [
      { _id: "a", status: "ELIMINATED", created_at: "2026-07-01" },
      { _id: "b", status: "CONFIRMED", created_at: "2026-06-01" },
    ];
    expect(selectActiveTeam(teams).team._id).toBe("b");
  });

  it("falls back to the newest finished team when no team is active", () => {
    const teams = [
      { _id: "a", status: "ELIMINATED", created_at: "2026-07-01" },
      { _id: "b", status: "DISQUALIFIED", created_at: "2026-07-20" },
    ];
    expect(selectActiveTeam(teams).team._id).toBe("b");
  });

  it("flags multiple active teams and picks the most recently updated", () => {
    const teams = [
      { _id: "a", status: "CONFIRMED", updated_at: "2026-07-01" },
      { _id: "b", status: "ACTIVE", updated_at: "2026-07-25" },
    ];
    const result = selectActiveTeam(teams);
    expect(result.team._id).toBe("b");
    expect(result.warning).toBe("multiple_active_teams");
  });
});

describe("buildScoreHistory", () => {
  it("keeps only locked rounds that actually have a score, sorted by round_number", () => {
    const results = [
      { round_id: "r2", round_number: 2, locked: true, total_score: 80, rank: 3, criteria: [] },
      { round_id: "r1", round_number: 1, locked: true, total_score: 70, rank: 5, criteria: [] },
      { round_id: "r3", round_number: 3, locked: false },
      { round_id: "r4", round_number: 4, locked: true, total_score: null },
    ];
    const history = buildScoreHistory(results);
    expect(history.map((r) => r.round_id)).toEqual(["r1", "r2"]);
  });

  it("returns an empty array when results is not an array", () => {
    expect(buildScoreHistory(undefined)).toEqual([]);
  });
});

describe("computeDeltas", () => {
  it("returns nulls when there are fewer than two locked rounds", () => {
    expect(computeDeltas([{ rank: 3, total_score: 70 }])).toEqual({
      delta_rank: null,
      delta_score: null,
    });
  });

  it("reports a positive delta_rank when the team moved up", () => {
    // rank 5 -> rank 3 means the team improved by 2 positions
    const history = [
      { rank: 5, total_score: 70 },
      { rank: 3, total_score: 80 },
    ];
    expect(computeDeltas(history)).toEqual({ delta_rank: 2, delta_score: 10 });
  });

  it("reports a negative delta_rank when the team dropped", () => {
    const history = [
      { rank: 2, total_score: 90 },
      { rank: 6, total_score: 75 },
    ];
    expect(computeDeltas(history)).toEqual({ delta_rank: -4, delta_score: -15 });
  });

  it("returns nulls when either round is missing a rank", () => {
    const history = [
      { rank: null, total_score: 70 },
      { rank: 3, total_score: 80 },
    ];
    expect(computeDeltas(history).delta_rank).toBeNull();
  });
});

describe("resolveState", () => {
  it("returns no_team when there is no team", () => {
    expect(resolveState({ team: null })).toBe("no_team");
  });

  it("returns eliminated for a disqualified team", () => {
    expect(resolveState({ team: { status: "DISQUALIFIED" } })).toBe("eliminated");
  });

  it("returns pending_approval while waiting for admin", () => {
    expect(resolveState({ team: { status: "WAITING_APPROVAL" } })).toBe("pending_approval");
  });

  it("returns pending_approval when the team was rejected", () => {
    expect(resolveState({ team: { status: "REJECTED" } })).toBe("pending_approval");
  });

  it("returns forming for an active team with no contest", () => {
    expect(resolveState({ team: { status: "ACTIVE", contest_id: null } })).toBe("forming");
  });

  it("returns competing when a round is running", () => {
    const state = resolveState({
      team: { status: "CONFIRMED", contest_id: "c1" },
      activeRound: { _id: "r1" },
    });
    expect(state).toBe("competing");
  });

  it("returns round_result when no round is running but one is locked", () => {
    const state = resolveState({
      team: { status: "CONFIRMED", contest_id: "c1" },
      activeRound: null,
      latestLockedRound: { _id: "r1" },
    });
    expect(state).toBe("round_result");
  });

  it("falls back to pending_approval when the contest has not started any round yet", () => {
    const state = resolveState({
      team: { status: "CONFIRMED", contest_id: "c1" },
      activeRound: null,
      latestLockedRound: null,
    });
    expect(state).toBe("pending_approval");
  });

  it("returns forming for PENDING_MEMBERS status with an active contest", () => {
    expect(resolveState({ team: { status: "PENDING_MEMBERS", contest_id: "c1" } })).toBe(
      "forming"
    );
  });

  it("returns pending_approval for the legacy PENDING status", () => {
    expect(resolveState({ team: { status: "PENDING" } })).toBe("pending_approval");
  });

  it("returns eliminated for an eliminated team", () => {
    expect(resolveState({ team: { status: "ELIMINATED" } })).toBe("eliminated");
  });
});
