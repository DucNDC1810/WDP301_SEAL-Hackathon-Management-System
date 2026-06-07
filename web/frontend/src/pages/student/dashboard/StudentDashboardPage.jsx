import { useEffect, useState } from 'react';
import {
  Avatar, Button, Card, Divider, Empty, Form, Input, message,
  Modal, Select, Spin, Table, Tag, Tooltip, Typography,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, CopyOutlined, CrownOutlined,
  FileTextOutlined, MailOutlined, PlusOutlined, TeamOutlined, TrophyOutlined, UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import ProfilePage from '../profile/ProfilePage';
import { TopicCard } from './TopicCard';
import { TopicActions } from './TopicActions';
import './StudentDashboardPage.css';

const { Title, Text } = Typography;

const STATUS_COLOR = { pending: 'orange', confirmed: 'green', disqualified: 'red' };
const STATUS_LABEL = { pending: 'Chờ duyệt', confirmed: 'Đã xác nhận', disqualified: 'Bị loại' };

const getContestPhase = (contest) => {
  if (!contest) return null;
  const now   = Date.now();
  const reg   = new Date(contest.registration_deadline);
  const start = new Date(contest.start_date);
  const end   = new Date(contest.end_date);
  if (now < reg)   return { label: 'Hạn đăng ký',   date: reg,   hours: Math.floor((reg   - now) / 3_600_000) };
  if (now < start) return { label: 'Ngày bắt đầu',  date: start, hours: Math.floor((start - now) / 3_600_000) };
  if (now < end)   return { label: 'Ngày kết thúc', date: end,   hours: Math.floor((end   - now) / 3_600_000) };
  return null;
};

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
        setContests(list);
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
    if (!openContests.length) { message.warning('Không có cuộc thi nào đang mở'); return; }
    setCreateLoading(true);
    try {
      const contestId = values.contest_id ?? openContests[0]._id;
      await request(`/api/teams/contests/${contestId}`, {
        method: 'POST',
        body: { team_name: values.team_name, members: [{ email: user.email, full_name: user.full_name }] },
      });
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

  const verifiedCount  = myTeam?.members?.filter((m) => m.email_verified).length ?? 0;
  const totalMembers   = myTeam?.members?.length ?? 0;
  const isLeader       = myTeam?.leader_id?._id === user?._id || myTeam?.leader_id === user?._id;
  const openContests   = contests.filter((c) => c.status === 'open');
  const contestId      = myTeam?.contest_id?._id ?? myTeam?.contest_id;
  const activeContest  = myTeam ? (contests.find((c) => c._id === contestId) ?? null) : null;
  const contestPhase   = getContestPhase(activeContest);

  const memberColumns = [
    {
      key: 'avatar',
      width: 48,
      render: (_, record) => {
        const populated = record.user_id && typeof record.user_id === 'object' ? record.user_id : null;
        const avatarSrc = populated?.avatar_url || undefined;
        const initials  = (populated?.full_name || record.full_name || '?')[0].toUpperCase();
        return (
          <Avatar
            src={avatarSrc}
            icon={<UserOutlined />}
            style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)' }}
          >
            {initials}
          </Avatar>
        );
      },
    },
    {
      title: 'Tên',
      key: 'name',
      render: (_, record) => {
        const populated = record.user_id && typeof record.user_id === 'object' ? record.user_id : null;
        const name = populated?.full_name || record.full_name || '—';
        return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong>{name}</Text>
          {(() => {
            const lid = myTeam?.leader_id?._id?.toString() ?? myTeam?.leader_id?.toString();
            const uid = record.user_id?._id?.toString() ?? record.user_id?.toString();
            return lid && uid && lid === uid;
          })() && (
            <CrownOutlined style={{ color: '#f59e0b', fontSize: 14 }} title="Leader" />
          )}
        </div>
        );
      },
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

      {/* Contest banner */}
      {activeContest && (
        <div className="dashboard__contest-banner">
          <div className="dashboard__contest-banner__left">
            <TrophyOutlined className="dashboard__contest-banner__icon" />
            <span className="dashboard__contest-banner__name">{activeContest.title}</span>
          </div>
          {contestPhase ? (
            <div className="dashboard__contest-banner__right">
              <span className="dashboard__contest-banner__phase">{contestPhase.label}:</span>
              <span className="dashboard__contest-banner__date">
                {contestPhase.date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="dashboard__contest-banner__hours">· còn {contestPhase.hours} giờ</span>
            </div>
          ) : (
            <div className="dashboard__contest-banner__right">
              <span className="dashboard__contest-banner__phase">Cuộc thi đã kết thúc</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="dashboard__stats">
        <div className="dashboard__stat-card" style={{ width: 'fit-content', flexShrink: 0 }}>
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
        <div className="dashboard__stat-card dashboard__stat-card--topic">
          {(() => {
            if (!myTeam) return (
              <>
                <div className="dashboard__stat-icon dashboard__stat-icon--topic"><FileTextOutlined /></div>
                <div>
                  <div className="dashboard__stat-val" style={{ color: '#64748b' }}>Chưa có đội</div>
                  <div className="dashboard__stat-label">Đề tài</div>
                </div>
              </>
            );

            const topic = myTeam.topic_id && typeof myTeam.topic_id === 'object' ? myTeam.topic_id : null;
            const topicContestId = myTeam.contest_id?._id ?? myTeam.contest_id;
            const beforeStart = activeContest ? Date.now() < new Date(activeContest.start_date) : false;
            const STATUS_TAG = {
              active:   <Tag color="success" icon={<CheckCircleOutlined />}>Đã xác nhận</Tag>,
              approved: <Tag color="success" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>,
              pending:  <Tag color="warning" icon={<ClockCircleOutlined />}>Chờ duyệt</Tag>,
              rejected: <Tag color="error"   icon={<ClockCircleOutlined />}>Từ chối</Tag>,
            };

            if (topic) return (
              <>
                <div className="dashboard__stat-icon dashboard__stat-icon--topic"><FileTextOutlined /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dashboard__stat-val" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                      {topic.title}
                    </Text>
                    {STATUS_TAG[topic.status]}
                  </div>
                  <div className="dashboard__stat-label">Đề tài · {topic.difficulty ?? ''}</div>
                </div>
                {topic.status === 'rejected' && beforeStart && (
                  <TopicActions teamId={myTeam._id} contestId={topicContestId} onSuccess={refresh} />
                )}
              </>
            );

            if (!beforeStart) return (
              <>
                <div className="dashboard__stat-icon dashboard__stat-icon--topic"><FileTextOutlined /></div>
                <div>
                  <div className="dashboard__stat-val" style={{ color: '#64748b' }}>Chưa có đề tài</div>
                  <div className="dashboard__stat-label">Đề tài · Contest đã bắt đầu</div>
                </div>
              </>
            );

            return (
              <>
                <div className="dashboard__stat-icon dashboard__stat-icon--topic"><FileTextOutlined /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dashboard__stat-val" style={{ color: '#64748b' }}>Chưa có đề tài</div>
                  <div className="dashboard__stat-label">Đề tài</div>
                </div>
                <TopicActions teamId={myTeam._id} contestId={topicContestId} onSuccess={refresh} />
              </>
            );
          })()}
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
        {openContests.length === 0 ? (
          <Empty description="Không có cuộc thi nào đang mở để đăng ký đội" />
        ) : (
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreate}
            initialValues={{ contest_id: openContests[0]?._id }}
          >
            {openContests.length === 1 ? (
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Cuộc thi: <Text strong>{openContests[0].title}</Text>
              </Text>
            ) : (
              <Form.Item name="contest_id" label="Chọn cuộc thi" rules={[{ required: true, message: 'Chọn cuộc thi' }]}>
                <Select size="large" placeholder="Chọn cuộc thi...">
                  {openContests.map((c) => (
                    <Select.Option key={c._id} value={c._id}>{c.title}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
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
