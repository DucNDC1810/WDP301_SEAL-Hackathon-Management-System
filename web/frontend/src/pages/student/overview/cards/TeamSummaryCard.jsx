import { Card, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';

export const TeamSummaryCard = ({ team, contest, git, C }) => {
  const navigate = useNavigate();
  const total = team?.members?.length ?? 0;
  const maxSize = contest?.max_team_size ?? null;
  const verified = (team?.members ?? []).filter((m) => m.profile_verify_status === 'approved').length;

  return (
    <Card
      size="small"
      style={{ background: C.card, borderColor: C.line, borderTop: `2px solid ${C.cyan}` }}
    >
      <div className="mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: C.dim }}>
        Đội của bạn
      </div>
      <div className="flex items-center gap-3">
        <div
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {(team?.team_name?.[0] ?? 'T').toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-bold" style={{ color: C.text }}>
            {team?.team_name}
          </div>
          <div className="text-xs" style={{ color: C.muted }}>
            {maxSize ? `${total}/${maxSize} thành viên` : `${total} thành viên`}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Tag style={{ color: C.cyan, borderColor: `${C.cyan}44`, background: 'rgba(0,212,255,.08)' }}>
          {team?.pool_name ?? 'Chưa phân bảng'}
        </Tag>
        <Tag color={verified === total && total > 0 ? 'success' : 'warning'}>
          {verified}/{total} đã xác thực
        </Tag>
      </div>

      {git?.status === 'ok' && (
        <button
          type="button"
          onClick={() => navigate('/dashboard/team')}
          className="mt-3 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-xs font-semibold"
          style={{ color: C.text2, background: C.card2, border: `1px solid ${C.line}` }}
        >
          📦 {git.total_commits} commit · {git.members_with_activity}/{git.members_total} thành viên có hoạt động →
        </button>
      )}
    </Card>
  );
};
