import { Tag, Typography } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const STATUS_CONFIG = {
  active:   { color: 'success', icon: <CheckCircleOutlined />, label: 'Đã xác nhận' },
  approved: { color: 'success', icon: <CheckCircleOutlined />, label: 'Đã duyệt' },
  pending:  { color: 'warning', icon: <ClockCircleOutlined />, label: 'Đang chờ duyệt' },
  rejected: { color: 'error',   icon: <CloseCircleOutlined />, label: 'Bị từ chối' },
};

const BORDER_COLOR = {
  success: '#52c41a',
  warning: '#faad14',
  error:   '#ff4d4f',
};

export function TopicCard({ topic }) {
  const cfg = STATUS_CONFIG[topic.status] ?? STATUS_CONFIG.active;
  const borderColor = BORDER_COLOR[cfg.color] ?? '#52c41a';

  return (
    <div style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: 12, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text strong style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {topic.title}
        </Text>
        <Tag color={cfg.color} icon={cfg.icon} style={{ whiteSpace: 'nowrap', flexShrink: 0, margin: 0 }}>{cfg.label}</Tag>
      </div>

      {topic.description && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {topic.description}
        </Text>
      )}

      {topic.status === 'rejected' && topic.admin_note && (
        <Text type="danger" italic style={{ fontSize: 12, display: 'block', marginTop: 3 }}>
          &ldquo;{topic.admin_note}&rdquo;
        </Text>
      )}

      {(topic.status === 'active' || topic.status === 'approved') && topic.difficulty && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 3 }}>
          Độ khó: {topic.difficulty}
          {topic.resources?.length > 0 && ` · ${topic.resources.length} tài nguyên`}
        </Text>
      )}
    </div>
  );
}
