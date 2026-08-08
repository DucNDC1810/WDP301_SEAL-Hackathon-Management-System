import { Badge, Card, Empty, Tag } from 'antd';

// Every notification type the backend actually emits. Anything unmapped falls
// back to the generic tag rather than disappearing.
const TAG_BY_TYPE = {
  results_published: 'Kết quả',
  finalist_announcement: 'Kết quả',
  SCORE_SUBMITTED: 'Chấm điểm',
  deadline_reminder: 'Hạn nộp',
  missing_submission: 'Hạn nộp',
  SUBMISSION_CREATED: 'Bài nộp',
  SUBMISSION_REVIEWED: 'Bài nộp',
  TEAM_APPROVED: 'Đội thi',
  TEAM_REJECTED: 'Đội thi',
  TEAM_REGISTERED: 'Đội thi',
  TEAM_DISQUALIFIED: 'Đội thi',
  TEAM_ELIMINATED: 'Đội thi',
  team_member_verified: 'Đội thi',
  team_mentor_assigned: 'Đội thi',
  mentor_assigned: 'Mentor',
  judge_assigned: 'Giám khảo',
  INVITATION_ACCEPTED: 'Lời mời',
  INVITATION_REJECTED: 'Lời mời',
  VERIFICATION_REQUESTED: 'Xác thực',
  VERIFICATION_REVIEWED: 'Xác thực',
  contest_created: 'Cuộc thi',
  general: 'Thông báo',
};

const relTime = (value) => {
  if (!value) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 60) return `${mins || 1} phút trước`;
  if (mins < 1440) return `${Math.floor(mins / 60)} giờ trước`;
  return `${Math.floor(mins / 1440)} ngày trước`;
};

export const NewsCard = ({ notifications, C }) => {
  const items = notifications?.items ?? [];
  const unread = notifications?.unread_count ?? 0;

  return (
    <Card
      size="small"
      title={
        <span style={{ color: C.text2 }}>
          📰 Thông báo{' '}
          {unread > 0 && <Badge count={unread} style={{ backgroundColor: C.cyan, color: '#04121c' }} />}
        </span>
      }
      style={{ background: C.card, borderColor: C.line }}
    >
      {items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: C.dim }}>Chưa có thông báo nào</span>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((n) => (
            <div key={n._id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <Tag style={{ color: C.cyan, borderColor: `${C.cyan}44`, background: 'transparent' }}>
                  {TAG_BY_TYPE[n.type] ?? 'Thông báo'}
                </Tag>
                <span className="shrink-0 text-[11px]" style={{ color: C.dim }}>
                  {relTime(n.created_at)}
                </span>
              </div>
              <div className="text-[13px] font-semibold" style={{ color: C.text }}>
                {n.title || TAG_BY_TYPE[n.type] || 'Thông báo'}
              </div>
              {n.message && (
                <div className="text-xs leading-relaxed" style={{ color: C.muted }}>
                  {n.message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
