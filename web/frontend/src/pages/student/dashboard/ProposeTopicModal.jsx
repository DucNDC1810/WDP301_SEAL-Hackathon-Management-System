import { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { useApi } from '../../../hooks/useApi';

export function ProposeTopicModal({ open, teamId, onClose, onSuccess }) {
  const { request } = useApi();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setLoading(true);
    try {
      await request(`/api/teams/${teamId}/propose-topic`, {
        method: 'POST',
        body: values,
      });
      message.success('Đã gửi đề xuất, chờ admin duyệt');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err) {
      message.error(err.message || 'Đề xuất thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Đề xuất đề tài"
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText="Gửi đề xuất"
      cancelText="Huỷ"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          name="title"
          label="Tên đề tài"
          rules={[{ required: true, message: 'Vui lòng nhập tên đề tài' }]}
        >
          <Input placeholder="VD: Hệ thống quản lý sinh viên..." />
        </Form.Item>
        <Form.Item name="description" label="Mô tả (tuỳ chọn)">
          <Input.TextArea rows={3} placeholder="Mô tả ngắn về ý tưởng của bạn..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
