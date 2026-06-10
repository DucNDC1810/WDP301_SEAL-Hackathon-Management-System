import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Form, Input, Button, Tag, Select, Card, Tabs, Typography, message } from 'antd';

const { Title } = Typography;
const API = import.meta.env.VITE_API_URL || '';

export default function AppealsPage() {
  const { contestId } = useParams();
  const [appeals, setAppeals]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [form] = Form.useForm();

  const token = localStorage.getItem('accessToken');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user?.roles?.[0]?.role_name || 'contestant';

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const url = role === 'contestant'
        ? `${API}/api/appeals/contests/${contestId}/my?team_id=${user.team_id}`
        : `${API}/api/appeals/contests/${contestId}`;
      const res = await fetch(url, { headers });
      setAppeals(await res.json());
    } catch { message.error('Không thể tải khiếu nại'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAppeals(); }, [contestId]);

  const handleSubmit = async (values) => {
    try {
      await fetch(`${API}/api/appeals`, {
        method: 'POST', headers,
        body: JSON.stringify({ ...values, contest_id: contestId }),
      });
      message.success('Đã gửi khiếu nại');
      form.resetFields();
      fetchAppeals();
    } catch { message.error('Lỗi khi gửi khiếu nại'); }
  };

  const handleResolve = async (id, resolution) => {
    try {
      await fetch(`${API}/api/appeals/${id}/resolve`, {
        method: 'PUT', headers,
        body: JSON.stringify({ resolution }),
      });
      message.success('Đã xử lý khiếu nại');
      fetchAppeals();
    } catch { message.error('Lỗi khi xử lý'); }
  };

  const statusColor = { pending: 'orange', reviewing: 'blue', resolved_valid: 'green', resolved_invalid: 'red' };
  const statusLabel = { pending: 'Chờ xử lý', reviewing: 'Đang xem xét', resolved_valid: 'Hợp lệ', resolved_invalid: 'Không hợp lệ' };

  const adminColumns = [
    { title: 'Đội', dataIndex: ['team_id', 'team_name'], key: 'team' },
    { title: 'Nội dung', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: 'AI', dataIndex: 'ai_classification', key: 'ai', render: (v) => <Tag color={v === 'valid' ? 'green' : 'red'}>{v}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v) => <Tag color={statusColor[v]}>{statusLabel[v]}</Tag> },
    {
      title: 'Hành động', key: 'action',
      render: (_, r) => (r.status === 'pending' || r.status === 'reviewing') ? (
        <Select size="small" placeholder="Xử lý" style={{ width: 160 }}
          onChange={(val) => handleResolve(r._id, val)}>
          <Select.Option value="resolved_valid">Chấp nhận</Select.Option>
          <Select.Option value="resolved_invalid">Từ chối</Select.Option>
        </Select>
      ) : null,
    },
  ];

  const contestantColumns = [
    { title: 'Nội dung', dataIndex: 'content', key: 'content' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v) => <Tag color={statusColor[v]}>{statusLabel[v]}</Tag> },
    { title: 'Kết quả AI', dataIndex: 'ai_reason', key: 'ai_reason' },
  ];

  return (
    <div className="p-6">
      <Title level={3}>Khiếu nại</Title>
      {role === 'contestant' ? (
        <Tabs items={[
          {
            key: 'submit',
            label: 'Gửi khiếu nại',
            children: (
              <Card>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                  <Form.Item name="round_id" label="Vòng thi" rules={[{ required: true }]}>
                    <Input placeholder="Round ID" />
                  </Form.Item>
                  <Form.Item name="team_id" label="Team ID" rules={[{ required: true }]}>
                    <Input placeholder="Team ID" />
                  </Form.Item>
                  <Form.Item name="content" label="Nội dung khiếu nại" rules={[{ required: true, min: 20 }]}>
                    <Input.TextArea rows={5} placeholder="Mô tả chi tiết vấn đề..." />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">Gửi khiếu nại</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'list',
            label: 'Khiếu nại của tôi',
            children: <Table rowKey="_id" dataSource={appeals} columns={contestantColumns} loading={loading} />,
          },
        ]} />
      ) : (
        <Table rowKey="_id" dataSource={appeals} columns={adminColumns} loading={loading} />
      )}
    </div>
  );
}
