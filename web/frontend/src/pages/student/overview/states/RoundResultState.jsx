import { Card, Statistic, Tag } from 'antd';
import { PoolLeaderboardCard } from '../cards/PoolLeaderboardCard.jsx';
import { ScoreTrendChart } from '../cards/ScoreTrendChart.jsx';
import { CriteriaRadarChart } from '../cards/CriteriaRadarChart.jsx';
import { NewsCard } from '../cards/NewsCard.jsx';
import { CountdownCard } from '../cards/CountdownCard.jsx';

export const RoundResultState = ({ data, C }) => {
  const { ranking, round, contest, team, score_history: history = [] } = data;
  const latest = history[history.length - 1] ?? null;

  const qualified = ranking?.qualified;
  const isFinal = ranking?.is_final_round === true;
  const wildcard = round?.wildcard_enabled === true;

  let headline = 'Kết quả vòng thi';
  if (qualified === true) headline = isFinal ? '🎉 Hoàn thành chung kết' : '🎉 Đi tiếp vòng sau';
  if (qualified === false) headline = 'Dừng lại ở vòng này';

  return (
    <div className="flex flex-col gap-4">
      <Card
        style={{
          background: C.card,
          borderColor: C.line,
          borderTop: `2px solid ${qualified === false ? C.dim : C.green}`,
        }}
      >
        <div className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }}>
          {headline}
        </div>
        <div className="mt-1 text-[13px]" style={{ color: C.muted }}>
          {round?.name}
          {contest?.title ? ` · ${contest.title}` : ''}
        </div>

        <div className="mt-5 flex flex-wrap gap-10">
          <Statistic
            title={<span style={{ color: C.dim }}>Hạng</span>}
            value={ranking?.rank_position ?? latest?.rank ?? '—'}
            prefix="#"
            valueStyle={{ color: C.gold, fontFamily: "'Space Grotesk', sans-serif" }}
          />
          <Statistic
            title={<span style={{ color: C.dim }}>Tổng điểm</span>}
            value={ranking?.final_score ?? latest?.total_score ?? '—'}
            valueStyle={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}
          />
          <Statistic
            title={<span style={{ color: C.dim }}>Giám khảo chấm</span>}
            value={latest?.judge_count ?? '—'}
            valueStyle={{ color: C.text2, fontFamily: "'Space Grotesk', sans-serif" }}
          />
          {team?.pool_name && (
            <Statistic
              title={<span style={{ color: C.dim }}>Bảng đấu</span>}
              value={team.pool_name}
              valueStyle={{ color: C.cyan, fontSize: 20 }}
            />
          )}
        </div>

        {qualified === false && wildcard && (
          <Tag className="mt-4" color="warning">
            Vẫn còn cơ hội qua vòng vớt
          </Tag>
        )}
      </Card>

      {data.next_round && (
        <CountdownCard round={null} nextRound={data.next_round} submission={null} C={C} />
      )}

      <PoolLeaderboardCard ranking={ranking} round={round} poolName={team?.pool_name} C={C} warnings={data.warnings ?? []} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreTrendChart scoreHistory={history} C={C} />
        <CriteriaRadarChart scoreHistory={history} C={C} />
      </div>

      <NewsCard notifications={data.notifications} C={C} />
    </div>
  );
};
