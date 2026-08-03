import { Card, Empty } from 'antd';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export const CriteriaRadarChart = ({ scoreHistory, C }) => {
  // Use the most recent published round that actually has a criteria breakdown.
  const round = [...(scoreHistory ?? [])].reverse().find((r) => r.criteria?.length);

  const data = (round?.criteria ?? []).map((c) => ({
    criteria: c.criteria_name,
    score: c.avg_score,
    max: c.max_score,
  }));

  const maxScore = data.reduce((acc, d) => Math.max(acc, d.max ?? 0), 0) || 10;

  return (
    <Card
      size="small"
      title={
        <span style={{ color: C.text2 }}>
          🎯 Điểm theo tiêu chí{round ? ` — ${round.round_name}` : ''}
        </span>
      }
      style={{ background: C.card, borderColor: C.line }}
    >
      {data.length < 3 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: C.dim }}>
              {data.length === 0
                ? 'Chưa có vòng nào công bố điểm theo tiêu chí'
                : 'Cần ít nhất 3 tiêu chí để vẽ biểu đồ radar'}
            </span>
          }
        />
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke={C.line} />
            <PolarAngleAxis dataKey="criteria" tick={{ fill: C.dim, fontSize: 10.5 }} />
            <PolarRadiusAxis domain={[0, maxScore]} tick={{ fill: C.dim, fontSize: 9 }} axisLine={false} />
            <Tooltip
              contentStyle={{ background: C.card2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text }}
            />
            <Radar name="Điểm đội bạn" dataKey="score" stroke={C.cyan} fill={C.cyan} fillOpacity={0.28} />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
