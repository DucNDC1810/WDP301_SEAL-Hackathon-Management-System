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
    <div style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: 12, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <Text strong style={{ fontSize: 14 }}>{topic.title}</Text>
        <Tag color={cfg.color} icon={cfg.icon} style={{ whiteSpace: 'nowrap' }}>{cfg.label}</Tag>
      </div>

      {topic.description && (
        <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
          {topic.description}
        </Paragraph>
      )}

      {topic.status === 'rejected' && topic.admin_note && (
        <Paragraph type="danger" italic style={{ margin: '4px 0 0', fontSize: 12 }}>
          &ldquo;{topic.admin_note}&rdquo;
        </Paragraph>
      )}

      {(topic.status === 'active' || topic.status === 'approved') && topic.difficulty && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Độ khó: {topic.difficulty}
          {topic.resources?.length > 0 && ` · ${topic.resources.length} tài nguyên`}
        </Text>
      )}
    </div>
  );
}
