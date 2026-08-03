import { describe, it, expect } from 'vitest';
import { buildLeaderboardRows } from './poolLeaderboardRows.js';

const board = [
  { rank_position: 1, team_name: 'Zeta', final_score: 91, is_mine: false },
  { rank_position: 2, team_name: 'Nova', final_score: 85, is_mine: false },
  { rank_position: 3, team_name: 'Kappa', final_score: 80, is_mine: false },
  { rank_position: 4, team_name: 'Alpha', final_score: 78, is_mine: true },
];

describe('buildLeaderboardRows', () => {
  it('returns team rows unchanged when there is no cut line', () => {
    const rows = buildLeaderboardRows({ board, topN: null, poolTeamCount: 12 });
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.type === 'team')).toBe(true);
  });

  it('inserts a cut line after the top N row', () => {
    const rows = buildLeaderboardRows({ board, topN: 2, poolTeamCount: 12 });
    expect(rows[2]).toEqual({ type: 'cutline', topN: 2 });
    expect(rows[3].team_name).toBe('Kappa');
  });

  it('omits the cut line when every team in the pool advances', () => {
    const rows = buildLeaderboardRows({ board, topN: 12, poolTeamCount: 12 });
    expect(rows.some((r) => r.type === 'cutline')).toBe(false);
  });

  it('omits the cut line when it falls outside the visible rows', () => {
    const rows = buildLeaderboardRows({ board, topN: 6, poolTeamCount: 12 });
    expect(rows.some((r) => r.type === 'cutline')).toBe(false);
  });

  it('handles an empty board', () => {
    expect(buildLeaderboardRows({ board: [], topN: 6, poolTeamCount: 12 })).toEqual([]);
  });

  it('documents current behaviour when poolTeamCount is 0 (falsy, guard disabled)', () => {
    // pool_team_count can legitimately be 0 when a Pool exists with an empty
    // teams array. `poolTeamCount && topN >= poolTeamCount` short-circuits on
    // the falsy 0, so the "every team advances" guard never triggers here —
    // this pins that existing behaviour rather than changing it.
    const rows = buildLeaderboardRows({ board, topN: 2, poolTeamCount: 0 });
    expect(rows[2]).toEqual({ type: 'cutline', topN: 2 });
    expect(rows[3].team_name).toBe('Kappa');
  });

  it('omits the cut line when the boundary falls in a hidden gap', () => {
    const gapBoard = [
      { rank_position: 1, team_name: 'First', final_score: 100, is_mine: false },
      { rank_position: 2, team_name: 'Second', final_score: 95, is_mine: false },
      { rank_position: 3, team_name: 'Third', final_score: 90, is_mine: false },
      { rank_position: 4, team_name: 'Fourth', final_score: 85, is_mine: false },
      { rank_position: 5, team_name: 'Fifth', final_score: 80, is_mine: false },
      { rank_position: 20, team_name: 'OwnTeam', final_score: 50, is_mine: true },
    ];
    const rows = buildLeaderboardRows({ board: gapBoard, topN: 6, poolTeamCount: 12 });
    expect(rows.some((r) => r.type === 'cutline')).toBe(false);
  });
});
