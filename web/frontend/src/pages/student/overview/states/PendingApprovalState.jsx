import { Alert, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { NewsCard } from '../cards/NewsCard.jsx';

const fmtTs = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const PendingApprovalState = ({ data, C }) => {
  const navigate = useNavigate();
  const { team, contest, notifications } = data;

  const rejected = String(team?.status).toUpperCase() === 'REJECTED';
  const members = team?.members ?? [];
  const verified = members.filter((m) => m.profile_verify_status === 'approved').length;

  return (
    <div className="flex flex-col gap-5">
      <Alert
        type={rejected ? 'error' : 'info'}
        showIcon
        message={rejected ? 'Yêu cầu tham gia bị từ chối' : 'Đang chờ ban tổ chức duyệt'}
        description={
          rejected
            ? 'Trưởng nhóm có thể chỉnh sửa thông tin đội rồi gửi lại yêu cầu. Liên hệ ban tổ chức nếu cần biết lý do cụ thể.'
            : `Đội ${team?.team_name} đã gửi yêu cầu tham gia${contest?.title ? ` ${contest.title}` : ''}.`
        }
      />

      <Card style={{ background: C.card, borderColor: C.line }}>
        <div className="flex flex-col gap-2 text-[13px]" style={{ color: C.text2 }}>
          <div>
            Gửi lúc: <span className="font-semibold">{fmtTs(team?.updated_at)}</span>
          </div>
          <div>
            Xác thực hồ sơ:{' '}
            <span className="font-semibold" style={{ color: verified === members.length ? C.green : C.amber }}>
              {verified}/{members.length} thành viên
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/team')}
            className="cursor-pointer rounded-lg px-4 py-2 text-[13px] font-bold"
            style={{ color: C.cyan, background: 'rgba(0,212,255,.08)', border: `1px solid ${C.cyan}44` }}
          >
            {rejected ? 'Chỉnh sửa & gửi lại →' : 'Xem đội →'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/profile')}
            className="cursor-pointer rounded-lg px-4 py-2 text-[13px] font-bold"
            style={{ color: C.text2, background: C.card2, border: `1px solid ${C.line}` }}
          >
            Hoàn thiện hồ sơ
          </button>
        </div>
      </Card>

      <NewsCard notifications={notifications} C={C} />
    </div>
  );
};
