import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Empty, Spin, Typography, Row, Col, Modal, Input, Form, message } from 'antd';
import { TeamOutlined, TrophyOutlined, ClockCircleOutlined, PlusOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import './StudentDashboardPage.css';

const { Title, Text } = Typography;

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { request } = useApi();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinForm] = Form.useForm();

  const fetchData = async () => {
    try {
      const [contestsRes, teamsRes] = await Promise.allSettled([
        request('/api/contests'),
        request('/api/teams/me'),
      ]);
      if (contestsRes.status === 'fulfilled') {
        const list = Array.isArray(contestsRes.value) ? contestsRes.value : contestsRes.value?.data ?? [];
        setContests(list.filter((c) => c.status === 'open'));
      }

      if (teamsRes.status === 'fulfilled') {
        const list = Array.isArray(teamsRes.value) ? teamsRes.value : teamsRes.value?.data ?? [];
        setMyTeam(list[0] || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleJoinTeam = async (values) => {
    setJoinLoading(true);
    try {
      await request('/api/teams/join', {
        method: 'POST',
        body: { team_code: values.team_code },
      });
      message.success('Yêu cầu tham gia đã được gửi!');
      setJoinModalOpen(false);
      joinForm.resetFields();
      await fetchData();
    } catch (err) {
      message.error(err.message || 'Mã đội không hợp lệ');
    } finally {
      setJoinLoading(false);
    }
  };

  const getDeadline = (contest) => {
    const sorted = [...(contest.rounds || [])].sort((a, b) => new Date(a.end_time) - new Date(b.end_time));
    return sorted[0]?.end_time;
  };

  const isUrgent = (dateStr) => dateStr && new Date(dateStr) - new Date() < 24 * 60 * 60 * 1000;

  const teamStatusColor = { pending: 'orange', confirmed: 'green', disqualified: 'red' };
  const teamStatusLabel = { pending: 'Chờ admin duyệt', confirmed: 'Đã xác nhận', disqualified: 'Bị loại' };

  if (loading) return <div className="dashboard__loading"><Spin size="large" /></div>;

  return (
    <div className="dashboard">
      <Title level={3}>Xin chào, {user?.full_name?.split(' ').pop()} 👋</Title>

      <Row gutter={[24, 24]}>
        {/* Team Status */}
        <Col xs={24} lg={8}>
          <Card title={<><TeamOutlined /> Đội thi của tôi</>} className="dashboard__card">
            {!myTeam ? (
              <div className="dashboard__no-team">
                <Empty description="Bạn chưa tham gia đội nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                <div className="dashboard__team-actions">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    block
                    onClick={() => navigate('/team')}
                  >
                    Tạo đội mới
                  </Button>
                  <Button
                    icon={<LoginOutlined />}
                    block
                    onClick={() => setJoinModalOpen(true)}
                  >
                    Join đội có sẵn
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="dashboard__team-header">
                  <Text strong style={{ fontSize: 16 }}>{myTeam.team_name}</Text>
                  <Tag color={teamStatusColor[myTeam.status]}>
                    {teamStatusLabel[myTeam.status] || myTeam.status}
                  </Tag>
                </div>

                {myTeam.status === 'pending' && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                    Đội đang chờ admin duyệt. Sau khi được duyệt bạn có thể thêm thành viên.
                  </Text>
                )}

                {myTeam.status === 'confirmed' && (
                  <>
                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                      {myTeam.members?.filter((m) => m.email_verified).length}/{myTeam.members?.length} thành viên đã xác nhận
                    </Text>
                    <Button
                      size="small"
                      style={{ marginTop: 8 }}
                      onClick={() => navigate('/team')}
                    >
                      Quản lý đội
                    </Button>
                  </>
                )}

                {myTeam.topic_id && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                    Đề tài: <Text strong>{myTeam.topic_id?.title || myTeam.topic_id}</Text>
                  </Text>
                )}
              </div>
            )}
          </Card>
        </Col>

        {/* Open Contests */}
        <Col xs={24} lg={16}>
          <Card title={<><TrophyOutlined /> Cuộc thi đang mở</>} className="dashboard__card">
            {contests.length === 0 ? (
              <Empty description="Chưa có cuộc thi nào đang mở" />
            ) : (
              contests.map((contest) => {
                const deadline = getDeadline(contest);
                const urgent = isUrgent(deadline);
                return (
                  <div key={contest._id} className="dashboard__contest-item">
                    <div>
                      <Text strong>{contest.title}</Text>
                      {deadline && (
                        <div style={{ marginTop: 2 }}>
                          <ClockCircleOutlined style={{ color: urgent ? '#ff4d4f' : '#8c8c8c', marginRight: 4 }} />
                          <Text type={urgent ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                            Deadline: {new Date(deadline).toLocaleString('vi-VN')}
                          </Text>
                        </div>
                      )}
                    </div>
                    <Tag color="blue">Đang mở</Tag>
                  </div>
                );
              })
            )}
          </Card>
        </Col>
      </Row>

      {/* Join Team Modal */}
      <Modal
        title="Join đội có sẵn"
        open={joinModalOpen}
        onCancel={() => { setJoinModalOpen(false); joinForm.resetFields(); }}
        footer={null}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Nhập mã đội do leader cung cấp để gửi yêu cầu tham gia.
        </Text>
        <Form form={joinForm} layout="vertical" onFinish={handleJoinTeam}>
          <Form.Item name="team_code" label="Mã đội" rules={[{ required: true, message: 'Vui lòng nhập mã đội' }]}>
            <Input placeholder="Nhập mã đội..." size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={joinLoading} block>
            Gửi yêu cầu tham gia
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
