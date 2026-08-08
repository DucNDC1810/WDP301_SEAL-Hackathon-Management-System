import { Card, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';

const fmt = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

const minutesBetween = (start, end) => {
  if (!start || !end) return null;
  return Math.round((new Date(end) - new Date(start)) / 60000);
};

export const PresentationCard = ({ presentation, C }) => {
  const navigate = useNavigate();
  if (!presentation) return null;

  const { booked, available_count: available } = presentation;

  return (
    <Card
      size="small"
      title={<span style={{ color: C.text2 }}>🗓 Lịch trình bày</span>}
      style={{ background: C.card, borderColor: C.line }}
    >
      {booked ? (
        <div className="flex flex-col gap-1.5">
          <div className="text-[13px] font-bold" style={{ color: C.text }}>
            {fmt(booked.start_time)} – {fmt(booked.end_time)}
          </div>
          {booked.room && (
            <div className="text-xs" style={{ color: C.cyan }}>📍 {booked.room}</div>
          )}
          <div className="text-xs" style={{ color: C.muted }}>
            ⏱ {minutesBetween(booked.start_time, booked.end_time) ?? '—'} phút
          </div>
          {booked.note && (
            <div className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
              📝 {booked.note}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/dashboard/submit')}
            className="mt-2 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold"
            style={{ color: C.cyan, background: 'rgba(0,212,255,.08)', border: `1px solid ${C.cyan}44` }}
          >
            Quản lý lịch →
          </button>
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: C.dim }}>
              {available > 0 ? `Chưa đặt lịch — còn ${available} slot trống` : 'Chưa đặt lịch và không còn slot trống'}
            </span>
          }
        />
      )}
    </Card>
  );
};
