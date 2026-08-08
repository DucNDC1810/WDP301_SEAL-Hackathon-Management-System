import { Alert, Card, Progress } from 'antd';
import { ScoreTrendChart } from '../cards/ScoreTrendChart.jsx';
import { CriteriaRadarChart } from '../cards/CriteriaRadarChart.jsx';
import { NewsCard } from '../cards/NewsCard.jsx';

export const EliminatedState = ({ data, C }) => {
  const { team, contest, score_history: history = [] } = data;
  const members = team?.members ?? [];
  const hasContributions = members.some((m) => (m.contribution_percentage ?? 0) > 0);

  return (
    <div className="flex flex-col gap-4">
      <Alert
        type="info"
        showIcon
        message={`Hành trình của đội ${team?.team_name} đã kết thúc`}
        description={
          contest?.title
            ? `Cảm ơn đội đã tham gia ${contest.title}. Dưới đây là tổng kết toàn bộ các vòng.`
            : 'Dưới đây là tổng kết toàn bộ các vòng đã thi.'
        }
      />

      <Card
        size="small"
        title={<span style={{ color: C.text2 }}>Tổng kết các vòng</span>}
        styles={{ body: { padding: 0 } }}
        style={{ background: C.card, borderColor: C.line }}
      >
        {history.length === 0 ? (
          <div className="p-6 text-center text-[13px]" style={{ color: C.dim }}>
            Không có vòng nào được công bố điểm.
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Vòng', 'Điểm', 'Hạng', 'Kết quả'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-[10.5px] font-bold uppercase tracking-wide"
                    style={{ color: C.dim }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.round_id} style={{ borderTop: `1px solid ${C.line2}` }}>
                  <td className="px-4 py-2.5" style={{ color: C.text2 }}>{r.round_name}</td>
                  <td className="px-4 py-2.5 font-bold" style={{ color: C.text }}>{r.total_score}</td>
                  <td className="px-4 py-2.5" style={{ color: C.gold }}>{r.rank ? `#${r.rank}` : '—'}</td>
                  <td className="px-4 py-2.5" style={{ color: r.qualified ? C.green : C.muted }}>
                    {r.qualified === null ? '—' : r.qualified ? 'Qua vòng' : 'Dừng lại'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreTrendChart scoreHistory={history} C={C} />
        <CriteriaRadarChart scoreHistory={history} C={C} />
      </div>

      {hasContributions && (
        <Card
          size="small"
          title={<span style={{ color: C.text2 }}>Đánh giá đóng góp của trưởng nhóm</span>}
          style={{ background: C.card, borderColor: C.line }}
        >
          <div className="flex flex-col gap-3">
            {members.map((m) => (
              <div key={m.email}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span style={{ color: C.text }}>{m.full_name || m.email}</span>
                  <span className="font-bold" style={{ color: C.cyan }}>{m.contribution_percentage}%</span>
                </div>
                <Progress percent={m.contribution_percentage} showInfo={false} strokeColor={C.cyan} trailColor={C.card2} size="small" />
                {m.contribution_note && (
                  <div className="mt-1 text-xs italic" style={{ color: C.muted }}>"{m.contribution_note}"</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <NewsCard notifications={data.notifications} C={C} />
    </div>
  );
};
