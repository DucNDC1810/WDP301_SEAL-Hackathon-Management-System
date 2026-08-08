import { Alert, Card, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { NewsCard } from '../cards/NewsCard.jsx';

const daysLeft = (value) => {
  if (!value) return null;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
};

export const NoTeamState = ({ data, C }) => {
  const navigate = useNavigate();
  const { user, invitations = [], open_contests: contests = [], notifications } = data;

  const missing = [];
  if (!user.has_phone) missing.push('số điện thoại');
  if (!user.has_student_id) missing.push('mã số sinh viên');
  if (!user.has_student_card) missing.push('ảnh thẻ sinh viên');

  return (
    <div className="flex flex-col gap-5">
      <Card style={{ background: C.card, borderColor: C.line }}>
        <Tag style={{ color: C.cyan, borderColor: `${C.cyan}44`, background: 'rgba(0,212,255,.08)' }}>
          ⚡ BẮT ĐẦU HÀNH TRÌNH
        </Tag>
        <h2
          className="mb-2 mt-4 text-3xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }}
        >
          Chào mừng, {user.full_name?.split(' ').pop() || 'bạn'} 👋
        </h2>
        <p className="max-w-xl text-sm leading-relaxed" style={{ color: C.text2 }}>
          Bạn chưa tham gia cuộc thi nào. Tạo đội hoặc chấp nhận một lời mời để bắt đầu.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {['① Tạo đội', '② Mời đủ số thành viên', '③ Xác thực hồ sơ', '④ Nộp bài'].map((s) => (
            <Tag key={s} style={{ color: C.text2, borderColor: C.line, background: C.card2 }}>{s}</Tag>
          ))}
        </div>
      </Card>

      {missing.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Hồ sơ chưa hoàn thiện"
          description={`Còn thiếu: ${missing.join(', ')}. Cần hoàn thiện trước khi đội được duyệt.`}
          action={
            <button
              type="button"
              onClick={() => navigate('/dashboard/profile')}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold"
              style={{ color: C.cyan, background: 'rgba(0,212,255,.08)', border: `1px solid ${C.cyan}44` }}
            >
              Hoàn thiện hồ sơ →
            </button>
          }
        />
      )}

      {invitations.length > 0 && (
        <Card
          size="small"
          title={<span style={{ color: C.text2 }}>📬 {invitations.length} lời mời đang chờ</span>}
          style={{ background: C.card, borderColor: C.line }}
        >
          <div className="flex flex-col gap-3">
            {invitations.map((inv) => (
              <div key={inv._id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold" style={{ color: C.text }}>
                    {inv.team_name}
                    {inv.contest_title && (
                      <Tag className="ml-2" style={{ color: C.cyan, borderColor: `${C.cyan}44`, background: 'transparent' }}>
                        {inv.contest_title}
                      </Tag>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: C.muted }}>
                    Mời bởi {inv.inviter_name} · {inv.member_count} thành viên
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/invites')}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold"
                  style={{ color: C.cyan, background: 'rgba(0,212,255,.08)', border: `1px solid ${C.cyan}44` }}
                >
                  Xem lời mời →
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {contests.length > 0 && (
        <div>
          <div className="mb-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: C.text2 }}>
            🏆 Cuộc thi đang mở đăng ký
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {contests.map((c) => {
              const left = daysLeft(c.registration_deadline);
              return (
                <Card
                  key={c._id}
                  size="small"
                  style={{ background: C.card, borderColor: C.line, borderTop: `2px solid ${C.cyan}` }}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Tag style={{ color: C.cyan, borderColor: `${C.cyan}44`, background: 'transparent' }}>
                      Đội {c.min_team_size} người · {c.rounds_count} vòng
                    </Tag>
                    {left !== null && (
                      <span className="text-[11.5px] font-bold" style={{ color: left <= 5 ? C.amber : C.muted }}>
                        Còn {left} ngày
                      </span>
                    )}
                  </div>
                  <div className="mb-2 text-base font-bold leading-snug" style={{ color: C.text }}>
                    {c.title}
                  </div>
                  {c.description && (
                    <p className="mb-3 line-clamp-2 text-xs leading-relaxed" style={{ color: C.muted }}>
                      {c.description}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/team')}
                    className="w-full cursor-pointer rounded-lg py-2 text-[13px] font-bold"
                    style={{ background: `linear-gradient(135deg, ${C.cyan}, #0099cc)`, color: '#070b14', border: 'none' }}
                  >
                    + Tạo đội tham gia
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <NewsCard notifications={notifications} C={C} />
    </div>
  );
};
