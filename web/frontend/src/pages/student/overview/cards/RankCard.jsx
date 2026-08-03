import { Card, Empty, Tag } from 'antd';

const DeltaChip = ({ delta, C }) => {
  if (delta === null || delta === undefined) return null;
  if (delta === 0) return <span className="text-xs" style={{ color: C.dim }}>— giữ hạng</span>;
  const up = delta > 0;
  return (
    <span className="text-xs font-bold" style={{ color: up ? C.green : C.red }}>
      {up ? '▲' : '▼'}
      {Math.abs(delta)} so vòng trước
    </span>
  );
};

export const RankCard = ({ ranking, round, poolName, C }) => {
  if (!ranking) {
    return (
      <Card size="small" style={{ background: C.card, borderColor: C.line, borderTop: `2px solid ${C.gold}` }}>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.dim }}>
          Vị trí hiện tại
        </div>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-[13px]" style={{ color: C.dim }}>
              Ban tổ chức chưa công bố xếp hạng vòng này
            </span>
          }
        />
      </Card>
    );
  }

  const topN = round?.top_n_advance ?? null;
  const safe = ranking.qualified === true;

  return (
    <Card size="small" style={{ background: C.card, borderColor: C.line, borderTop: `2px solid ${C.gold}` }}>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.dim }}>
        Vị trí hiện tại
      </div>
      <div className="flex items-baseline gap-3">
        <span
          className="text-[40px] font-bold leading-none"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.gold }}
        >
          #{ranking.rank_position ?? '—'}
        </span>
        <DeltaChip delta={ranking.delta_rank} C={C} />
      </div>
      <div className="mt-3 text-[12.5px]" style={{ color: C.muted }}>
        {poolName ? (
          <>
            trong <span className="font-semibold" style={{ color: C.text2 }}>{poolName}</span>
            {ranking.pool_team_count ? ` (${ranking.pool_team_count} đội)` : ''} ·{' '}
          </>
        ) : null}
        <span className="font-semibold" style={{ color: C.text2 }}>{ranking.final_score ?? '—'}</span> điểm
      </div>
      {ranking.qualified !== null && ranking.qualified !== undefined && (
        <div className="mt-3">
          <Tag color={safe ? 'success' : 'default'}>
            {safe
              ? topN
                ? `Trong top ${topN} đi tiếp`
                : 'Đủ điều kiện đi tiếp'
              : 'Chưa nằm trong nhóm đi tiếp'}
          </Tag>
        </div>
      )}
    </Card>
  );
};
