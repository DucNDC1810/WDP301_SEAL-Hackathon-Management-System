import { Card, Empty } from 'antd';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const ScoreTrendChart = ({ scoreHistory, C }) => {
  const data = (scoreHistory ?? []).map((r) => ({
    name: r.round_name,
    score: r.total_score,
  }));

  return (
    <Card
      size="small"
      title={<span style={{ color: C.text2 }}>📈 Điểm qua các vòng</span>}
      style={{ background: C.card, borderColor: C.line }}
    >
      {data.length < 2 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: C.dim }}>
              {data.length === 1
                ? `Điểm vòng đầu: ${data[0].score} — biểu đồ hiện khi có vòng thứ hai`
                : 'Chưa có vòng nào công bố điểm'}
            </span>
          }
        />
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: -12 }}>
            <CartesianGrid stroke={C.line} strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: C.dim, fontSize: 11 }} stroke={C.line} />
            <YAxis tick={{ fill: C.dim, fontSize: 11 }} stroke={C.line} />
            <Tooltip
              contentStyle={{ background: C.card2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text }}
              labelStyle={{ color: C.text2 }}
            />
            <Line
              type="monotone"
              dataKey="score"
              name="Tổng điểm"
              stroke={C.cyan}
              strokeWidth={2.5}
              dot={{ r: 4, fill: C.cyan, stroke: C.card, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
