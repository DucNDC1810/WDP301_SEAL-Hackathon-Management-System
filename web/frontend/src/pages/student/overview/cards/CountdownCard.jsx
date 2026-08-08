import { useEffect, useState } from 'react';
import { Card, Progress, Tag } from 'antd';

const pad2 = (n) => String(n).padStart(2, '0');

const fmtTs = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} · ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const Tile = ({ value, label, accent, C }) => (
  <div
    className="min-w-[66px] rounded-xl px-2 py-3 text-center"
    style={{
      background: accent ? 'rgba(0,212,255,.06)' : C.card2,
      border: `1px solid ${accent ? 'rgba(0,212,255,.28)' : C.line}`,
    }}
  >
    <div
      className="text-[38px] font-bold leading-none"
      style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent ? C.cyan : C.text }}
    >
      {value}
    </div>
    <div
      className="mt-2 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: accent ? C.cyan : C.dim }}
    >
      {label}
    </div>
  </div>
);

export const CountdownCard = ({ round, nextRound, submission, C }) => {
  const [now, setNow] = useState(() => Date.now());

  // Ticks locally every second; it never triggers a network request.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const deadlineMs = round?.submission_deadline
    ? new Date(round.submission_deadline).getTime()
    : null;
  const nextStartMs = nextRound?.start_time ? new Date(nextRound.start_time).getTime() : null;
  const target = deadlineMs ?? nextStartMs;
  const ms = target ? Math.max(0, target - now) : 0;

  // A round can be live without a configured deadline (submission_deadline
  // defaults to null). Four zero tiles would read as a real "00:00:00:00"
  // measurement, so this case gets its own branch instead of falling through
  // to the countdown tiles.
  const liveRoundNoDeadline = !!round && deadlineMs === null;

  const startMs = round?.start_time ? new Date(round.start_time).getTime() : null;
  const percent =
    startMs && deadlineMs && deadlineMs > startMs
      ? Math.min(100, Math.max(0, Math.round(((now - startMs) / (deadlineMs - startMs)) * 100)))
      : null;

  const submitted = !!submission;

  return (
    <Card size="small" style={{ background: C.card, borderColor: C.line }}>
      <div className="flex flex-wrap items-center justify-between gap-8">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: deadlineMs ? C.amber : C.cyan, boxShadow: `0 0 8px ${deadlineMs ? C.amber : C.cyan}` }}
            />
            <span
              className="text-[11.5px] font-bold uppercase tracking-wider"
              style={{ color: deadlineMs ? C.amber : C.cyan }}
            >
              {deadlineMs
                ? `Hạn nộp bài · ${round?.name}`
                : liveRoundNoDeadline
                  ? `Vòng đang diễn ra · ${round?.name}`
                  : nextRound
                    ? `Vòng tiếp theo · ${nextRound.name}`
                    : 'Chưa có vòng thi'}
            </span>
          </div>
          {!liveRoundNoDeadline && (
            <div className="flex gap-3">
              <Tile value={pad2(Math.floor(ms / 86400000))} label="Ngày" C={C} />
              <Tile value={pad2(Math.floor((ms % 86400000) / 3600000))} label="Giờ" C={C} />
              <Tile value={pad2(Math.floor((ms % 3600000) / 60000))} label="Phút" C={C} />
              <Tile value={pad2(Math.floor((ms % 60000) / 1000))} label="Giây" accent C={C} />
            </div>
          )}
          <div className="mt-3 text-[12.5px]" style={{ color: C.muted }}>
            {liveRoundNoDeadline ? (
              <span className="font-semibold" style={{ color: C.text2 }}>
                Hạn nộp: chưa được công bố
              </span>
            ) : (
              <>
                {deadlineMs ? 'Hạn chót' : 'Bắt đầu lúc'}:{' '}
                <span className="font-semibold" style={{ color: C.text2 }}>
                  {fmtTs(deadlineMs ?? nextStartMs)}
                </span>
              </>
            )}
            {round?.coding_duration_hours ? (
              <span style={{ color: C.dim }}> · Thời lượng code: {round.coding_duration_hours} giờ</span>
            ) : null}
          </div>
        </div>

        <div className="min-w-[240px] max-w-[360px] flex-1">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[12.5px] font-semibold" style={{ color: C.text2 }}>
              Tiến độ vòng thi
            </span>
            {percent !== null && (
              <span className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.cyan }}>
                {percent}%
              </span>
            )}
          </div>
          <Progress
            percent={percent ?? 0}
            showInfo={false}
            strokeColor={{ '0%': C.cyan, '100%': C.purple }}
            trailColor={C.card2}
          />
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11.5px]" style={{ color: C.muted }}>
              Trạng thái bài nộp:
            </span>
            <Tag color={submitted ? 'success' : 'warning'}>{submitted ? 'Đã nộp bài' : 'Chưa nộp bài'}</Tag>
          </div>
        </div>
      </div>
    </Card>
  );
};
