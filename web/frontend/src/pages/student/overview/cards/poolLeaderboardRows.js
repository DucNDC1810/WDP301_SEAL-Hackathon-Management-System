/**
 * Interleave a "cut line" marker into the visible leaderboard rows.
 * The line is only meaningful when it actually separates two visible rows and
 * when not every team in the pool advances.
 */
export const buildLeaderboardRows = ({ board, topN, poolTeamCount }) => {
  const rows = (board ?? []).map((r) => ({ type: 'team', ...r }));
  if (!rows.length) return rows;
  if (!topN) return rows;
  if (poolTeamCount && topN >= poolTeamCount) return rows;

  const index = rows.findIndex((r) => r.rank_position > topN);
  if (index <= 0) return rows;

  return [...rows.slice(0, index), { type: 'cutline', topN }, ...rows.slice(index)];
};
