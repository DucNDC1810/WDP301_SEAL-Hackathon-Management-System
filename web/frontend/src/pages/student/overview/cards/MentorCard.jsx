import { Avatar, Card, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';

export const MentorCard = ({ mentors, C }) => {
  const navigate = useNavigate();
  if (!mentors?.length) return null;

  return (
    <Card
      size="small"
      title={<span style={{ color: C.text2 }}>Mentor phụ trách</span>}
      style={{ background: C.card, borderColor: C.line }}
    >
      <div className="flex flex-col gap-3">
        {mentors.map((m) => (
          <div key={m.mentorId} className="flex items-start gap-3">
            <Avatar src={m.mentorAvatar || undefined} size={36}>
              {(m.mentorName?.[0] ?? 'M').toUpperCase()}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: C.text }}>
                  {m.mentorName}
                </span>
                {/* chatOpen means the chat session is open, not that the mentor is online. */}
                <Tag color={m.chatOpen ? 'success' : 'default'}>
                  {m.chatOpen ? 'Phiên chat đang mở' : 'Đã đóng'}
                </Tag>
              </div>
              {m.lastMessage?.content && (
                <div className="mt-1 truncate text-xs" style={{ color: C.muted }}>
                  "{m.lastMessage.content}"
                </div>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => navigate('/dashboard/chat')}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold"
          style={{ color: C.cyan, background: 'rgba(0,212,255,.08)', border: `1px solid ${C.cyan}44` }}
        >
          Nhắn tin →
        </button>
      </div>
    </Card>
  );
};
