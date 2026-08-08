import { Card } from 'antd';

const fmtTs = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export const ProblemCard = ({ round, driveLink, poolName, C, warnings = [] }) => {
  const released = !!round?.problem_released_at;
  const poolUnavailable = warnings.includes('pool_unavailable');

  return (
    <Card size="small" style={{ background: C.card, borderColor: C.line, borderTop: `2px solid ${C.purple2}` }}>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.dim }}>
        Đề bài
      </div>

      {!released && (
        <div className="text-[13px] italic" style={{ color: C.dim }}>
          🔒 Đề bài chưa được phát
        </div>
      )}

      {released && (
        <>
          <div className="text-[13px]" style={{ color: C.text2 }}>
            🔓 Đã phát lúc {fmtTs(round.problem_released_at)}
          </div>
          {poolName && (
            <div className="mt-1 text-xs" style={{ color: C.muted }}>
              {poolName} · Google Drive
            </div>
          )}
          {driveLink ? (
            <a
              href={driveLink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-bold no-underline"
              style={{ color: C.cyan, background: 'rgba(0,212,255,.08)', border: `1px solid ${C.cyan}59` }}
            >
              📂 Mở đề bài →
            </a>
          ) : (
            <div className="mt-3 text-xs italic" style={{ color: C.muted }}>
              {poolUnavailable
                ? 'Không tải được thông tin bảng đấu. Hãy thử làm mới.'
                : 'Đề đã phát — chờ ban tổ chức cập nhật link Drive'}
            </div>
          )}
        </>
      )}
    </Card>
  );
};
