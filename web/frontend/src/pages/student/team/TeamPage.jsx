import { useEffect, useState } from 'react';
import {
  Form, Input, Button, Card, Table, Tag, Typography,
  Divider, Select, message, Spin, Empty, Space
} from 'antd';
import { PlusOutlined, CopyOutlined } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
const { Title, Text, Paragraph } = Typography;

export default function TeamPage() {
  const { user } = useAuth();
  const { request } = useApi();
  const [myTeam, setMyTeam] = useState(null);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [form] = Form.useForm();
  const [memberForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, contestsRes] = await Promise.allSettled([
        request('/api/teams/me'),
        request('/api/contests'),
      ]);
      if (teamsRes.status === 'fulfilled') {
        const list = Array.isArray(teamsRes.value) ? teamsRes.value : teamsRes.value?.data ?? [];
        setMyTeam(list[0] || null);
      }
      if (contestsRes.status === 'fulfilled') {
        const list = Array.isArray(contestsRes.value) ? contestsRes.value : contestsRes.value?.data ?? [];
        setContests(list.filter((c) => c.status === 'open'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (values) => {
    setSubmitting(true);
    try {
      const res = await request(`/api/teams/contests/${values.contest_id}/teams`, {
        method: 'POST',
        body: {
          team_name: values.team_name,
          leader_id: user._id,
          members: [{ email: user.email, full_name: user.full_name }],
        },
      });
      message.success('Tạo đội thành công! Đang chờ admin duyệt.');
      await fetchData();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async (values) => {
    setAddingMember(true);
    try {
      await request(`/api/teams/${myTeam._id}/members`, {
        method: 'POST',
        body: { email: values.email, full_name: values.full_name || '' },
      });
      message.success(`Đã mời ${values.email}. Email xác nhận đã được gửi.`);
      memberForm.resetFields();
      await fetchData();
    } catch (err) {
      message.error(err.message || 'Tính năng đang phát triển');
    } finally {
      setAddingMember(false);
    }
  };

  const copyTeamCode = () => {
    navigator.clipboard.writeText(myTeam._id)
      .then(() => message.success('Đã copy mã đội!'))
      .catch(() => message.info(`Mã đội: ${myTeam._id}`));
  };

  const leaderEmail = myTeam?.leader_id?.email ?? myTeam?.leader_id;

  const memberColumns = [
    {
      title: 'Vai trò',
      key: 'role',
      width: 130,
      render: (_, record) => record.email === leaderEmail
        ? <Tag color="gold">👑 Trưởng nhóm</Tag>
        : <Tag color="blue">Thành viên</Tag>,
    },
    { title: 'Tên', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Xác nhận',
      dataIndex: 'email_verified',
      key: 'status',
      render: (v) => <Tag color={v ? 'green' : 'orange'}>{v ? '✅ Đã xác nhận' : '⏳ Chờ'}</Tag>,
    },
  ];

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Spin size="large" /></div>;

  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">
      <Title level={3}>Quản lý đội thi</Title>

      {!myTeam ? (
        // ── Chưa có đội ─────────────────────────────────────
        <Card title="Tạo đội thi mới">
          {contests.length === 0 ? (
            <Empty description="Không có cuộc thi nào đang mở đăng ký" />
          ) : (
            <Form form={form} layout="vertical" onFinish={handleCreate} style={{ maxWidth: 500 }}>
              <Form.Item name="contest_id" label="Cuộc thi" rules={[{ required: true }]}>
                <Select placeholder="Chọn cuộc thi">
                  {contests.map((c) => (
                    <Select.Option key={c._id} value={c._id}>{c.title}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="team_name" label="Tên đội" rules={[{ required: true }]}>
                <Input placeholder="Tên đội của bạn" />
              </Form.Item>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                Sau khi tạo, đội sẽ được gửi đến admin để duyệt. Bạn có thể thêm thành viên sau khi đội được duyệt.
              </Text>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Tạo đội & gửi yêu cầu duyệt
              </Button>
            </Form>
          )}
        </Card>
      ) : (
        // ── Đã có đội ────────────────────────────────────────
        <Card
          title={`Đội: ${myTeam.team_name}`}
          extra={
            <Tag color={myTeam.status === 'confirmed' ? 'green' : myTeam.status === 'disqualified' ? 'red' : 'orange'}>
              {myTeam.status === 'confirmed' ? 'Đã duyệt' : myTeam.status === 'disqualified' ? 'Bị loại' : 'Chờ duyệt'}
            </Tag>
          }
        >
          {/* Mã đội */}
          <div className="mb-4">
            <Text type="secondary">Mã đội (share cho thành viên):</Text>
            <Space style={{ marginTop: 4 }}>
              <Text code copyable={false} style={{ fontSize: 13 }}>{myTeam._id}</Text>
              <Button size="small" icon={<CopyOutlined />} onClick={copyTeamCode}>Copy</Button>
            </Space>
          </div>

          {myTeam.status === 'pending' && (
            <div className="my-3">
              <Text type="warning">
                ⏳ Đội đang chờ admin duyệt. Sau khi được duyệt bạn mới có thể thêm thành viên.
              </Text>
            </div>
          )}

          {myTeam.topic_id && (
            <Paragraph style={{ marginTop: 8 }}>
              Đề tài: <Text strong>{myTeam.topic_id?.title || myTeam.topic_id}</Text>
            </Paragraph>
          )}

          <Divider orientation="left">Thành viên</Divider>
          <Table
            rowKey="email"
            dataSource={myTeam.members}
            columns={memberColumns}
            pagination={false}
            size="small"
          />

          {/* Thêm thành viên — chỉ khi đội đã confirmed */}
          {myTeam.status === 'confirmed' && (
            <>
              <Divider orientation="left">Mời thêm thành viên</Divider>
              <Form form={memberForm} layout="inline" onFinish={handleAddMember}>
                <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
                  <Input placeholder="email@example.com" style={{ width: 220 }} />
                </Form.Item>
                <Form.Item name="full_name">
                  <Input placeholder="Tên (tuỳ chọn)" style={{ width: 160 }} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={addingMember}>
                    Mời
                  </Button>
                </Form.Item>
              </Form>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                Thành viên sẽ nhận email xác nhận để tham gia.
              </Text>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
