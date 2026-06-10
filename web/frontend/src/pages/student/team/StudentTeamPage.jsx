import { useEffect, useState } from 'react';
import {
  Button, Form, Input, message,
  Modal, Select, Tag,
} from 'antd';
import {
  CrownOutlined, MailOutlined, UserDeleteOutlined,
} from '@ant-design/icons';
import { useAuth }  from '../../../context/AuthContext';
import { useApi }   from '../../../hooks/useApi';
import { ProposeTopicModal } from '../dashboard/ProposeTopicModal';
import { SelectTopicModal }  from '../dashboard/SelectTopicModal';

const Ico = ({ d, size = 28, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const TEAM_ICO = [
  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
  'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  'M23 21v-2a4 4 0 0 0-3-3.87',
  'M16 3.13a4 4 0 0 1 0 7.75',
];
const PLUS_ICO  = ['M12 5v14', 'M5 12h14'];
const MAIL_ICO  = 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6';
const LEAVE_ICO = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9';

const STATUS_COLOR = { pending: 'orange', confirmed: 'green', disqualified: 'red' };
const STATUS_LABEL = { pending: 'Chờ duyệt', confirmed: 'Đã xác nhận', disqualified: 'Bị loại' };

const card      = { background: '#0c1524', border: '1px solid #162036', borderRadius: 12, padding: '20px 24px' };
const label     = { fontSize: '0.72rem', fontWeight: 700, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 };
const gradTitle = { background: 'linear-gradient(90deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' };
const tableWrap = { background: '#0c1524', border: '1px solid #162036', borderRadius: 12, overflow: 'hidden' };
const cardHead  = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #162036' };
const alertWarn = { padding: '12px 16px', borderRadius: 8, fontSize: '0.83rem', display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', color: '#c9d6e8' };
const btn       = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 6, border: '1px solid #00d4ff40', background: 'transparent', color: '#00d4ff', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const btnSm     = { ...btn, padding: '5px 12px', fontSize: '0.78rem' };
const btnSmPrimary = { ...btnSm, border: 'none', background: 'linear-gradient(135deg,#00d4ff,#0099cc)', color: '#060b16' };
const btnDanger = { ...btn, borderColor: 'rgba(239,68,68,.4)', color: '#f87171' };
const av        = { borderRadius: '50%', background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 28, height: 28, fontSize: '0.72rem' };

export const StudentTeamPage = () => {
  const { user }    = useAuth();
  const { request } = useApi();

  const [team,          setTeam]          = useState(null);
  const [contests,      setContests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshKey,    setRefreshKey]    = useState(0);

  const [createOpen,    setCreateOpen]    = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm]  = Form.useForm();

  const [joinOpen,      setJoinOpen]      = useState(false);
  const [joinLoading,   setJoinLoading]   = useState(false);
  const [joinForm]    = Form.useForm();

  const [inviteOpen,    setInviteOpen]    = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm]  = Form.useForm();

  const [proposeOpen, setProposeOpen] = useState(false);
  const [selectOpen,  setSelectOpen]  = useState(false);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [teamsRes, contestsRes] = await Promise.all([
          request('/api/teams/me'),
          request('/api/contests?status=open'),
        ]);
        const teams = Array.isArray(teamsRes)    ? teamsRes    : teamsRes?.data    ?? [];
        const open  = Array.isArray(contestsRes) ? contestsRes : contestsRes?.data ?? [];
        setContests(open);

        const found = teams.find((t) =>
          open.some((c) => (c._id ?? c) === (t.contest_id?._id ?? t.contest_id))
        ) ?? teams[0] ?? null;
        setTeam(found);
      } catch (_) {
        message.error('Không thể tải thông tin đội thi');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const handleCreate = async (values) => {
    setCreateLoading(true);
    try {
      const res     = await request(`/api/teams/contests/${values.contest_id}`, {
        method: 'POST',
        body:   { team_name: values.team_name },
      });
      const newTeam = res?.data ?? res;

      if (values.emails?.length) {
        await Promise.allSettled(
          values.emails.map((email) =>
            request(`/api/teams/${newTeam._id}/members`, {
              method: 'POST', body: { email },
            })
          )
        );
      }

      message.success('Tạo đội thành công! Chờ admin phê duyệt.');
      setCreateOpen(false);
      createForm.resetFields();
      refresh();
    } catch (err) {
      message.error(err.message || 'Không thể tạo đội');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async (values) => {
    setJoinLoading(true);
    try {
      await request('/api/teams/join', {
        method: 'POST', body: { team_id: values.team_code },
      });
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

  const handleInvite = async (values) => {
    setInviteLoading(true);
    try {
      await request(`/api/teams/${team._id}/members`, {
        method: 'POST', body: { email: values.email },
      });
      message.success(`Đã gửi lời mời tới ${values.email}`);
      setInviteOpen(false);
      inviteForm.resetFields();
      refresh();
    } catch (err) {
      message.error(err.message || 'Không thể gửi lời mời');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleKick = (member) => {
    Modal.confirm({
      title:   'Kick thành viên',
      content: `Xác nhận kick ${member.full_name || member.email} khỏi đội?`,
      okText:  'Kick',
      okButtonProps: { danger: true },
      onOk: () => {
        message.info('Tính năng kick thành viên đang được cập nhật bởi backend team.');
      },
    });
  };

  const handleLeave = () => {
    Modal.confirm({
      title:   'Rời đội',
      content: isLeader
        ? 'Bạn là leader — vui lòng liên hệ admin để chuyển quyền trước khi rời đội.'
        : 'Bạn có chắc muốn rời khỏi đội không?',
      okText:  'Rời đội',
      okButtonProps: { danger: true },
      onOk: () => {
        if (isLeader) {
          message.info('Vui lòng liên hệ admin để chuyển quyền leader.');
          return;
        }
        message.info('Tính năng rời đội đang được cập nhật bởi backend team.');
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#162036] border-t-[#00d4ff] animate-spin" />
      </div>
    );
  }

  const isLeader = team && user &&
    (team.leader_id?._id ?? team.leader_id) === user._id;

  // ── No team ───────────────────────────────────────────────────────────────
  if (!team) {
    return (
      <div className="flex flex-col gap-5 p-7 bg-[#060b16] min-h-full">
        <h2 className="text-2xl font-extrabold m-0" style={gradTitle}>Đội thi</h2>

        <div style={{ display: 'flex', gap: 16 }}>
          {/* Create team card */}
          <div
            style={{ ...card, flex: 1, cursor: 'pointer', textAlign: 'center', padding: '2rem 1.5rem', borderStyle: 'dashed', borderColor: 'rgba(0,212,255,.35)' }}
            onClick={() => setCreateOpen(true)}
          >
            <div style={{ color: '#00d4ff', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <Ico d={TEAM_ICO} size={36} />
            </div>
            <h4 style={{ color: '#c9d6e8', fontWeight: 600, margin: '0 0 8px', fontSize: '1rem' }}>Tạo đội mới</h4>
            <span style={{ color: '#4a6080', fontSize: '0.83rem' }}>Đặt tên đội và mời thành viên ngay từ đầu</span>
          </div>

          {/* Join team card */}
          <div
            style={{ ...card, flex: 1, cursor: 'pointer', textAlign: 'center', padding: '2rem 1.5rem', borderStyle: 'dashed', borderColor: 'rgba(167,139,250,.35)' }}
            onClick={() => setJoinOpen(true)}
          >
            <div style={{ color: '#a78bfa', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <Ico d={PLUS_ICO} size={36} />
            </div>
            <h4 style={{ color: '#c9d6e8', fontWeight: 600, margin: '0 0 8px', fontSize: '1rem' }}>Tham gia đội</h4>
            <span style={{ color: '#4a6080', fontSize: '0.83rem' }}>Nhập mã đội để tham gia</span>
          </div>
        </div>

        {/* Create modal */}
        <Modal
          title="Tạo đội mới"
          open={createOpen}
          onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
          onOk={() => createForm.submit()}
          confirmLoading={createLoading}
          okText="Tạo đội"
        >
          <Form form={createForm} layout="vertical" onFinish={handleCreate}>
            <Form.Item
              name="contest_id"
              label="Cuộc thi"
              rules={[{ required: true, message: 'Chọn cuộc thi' }]}
            >
              <Select placeholder="Chọn cuộc thi">
                {contests.map((c) => (
                  <Select.Option key={c._id} value={c._id}>{c.title}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="team_name"
              label="Tên đội"
              rules={[{ required: true, message: 'Nhập tên đội' }]}
            >
              <Input placeholder="Team Alpha" />
            </Form.Item>
            <Form.Item name="emails" label="Mời thành viên (tùy chọn)">
              <Select
                mode="tags"
                placeholder="Nhập email rồi nhấn Enter"
                tokenSeparators={[',']}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Join modal */}
        <Modal
          title="Tham gia đội"
          open={joinOpen}
          onCancel={() => { setJoinOpen(false); joinForm.resetFields(); }}
          onOk={() => joinForm.submit()}
          confirmLoading={joinLoading}
          okText="Tham gia"
        >
          <Form form={joinForm} layout="vertical" onFinish={handleJoin}>
            <Form.Item
              name="team_code"
              label="Mã đội (Team ID)"
              rules={[{ required: true, message: 'Nhập mã đội' }]}
            >
              <Input placeholder="Dán mã đội vào đây" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

  // ── Pending ───────────────────────────────────────────────────────────────
  if (team.status === 'pending') {
    return (
      <div className="flex flex-col gap-5 p-7 bg-[#060b16] min-h-full">
        <h2 className="text-2xl font-extrabold m-0" style={gradTitle}>Đội thi</h2>

        <div style={alertWarn}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 600, color: '#c9d6e8' }}>Đội "{team.team_name}" đang chờ admin phê duyệt</span>
            <span style={{ color: '#4a6080', fontSize: '0.78rem' }}>Sau khi được duyệt, bạn có thể đăng ký đề tài và nộp bài.</span>
          </div>
        </div>

        <div style={card}>
          <span style={label}>Thành viên đã mời</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {team.members?.map((m) => (
              <Tag key={m.email} icon={<MailOutlined />} color={m.email_verified ? 'green' : 'default'}>
                {m.email}
              </Tag>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 p-7 bg-[#060b16] min-h-full">
      <h2 className="text-2xl font-extrabold m-0" style={gradTitle}>Đội thi</h2>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left column */}
        <div style={{ flex: '0 0 38%', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Team info card */}
            <div style={card}>
              <span style={label}>Đội thi</span>
              <h3 style={{ color: '#c9d6e8', fontWeight: 600, fontSize: '1.15rem', margin: '4px 0 10px' }}>
                {team.team_name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tag color={STATUS_COLOR[team.status]}>{STATUS_LABEL[team.status]}</Tag>
                {team.pool_id?.pool_name && <Tag>{team.pool_id.pool_name}</Tag>}
              </div>
            </div>

            {/* Topic card */}
            <div style={card}>
              <span style={label}>Đề tài</span>
              {team.topic_id ? (
                <>
                  <div style={{ color: '#c9d6e8', fontWeight: 600, marginBottom: 4 }}>
                    {team.topic_id.title}
                  </div>
                  <div style={{ color: '#4a6080', fontSize: '0.83rem', marginBottom: 8 }}>
                    {team.topic_id.description}
                  </div>
                  <Tag color={team.topic_id.status === 'approved' ? 'green' : 'orange'}>
                    {team.topic_id.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                  </Tag>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ color: '#4a6080', fontSize: '0.83rem' }}>Chưa có đề tài</span>
                  {isLeader && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button style={btnSm} onClick={() => setProposeOpen(true)}>
                        <Ico d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" size={14} />
                        Đề xuất đề tài
                      </button>
                      <button style={btnSmPrimary} onClick={() => setSelectOpen(true)}>
                        <Ico d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" size={14} />
                        Chọn đề tài
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column — members table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={tableWrap}>
            <div style={cardHead}>
              <span style={{ ...label, margin: 0 }}>
                Thành viên ({team.members?.length ?? 0})
              </span>
              {isLeader && (
                <button style={btnSm} onClick={() => setInviteOpen(true)}>
                  <Ico d={MAIL_ICO} size={13} />
                  Mời thành viên
                </button>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: '#0a1220', borderBottom: '1px solid #162036' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px' }}>Thành viên</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px', width: 100 }}>Role</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px', width: 110 }}>Xác minh</th>
                  {isLeader && <th style={{ width: 50 }} />}
                </tr>
              </thead>
              <tbody>
                {(team.members ?? []).map((m) => {
                  const isTeamLeader = (m.user_id?._id ?? m.user_id) === (team.leader_id?._id ?? team.leader_id);
                  const isSelf       = (m.user_id?._id ?? m.user_id) === user._id;
                  return (
                    <tr key={m.email} style={{ borderBottom: '1px solid #0f1a2e' }}>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={av}>
                            {(m.full_name?.[0] ?? m.email?.[0] ?? 'U').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: '#c9d6e8', lineHeight: 1.3 }}>
                              {m.full_name || '—'}
                            </div>
                            <div style={{ color: '#4a6080', fontSize: '0.72rem' }}>
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        {isTeamLeader
                          ? <Tag icon={<CrownOutlined />} color="gold">Leader</Tag>
                          : <Tag>Member</Tag>
                        }
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        {m.email_verified
                          ? <Tag color="green">Đã xác minh</Tag>
                          : <Tag color="orange">Chờ</Tag>
                        }
                      </td>
                      {isLeader && (
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          {!isSelf && (
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<UserDeleteOutlined />}
                              onClick={() => handleKick(m)}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Leave team */}
      <div style={{ marginTop: 24 }}>
        <button style={btnDanger} onClick={handleLeave}>
          <Ico d={LEAVE_ICO} size={15} />
          Rời đội
        </button>
      </div>

      {/* Invite modal */}
      <Modal
        title="Mời thành viên"
        open={inviteOpen}
        onCancel={() => { setInviteOpen(false); inviteForm.resetFields(); }}
        onOk={() => inviteForm.submit()}
        confirmLoading={inviteLoading}
        okText="Gửi lời mời"
      >
        <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
          <Form.Item
            name="email"
            label="Email thành viên"
            rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="member@edu.vn" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Topic modals */}
      {team && (
        <>
          <ProposeTopicModal
            open={proposeOpen}
            onClose={() => setProposeOpen(false)}
            teamId={team._id}
            onSuccess={refresh}
          />
          <SelectTopicModal
            open={selectOpen}
            onClose={() => setSelectOpen(false)}
            teamId={team._id}
            contestId={team.contest_id?._id ?? team.contest_id}
            onSuccess={refresh}
          />
        </>
      )}
    </div>
  );
};
