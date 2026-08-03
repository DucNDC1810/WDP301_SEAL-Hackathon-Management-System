import { Card, Empty } from 'antd';
import { buildLeaderboardRows } from './poolLeaderboardRows.js';

const RANK_COLOR = { 1: '#facc15', 2: '#94a3b8', 3: '#cd7f32' };

export const PoolLeaderboardCard = ({ ranking, round, poolName, C }) => {
  const title = `Bảng xếp hạng${poolName ? ` — ${poolName}` : ''}`;

  if (!ranking?.board?.length) {
    return (
      <Card size="small" title={<span style={{ color: C.text2 }}>🏆 {title}</span>} style={{ background: C.card, borderColor: C.line }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: C.dim }}>Ban tổ chức chưa công bố xếp hạng vòng này</span>}
        />
      </Card>
    );
  }

  const rows = buildLeaderboardRows({
    board: ranking.board,
    topN: round?.top_n_advance ?? null,
    poolTeamCount: ranking.pool_team_count,
  });

  // The delta column is hidden entirely unless there is a previous round to compare against.
  const showDelta = ranking.delta_rank !== null && ranking.delta_rank !== undefined;

  return (
    <Card
      size="small"
      title={<span style={{ color: C.text2 }}>🏆 {title}</span>}
      styles={{ body: { padding: 0 } }}
      style={{ background: C.card, borderColor: C.line }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="w-[42px] px-4 py-2 text-left text-[10.5px] font-bold uppercase tracking-wide" style={{ color: C.dim }}>#</th>
              <th className="px-2 py-2 text-left text-[10.5px] font-bold uppercase tracking-wide" style={{ color: C.dim }}>Đội thi</th>
              <th className="w-[70px] px-2 py-2 text-right text-[10.5px] font-bold uppercase tracking-wide" style={{ color: C.dim }}>Điểm</th>
              {showDelta && (
                <th className="w-[90px] px-4 py-2 text-right text-[10.5px] font-bold uppercase tracking-wide" style={{ color: C.dim }}>Δ vòng trước</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.type === 'cutline' ? (
                <tr key="cutline">
                  <td colSpan={showDelta ? 4 : 3} className="px-4 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1" style={{ background: `${C.green}66` }} />
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.green }}>
                        vạch đi tiếp: top {row.topN}
                      </span>
                      <div className="h-px flex-1" style={{ background: `${C.green}66` }} />
                    </div>
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.rank_position}
                  style={{
                    borderTop: `1px solid ${C.line2}`,
                    background: row.is_mine ? 'rgba(0,212,255,.06)' : 'transparent',
                  }}
                >
                  <td className="px-4 py-2.5">
                    <span
                      className="text-[15px] font-bold"
                      style={{ fontFamily: "'Space Grotesk', sans-serif", color: RANK_COLOR[row.rank_position] || C.dim }}
                    >
                      {row.rank_position}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <span style={{ color: row.is_mine ? C.cyan : C.text2, fontWeight: row.is_mine ? 600 : 500 }}>
                      {row.team_name}
                    </span>
                    {row.is_mine && (
                      <span
                        className="ml-2 rounded px-2 py-0.5 text-[10px] font-semibold"
                        style={{ color: C.cyan, border: `1px solid ${C.cyan}59` }}
                      >
                        Đội bạn
                      </span>
                    )}
                  </td>
                  <td
                    className="px-2 py-2.5 text-right font-bold"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text2 }}
                  >
                    {row.final_score}
                  </td>
                  {showDelta && (
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ color: C.dim }}>
                      {row.is_mine
                        ? ranking.delta_rank > 0
                          ? `▲${ranking.delta_rank}`
                          : ranking.delta_rank < 0
                            ? `▼${Math.abs(ranking.delta_rank)}`
                            : '—'
                        : ''}
                    </td>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
