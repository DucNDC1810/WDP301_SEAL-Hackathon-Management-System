import { Card, Progress, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { NewsCard } from '../cards/NewsCard.jsx';

export const FormingState = ({ data, C }) => {
  const navigate = useNavigate();
  const { team, contest, open_contests: openContests = [], notifications } = data;

  const members = team?.members ?? [];
  const total = members.length;
  const verified = members.filter((m) => m.profile_verify_status === 'approved').length;
  const emailVerified = members.filter((m) => m.email_verified === true).length;

  // The team has no contest yet, so fall back to the strictest open contest.
  const requiredSize =
    contest?.min_team_size ??
    openContests.reduce((acc, c) => Math.max(acc, c.min_team_size ?? 0), 0) ??
    0;

  const sizePercent = requiredSize ? Math.min(100, Math.round((total / requiredSize) * 100)) : 0;
  const verifyPercent = total ? Math.round((verified / total) * 100) : 0;
  const emailVerifyPercent = total ? Math.round((emailVerified / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={
          <span style={{ color: C.text }}>
            {contest ? (
              <>Đội <strong>{team?.team_name}</strong> — {contest.title}</>
            ) : (
              <>Đội <strong>{team?.team_name}</strong> — chưa đăng ký cuộc thi nào</>
            )}
          </span>
        }
        style={{ background: C.card, borderColor: C.line }}
      >
        {requiredSize > 0 ? (
          <>
            <div className="mb-1 text-xs" style={{ color: C.muted }}>
              Điều kiện đăng ký{contest ? '' : ' (theo cuộc thi có yêu cầu cao nhất đang mở)'}
            </div>
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-xs" style={{ color: C.muted }}>
                <span>Thành viên</span>
                <span style={{ color: total >= requiredSize ? C.green : C.amber }}>
                  {total}/{requiredSize}
                </span>
              </div>
              <Progress percent={sizePercent} showInfo={false} strokeColor={total >= requiredSize ? C.green : C.amber} trailColor={C.card2} />
            </div>
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs" style={{ color: C.muted }}>
                <span>Xác thực hồ sơ</span>
                <span style={{ color: verified === total && total > 0 ? C.green : C.amber }}>
                  {verified}/{total}
                </span>
              </div>
              <Progress percent={verifyPercent} showInfo={false} strokeColor={verified === total && total > 0 ? C.green : C.amber} trailColor={C.card2} />
            </div>
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs" style={{ color: C.muted }}>
                <span>Xác nhận email</span>
                <span style={{ color: emailVerified === total && total > 0 ? C.green : C.amber }}>
                  {emailVerified}/{total}
                </span>
              </div>
              <Progress percent={emailVerifyPercent} showInfo={false} strokeColor={emailVerified === total && total > 0 ? C.green : C.amber} trailColor={C.card2} />
            </div>
          </>
        ) : (
          <p className="mb-4 text-[13px]" style={{ color: C.muted }}>
            Hiện chưa có cuộc thi nào đang mở đăng ký.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/team')}
            className="cursor-pointer rounded-lg px-4 py-2 text-[13px] font-bold"
            style={{ color: C.cyan, background: 'rgba(0,212,255,.08)', border: `1px solid ${C.cyan}44` }}
          >
            Mời thành viên →
          </button>
          {requiredSize > 0 && total >= requiredSize && verified === total && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/team')}
              className="cursor-pointer rounded-lg px-4 py-2 text-[13px] font-bold"
              style={{ background: `linear-gradient(135deg, ${C.cyan}, #0099cc)`, color: '#070b14', border: 'none' }}
            >
              Đăng ký cuộc thi →
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {members.map((m) => (
            <Tag key={m.email} color={m.profile_verify_status === 'approved' ? 'success' : 'warning'}>
              {m.full_name || m.email}
            </Tag>
          ))}
        </div>
      </Card>

      <NewsCard notifications={notifications} C={C} />
    </div>
  );
};
