import { useState, useEffect } from 'react';
import { Modal, List, Tag, message } from 'antd';
import { useApi } from '../../../hooks/useApi';

const DIFFICULTY_COLOR = { easy: 'success', medium: 'warning', hard: 'error' };

export function SelectTopicModal({ open, contestId, teamId, onClose, onSuccess }) {
  const { request } = useApi();
  const [topics, setTopics] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setLoading(true);
    request(`/api/topics/contests/${contestId}/topics`)
      .then((data) => setTopics(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => message.error('Không thể tải danh sách đề tài'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contestId]);

  const handleConfirm = async () => {
    if (!selected) return;
    setConfirming(true);
    try {
      await request(`/api/teams/${teamId}/select-topic`, {
        method: 'POST',
        body: { topic_id: selected },
      });
      message.success('Chọn đề tài thành công');
      onSuccess();
      onClose();
    } catch (err) {
      message.error(err.message || 'Chọn đề tài thất bại');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      title="Chọn đề tài có sẵn"
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      okText="Xác nhận"
      cancelText="Huỷ"
      okButtonProps={{ disabled: !selected, loading: confirming }}
    >
      <List
        loading={loading}
        dataSource={topics}
        locale={{ emptyText: 'Không có đề tài nào khả dụng' }}
        renderItem={(topic) => (
          <List.Item
            onClick={() => setSelected(topic._id)}
            style={{
              cursor: 'pointer',
              background: selected === topic._id ? 'rgba(22,119,255,0.12)' : 'transparent',
              borderRadius: 6,
              padding: '8px 12px',
              marginBottom: 4,
            }}
          >
            <List.Item.Meta
              title={topic.title}
              description={topic.description || undefined}
            />
            {topic.difficulty && (
              <Tag color={DIFFICULTY_COLOR[topic.difficulty] ?? 'default'}>{topic.difficulty}</Tag>
            )}
          </List.Item>
        )}
      />
    </Modal>
  );
}
