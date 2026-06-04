import { useEffect, useState } from 'react';
import {
  Form, Input, Button, Card, Table, Tag, Typography,
  Space, Divider, Select, message, Spin, Empty
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import './TeamPage.css';

const { Title, Text } = Typography;

export default function TeamPage() {
  const { user } = useAuth();
  const { request } = useApi();
  const [myTeam, setMyTeam] = useState(null);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

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
      await request(`/api/teams/contests/${values.contest_id}/teams`, {
        method: 'POST',
        body: {
          team_name: values.team_name,
          leader_id: user._id,
          members: [
            { email: user.email, full_name: user.full_name },
            ...(values.members || []).map((m) => ({ email: m.email, full_name: m.full_name || '' })),
          ],
        },
      });
      message.success('Tạo đội thành công! Email xác nhận đã được gửi cho các thành viên.');
      await fetchData();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const memberColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Tên', dataIndex: 'full_name', key: 'full_name' },
    {
      title: 'Trạng thái',
      dataIndex: 'email_verified',
      key: 'status',
      render: (v) => <Tag color={v ? 'green' : 'orange'}>{v ? '✅ Đã xác nhận' : '⏳ Chờ xác nhận'}</Tag>,
    },
  ];

  if (loading) return <div className="team-page__loading"><Spin size="large" /></div>;

  return (
    <div className="team-page">
      <Title level={3}>Quản lý đội thi</Title>

      {myTeam ? (
        <Card
          title={`Đội: ${myTeam.team_name}`}
          extra={
            <Tag color={myTeam.status === 'confirmed' ? 'green' : 'orange'}>
              {myTeam.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
            </Tag>
          }
        >
          {myTeam.topic_id && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Đề tài: <Text strong>{myTeam.topic_id?.title || myTeam.topic_id}</Text>
            </Text>
          )}
          <Divider orientation="left">Danh sách thành viên</Divider>
          <Table
            rowKey="email"
            dataSource={myTeam.members}
            columns={memberColumns}
            pagination={false}
            size="small"
          />
        </Card>
      ) : (
        <Card title="Tạo đội thi mới">
          {contests.length === 0 ? (
            <Empty description="Không có cuộc thi nào đang mở đăng ký" />
          ) : (
            <Form form={form} layout="vertical" onFinish={handleCreate} style={{ maxWidth: 600 }}>
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

              <Divider orientation="left">Thành viên (ngoài bạn)</Divider>
              <Form.List name="members">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                        <Form.Item {...rest} name={[name, 'email']} rules={[{ required: true, type: 'email' }]}>
                          <Input placeholder="email@example.com" style={{ width: 240 }} />
                        </Form.Item>
                        <Form.Item {...rest} name={[name, 'full_name']}>
                          <Input placeholder="Tên (tuỳ chọn)" style={{ width: 160 }} />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                      Thêm thành viên
                    </Button>
                  </>
                )}
              </Form.List>

              <Form.Item style={{ marginTop: 24 }}>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Tạo đội
                </Button>
              </Form.Item>
            </Form>
          )}
        </Card>
      )}
    </div>
  );
}
