import { useEffect, useState } from 'react';
import {
  Avatar, Button, Card, Divider, Empty, Form, Input, message,
  Modal, Spin, Table, Tag, Tooltip, Typography,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, CopyOutlined,
  MailOutlined, PlusOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import ProfilePage from '../profile/ProfilePage';
import './StudentDashboardPage.css';

const { Title, Text } = Typography;

const STATUS_COLOR = { pending: 'orange', confirmed: 'green', disqualified: 'red' };
const STATUS_LABEL = { pending: 'Chờ duyệt', confirmed: 'Đã xác nhận', disqualified: 'Bị loại' };

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { request } = useApi();
  const [myTeam,         setMyTeam]         = useState(null);
  const [loading,        setLoading]         = useState(true);
  const [joinOpen,       setJoinOpen]        = useState(false);
  const [joinLoading,    setJoinLoading]     = useState(false);
  const [createOpen,     setCreateOpen]      = useState(false);
  const [createLoading,  setCreateLoading]   = useState(false);
  const [inviteOpen,     setInviteOpen]      = useState(false);
  const [inviteLoading,  setInviteLoading]   = useState(false);
  const [contests,       setContests]        = useState([]);
  const [refreshKey,     setRefreshKey]      = useState(0);

  const [joinForm]   = Form.useForm();
  const [createForm] = Form.useForm();
  const [inviteForm] = Form.useForm();

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [teamsRes, contestsRes] = await Promise.allSettled([
        request('/api/teams/me'),
        request('/api/contests'),
      ]);
      if (!active) return;
      if (teamsRes.status === 'fulfilled') {
        const list = Array.isArray(teamsRes.value) ? teamsRes.value : teamsRes.value?.data ?? [];
        setMyTeam(list[0] || null);
      }
      if (contestsRes.status === 'fulfilled') {
        const list = Array.isArray(contestsRes.value) ? contestsRes.value : contestsRes.value?.data ?? [];
        setContests(list.filter((c) => c.status === 'open'));
      }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleJoin = async (values) => {
    setJoinLoading(true);
    try {
      await request('/api/teams/join', { method: 'POST', body: { team_code: values.team_code } });
      message.success('Tham gia đội thành công!');
      setJoinOpen(false);
      joinForm.resetFields();
      refresh();
    } catch (err) {
      message.error(err.message || 'Mã đội không hợp lệ');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreate = async (values) => {
    if (!contests.length) { message.warning('Không có cuộc thi nào đang mở'); return; }
    setCreateLoading(true);
    try {
      await request(`/api/teams/contests/${contests[0]._id}`, { method: 'POST', body: { team_name: values.team_name } });
      message.success('Tạo đội thành công!');
      setCreateOpen(false);
      createForm.resetFields();
      refresh();
    } catch (err) {
      message.error(err.message || 'Không thể tạo đội');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInvite = async (values) => {
    setInviteLoading(true);
    try {
      await request(`/api/teams/${myTeam._id}/members`, { method: 'POST', body: { email: values.email } });
      message.success('Đã gửi lời mời qua email!');
      setInviteOpen(false);
      inviteForm.resetFields();
      refresh();
    } catch (err) {
      message.error(err.message || 'Không thể gửi lời mời');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyTeamCode = () => {
    navigator.clipboard.writeText(myTeam._id);
    message.success('Đã copy mã đội!');
  };

  const verifiedCount = myTeam?.members?.filter((m) => m.email_verified).length ?? 0;
  const totalMembers  = myTeam?.members?.length ?? 0;
  const isLeader      = myTeam?.leader_id?._id === user?._id || myTeam?.leader_id === user?._id;

  const memberColumns = [
    {
      key: 'avatar',
      width: 48,
      render: (_, record) => (
        <Avatar
          src={record.avatar_url || undefined}
          icon={<UserOutlined />}
          style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)' }}
        >
          {(record.full_name?.[0] || '?').toUpperCase()}
        </Avatar>
      ),
    },
    {
      title: 'Tên',
      key: 'name',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong>{record.full_name || '—'}</Text>
          {(record.user_id === myTeam?.leader_id || record.user_id?._id === myTeam?.leader_id || record.user_id === myTeam?.leader_id?._id) && (
            <Tag color="gold" style={{ fontSize: 11, padding: '0 6px' }}>Leader</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => <Text type="secondary" style={{ fontSize: 13 }}>{email}</Text>,
    },
    {
      title: 'Trạng thái',
      key: 'verified',
      width: 140,
      render: (_, record) => record.email_verified
        ? <Tag color="green" icon={<CheckCircleOutlined />}>Đã xác nhận</Tag>
        : <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ xác nhận</Tag>,
    },
  ];

  if (loading) {
    return (
      <div className="dashboard__loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Welcome */}
      <div className="dashboard__welcome">
        <div className="dashboard__welcome-avatar">
          {(user?.full_name?.[0] || 'S').toUpperCase()}
        </div>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Xin chào, {user?.full_name?.split(' ').pop()} 👋
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>{user?.email}</Text>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard__stats">
        <div className="dashboard__stat-card">
          <div className="dashboard__stat-icon dashboard__stat-icon--team"><TeamOutlined /></div>
          <div>
            <div className="dashboard__stat-val">
              {myTeam
                ? <Tag color={STATUS_COLOR[myTeam.status]}>{STATUS_LABEL[myTeam.status]}</Tag>
                : <Tag color="default">Chưa có đội</Tag>}
            </div>
            <div className="dashboard__stat-label">Trạng thái đội</div>
          </div>
        </div>
        <div className="dashboard__stat-card">
          <div className="dashboard__stat-icon dashboard__stat-icon--member"><CheckCircleOutlined /></div>
          <div>
            <div className="dashboard__stat-val dashboard__stat-num">
              {myTeam ? `${verifiedCount}/${totalMembers}` : '—'}
            </div>
            <div className="dashboard__stat-label">Thành viên xác nhận</div>
          </div>
        </div>
      </div>

      {/* Team section */}
      <Card
        className="dashboard__card"
        style={{ marginBottom: 24 }}
        title={<><TeamOutlined style={{ marginRight: 8 }} />Đội thi của tôi</>}
        extra={
          myTeam && isLeader && (
            <Button
              type="primary"
              icon={<MailOutlined />}
              onClick={() => setInviteOpen(true)}
            >
              Mời thành viên
            </Button>
          )
        }
      >
        {!myTeam ? (
          <div className="dashboard__no-team">
            <Empty description="Bạn chưa tham gia đội nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            <div className="dashboard__team-actions">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                Tạo đội mới
              </Button>
              <Button onClick={() => setJoinOpen(true)}>
                Tham gia đội có sẵn
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="dashboard__team-header" style={{ marginBottom: 16 }}>
              <div>
                <Text strong style={{ fontSize: 18 }}>{myTeam.team_name}</Text>
                <Tag color={STATUS_COLOR[myTeam.status]} style={{ marginLeft: 10 }}>
                  {STATUS_LABEL[myTeam.status]}
                </Tag>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Mã đội:</Text>
                <Text code style={{ fontSize: 12 }}>{myTeam._id}</Text>
                <Tooltip title="Copy mã đội">
                  <Button size="small" icon={<CopyOutlined />} onClick={copyTeamCode} />
                </Tooltip>
              </div>
            </div>

            <Table
              dataSource={myTeam.members || []}
              columns={memberColumns}
              rowKey="email"
              pagination={false}
              size="small"
              className="dashboard__member-table"
            />

            {myTeam.status === 'pending' && (
              <Text type="warning" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
                ⏳ Đội đang chờ admin duyệt.
              </Text>
            )}
          </>
        )}
      </Card>

      {/* Profile section */}
      <Divider orientation="left" style={{ fontSize: 16, fontWeight: 600 }}>
        Hồ sơ cá nhân
      </Divider>
      <div>
        <ProfilePage />
      </div>

      {/* Join modal */}
      <Modal
        title="Tham gia đội có sẵn"
        open={joinOpen}
        onCancel={() => { setJoinOpen(false); joinForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={joinForm} layout="vertical" onFinish={handleJoin}>
          <Form.Item name="team_code" label="Mã đội" rules={[{ required: true, message: 'Nhập mã đội' }]}>
            <Input placeholder="Nhập mã đội do leader cung cấp" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={joinLoading} block>
            Tham gia
          </Button>
        </Form>
      </Modal>

      {/* Create modal */}
      <Modal
        title="Tạo đội mới"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        {contests.length === 0 ? (
          <Empty description="Không có cuộc thi nào đang mở để đăng ký đội" />
        ) : (
          <Form form={createForm} layout="vertical" onFinish={handleCreate}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Tham gia cuộc thi: <Text strong>{contests[0]?.title}</Text>
            </Text>
            <Form.Item name="team_name" label="Tên đội" rules={[{ required: true, message: 'Nhập tên đội' }]}>
              <Input placeholder="Tên đội của bạn" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={createLoading} block>
              Tạo đội
            </Button>
          </Form>
        )}
      </Modal>

      {/* Invite modal */}
      <Modal
        title="Mời thành viên"
        open={inviteOpen}
        onCancel={() => { setInviteOpen(false); inviteForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>Mã đội (chia sẻ cho thành viên để họ tự join):</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Input value={myTeam?._id} readOnly style={{ fontFamily: 'monospace', fontSize: 12 }} />
            <Button icon={<CopyOutlined />} onClick={copyTeamCode}>Copy</Button>
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }}>hoặc gửi email mời trực tiếp</Divider>

        <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
          <Form.Item
            name="email"
            label="Email thành viên"
            rules={[
              { required: true, message: 'Nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="email@example.com" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={inviteLoading} block icon={<MailOutlined />}>
            Gửi lời mời
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
