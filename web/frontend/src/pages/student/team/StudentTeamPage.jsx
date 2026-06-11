import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Tag, message, Slider, Rate } from 'antd';
import { CrownOutlined, MailOutlined, UserDeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import '../student.css';
import './StudentTeamPage.css';

// ── SVG helpers ─────────────────────────────────────────────────────────────
const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const MAIL_D  = 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6';
const LEAVE_D = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9';
const SETTINGS_D = ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'];
const TEAM_D  = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'];
const PLUS_D  = ['M12 5v14','M5 12h14'];

const STATUS_BADGE = {
  PENDING_MEMBERS:  { label: 'Chờ xác thực',  bg: '#7c3a00', color: '#f97316' },
  WAITING_APPROVAL: { label: 'Chờ duyệt',      bg: '#1e3a5f', color: '#60a5fa' },
  CONFIRMED:        { label: 'Đã xác nhận',    bg: '#064e3b', color: '#34d399' },
  REJECTED:         { label: 'Bị từ chối',     bg: '#3f1010', color: '#f87171' },
  DISQUALIFIED:     { label: 'Bị loại',        bg: '#3f1010', color: '#f87171' },
  ELIMINATED:       { label: 'Bị loại',        bg: '#3f1010', color: '#f87171' },
  ACTIVE:           { label: 'Đang hoạt động', bg: '#064e3b', color: '#34d399' },
};

const statusDesc = {
  WAITING_APPROVAL: 'Đội đang chờ Ban tổ chức phê duyệt. Hãy đảm bảo tất cả thành viên đã xác thực email.',
  REJECTED:         'Đội của bạn hiện đang bị từ chối. Trưởng nhóm có thể chỉnh sửa thông tin đội, thay đổi thành viên và bấm "Gửi yêu cầu tham gia" bên dưới để gửi yêu cầu duyệt lại.',
  ACTIVE:           'Đội đã sẵn sàng. Hãy đăng ký tham gia một cuộc thi để bắt đầu thi đấu.',
  CONFIRMED:        'Đội đã được xác nhận tham gia cuộc thi. Chúc bạn thi đấu tốt!',
  DISQUALIFIED:     'Đội đã bị loại khỏi cuộc thi.',
  ELIMINATED:       'Đội đã bị loại khỏi cuộc thi.',
};

const Avatar = ({ name, size = 36 }) => {
  const letter = (name || '?')[0].toUpperCase();
  const colors = ['#0e7490','#7c3aed','#059669','#d97706','#dc2626','#2563eb'];
  const bg = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.4, color: '#fff', flexShrink: 0 }}>
      {letter}
    </div>
  );
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m || 1} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
};

// ── Main Component ───────────────────────────────────────────────────────────
export const StudentTeamPage = () => {
  const { user }    = useAuth();
  const { request } = useApi();

  const [team,          setTeam]          = useState(null);
  const [contests,      setContests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshKey,    setRefreshKey]    = useState(0);

  // Modals
  const [createOpen,    setCreateOpen]    = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm]  = Form.useForm();

  const [joinOpen,      setJoinOpen]      = useState(false);
  const [joinLoading,   setJoinLoading]   = useState(false);
  const [joinForm]    = Form.useForm();

  const [inviteOpen,    setInviteOpen]    = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm]  = Form.useForm();

  // Team settings
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [teamName,  setTeamName]  = useState('');
  const [teamDesc,  setTeamDesc]  = useState('');
  const [teamField, setTeamField] = useState('Web Development');

  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerForm]  = Form.useForm();

  // Đánh giá đóng góp thành viên
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalMembers, setEvalMembers] = useState([]);
  const [evalSaving, setEvalSaving] = useState(false);

  // Horizontal active tab
  const [activeTab, setActiveTab] = useState('info');

  const refresh = () => setRefreshKey(k => k + 1);

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
        const found = teams.find(t => open.some(c => (c._id ?? c) === (t.contest_id?._id ?? t.contest_id))) ?? teams[0] ?? null;
        setTeam(found);
        if (found) { setTeamName(found.team_name || ''); setTeamDesc(found.description || ''); }
      } catch {
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
      const res = await request('/api/teams', { method: 'POST', body: { team_name: values.team_name, members: values.emails ? values.emails.map(e => ({ email: e })) : [] } });
      const t = res?.data ?? res;
      message.success(t.status === 'ACTIVE' ? 'Tạo đội thành công!' : 'Tạo đội thành công! Kiểm tra email để xác nhận thành viên.');
      setCreateOpen(false); createForm.resetFields(); refresh();
    } catch (err) { message.error(err.message || 'Không thể tạo đội'); }
    finally { setCreateLoading(false); }
  };

  const handleJoin = async (values) => {
    setJoinLoading(true);
    try {
      await request('/api/teams/join', { method: 'POST', body: { team_id: values.team_code } });
      message.success('Tham gia đội thành công!'); setJoinOpen(false); joinForm.resetFields(); refresh();
    } catch (err) { message.error(err.message || 'Mã đội không hợp lệ'); }
    finally { setJoinLoading(false); }
  };

  const handleInvite = async (values) => {
    setInviteLoading(true);
    try {
      await request(`/api/teams/${team._id}/members`, { method: 'POST', body: { email: values.email } });
      message.success(`Đã gửi lời mời tới ${values.email}`); setInviteOpen(false); inviteForm.resetFields(); refresh();
    } catch (err) { message.error(err.message || 'Không thể gửi lời mời'); }
    finally { setInviteLoading(false); }
  };

  const handleSaveSettings = async () => {
    if (!teamName.trim()) { message.warning('Tên đội không được để trống'); return; }
    setSettingsLoading(true);
    try {
      await request(`/api/teams/${team._id}`, { method: 'PUT', body: { team_name: teamName.trim() } });
      message.success('Đã lưu thay đổi!'); refresh();
    } catch (err) { message.error(err.message || 'Không thể cập nhật'); }
    finally { setSettingsLoading(false); }
  };

  const handleRegister = async (values) => {
    setRegisterLoading(true);
    try {
      await request(`/api/teams/${team._id}/register-contest`, { method: 'POST', body: { contest_id: values.contest_id } });
      message.success('Đăng ký thành công! Vui lòng chờ phê duyệt.'); registerForm.resetFields(); refresh();
    } catch (err) { message.error(err.message || 'Không thể đăng ký'); }
    finally { setRegisterLoading(false); }
  };

  const handleSaveContributions = async () => {
    const totalPct = evalMembers.reduce((sum, m) => sum + (m.contribution_percentage || 0), 0);
    if (totalPct !== 100) {
      message.error(`Tổng tỷ lệ đóng góp của cả đội phải bằng 100% (Hiện tại: ${totalPct}%)`);
      return;
    }

    setEvalSaving(true);
    try {
      const payload = evalMembers.map(m => ({
        email: m.email,
        contribution_percentage: m.contribution_percentage,
        contribution_rating: m.contribution_rating,
        contribution_note: m.contribution_note,
      }));
      await request(`/api/teams/${team._id}/contributions`, {
        method: 'PUT',
        body: { contributions: payload }
      });
      message.success('Cập nhật đánh giá đóng góp thành công!');
      setEvalOpen(false);
      refresh();
    } catch (err) {
      message.error(err.message || 'Không thể lưu đánh giá');
    } finally {
      setEvalSaving(false);
    }
  };

  const handleLeave = () => {
    Modal.confirm({
      title: 'Rời đội',
      content: isLeader ? 'Bạn là leader — vui lòng liên hệ admin để chuyển quyền trước khi rời đội.' : 'Bạn có chắc muốn rời khỏi đội không?',
      okText: 'Rời đội', okButtonProps: { danger: true },
      onOk: () => message.info(isLeader ? 'Vui lòng liên hệ admin.' : 'Tính năng đang được cập nhật.'),
    });
  };

  if (loading) return <div className="sp-loading"><div className="sp-spinner" /></div>;

  const isLeader = team && user && (team.leader_id?._id ?? team.leader_id) === user._id;

  // ── No team ─────────────────────────────────────────────────────────────
  if (!team) {
    return (
      <div className="stp-page">
        <div className="stp-header"><h2 className="stp-title">Đội thi</h2></div>
        <div className="stp-no-team-grid">
          <div className="stp-action-card" onClick={() => setCreateOpen(true)}>
            <Ico d={TEAM_D} size={40} sw={1.4} />
            <h4>Tạo đội mới</h4>
            <p>Đặt tên đội và mời thành viên ngay từ đầu</p>
          </div>
          <div className="stp-action-card stp-action-card--purple" onClick={() => setJoinOpen(true)}>
            <Ico d={PLUS_D} size={40} sw={1.4} />
            <h4>Tham gia đội</h4>
            <p>Nhập mã đội để tham gia</p>
          </div>
        </div>

        <Modal title="Tạo đội mới" open={createOpen} onCancel={() => { setCreateOpen(false); createForm.resetFields(); }} onOk={() => createForm.submit()} confirmLoading={createLoading} okText="Tạo đội">
          <Form form={createForm} layout="vertical" onFinish={handleCreate}>
            <Form.Item name="team_name" label="Tên đội" rules={[{ required: true, message: 'Nhập tên đội' }]}><Input placeholder="Team Alpha" /></Form.Item>
            <Form.Item name="emails" label="Mời thành viên (tùy chọn)"><Select mode="tags" placeholder="Nhập email rồi nhấn Enter" tokenSeparators={[',']} /></Form.Item>
          </Form>
        </Modal>

        <Modal title="Tham gia đội" open={joinOpen} onCancel={() => { setJoinOpen(false); joinForm.resetFields(); }} onOk={() => joinForm.submit()} confirmLoading={joinLoading} okText="Tham gia">
          <Form form={joinForm} layout="vertical" onFinish={handleJoin}>
            <Form.Item name="team_code" label="Mã đội (Team ID)" rules={[{ required: true, message: 'Nhập mã đội' }]}><Input placeholder="Dán mã đội vào đây" /></Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

  // ── Has team ─────────────────────────────────────────────────────────────
  const badge      = STATUS_BADGE[team.status] || STATUS_BADGE.ACTIVE;
  const desc       = statusDesc[team.status] || '';
  const verified   = team.members?.filter(m => m.user_id && m.user_id.profile_verify_status === 'approved') ?? [];
  const pending    = team.members?.filter(m => !m.user_id || m.user_id.profile_verify_status !== 'approved') ?? [];

  // Tabs Navigation
  const renderTabs = () => (
    <div className="stp-tabs-container">
      <button 
        type="button"
        className={`stp-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
        onClick={() => setActiveTab('info')}
      >
        📋 Thông tin chung
      </button>
      <button 
        type="button"
        className={`stp-tab-btn ${activeTab === 'members' ? 'active' : ''}`}
        onClick={() => setActiveTab('members')}
      >
        👥 Thành viên ({team.members?.length ?? 0})
      </button>
      <button 
        type="button"
        className={`stp-tab-btn ${activeTab === 'contributions' ? 'active' : ''}`}
        onClick={() => setActiveTab('contributions')}
      >
        ⭐️ Đánh giá đóng góp
      </button>
    </div>
  );

  return (
    <div className="stp-page">
      {/* Header */}
      <div className="stp-header">
        <h2 className="stp-title">Đội thi</h2>
        <div className="stp-header-actions" />
      </div>

      {renderTabs()}

      {/* Tab Content Panels */}
      <div className="stp-tab-content">
        {activeTab === 'info' && (
          <div className="stp-grid" style={{ gridTemplateColumns: isLeader ? '1fr 1fr' : '1fr', gap: '20px' }}>
            {/* Left Column: Team info & settings */}
            <div className="stp-col-left" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Team info card */}
              <div className="stp-card">
                <div className="stp-card-label">ĐỘI THI</div>
                <div className="stp-team-name">{team.team_name}</div>
                <span className="stp-status-badge" style={{ background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
                {desc && <p className="stp-team-desc">{desc}</p>}
                <button className="stp-leave-btn" onClick={handleLeave}>
                  <Ico d={LEAVE_D} size={14} />
                  Rời đội
                </button>
              </div>

              {/* Team settings card */}
              {isLeader && (
                <div className="stp-card">
                  <div className="stp-settings-title">
                    <Ico d={SETTINGS_D} size={18} />
                    Cấu hình đội thi
                  </div>

                  <div className="stp-form-row">
                    <div className="stp-form-group">
                      <label className="stp-form-label">Tên Đội</label>
                      <input className="stp-input" value={teamName} onChange={e => setTeamName(e.target.value)} />
                    </div>
                    <div className="stp-form-group">
                      <label className="stp-form-label">Lĩnh Vực</label>
                      <select className="stp-select" value={teamField} onChange={e => setTeamField(e.target.value)}>
                        <option>Web Development</option>
                        <option>Mobile App</option>
                        <option>AI / Machine Learning</option>
                        <option>Game Development</option>
                        <option>DevOps / Cloud</option>
                        <option>Khác</option>
                      </select>
                    </div>
                  </div>

                  <div className="stp-form-group">
                    <label className="stp-form-label">Mô tả đội thi</label>
                    <textarea className="stp-textarea" rows={4} placeholder="Mô tả ngắn gọn về đội của bạn..." value={teamDesc} onChange={e => setTeamDesc(e.target.value)} />
                  </div>

                  <div className="stp-form-actions">
                    <button className="stp-btn stp-btn--ghost" onClick={() => { setTeamName(team.team_name || ''); setTeamDesc(team.description || ''); }}>Hủy</button>
                    <button className="stp-btn stp-btn--cyan" onClick={handleSaveSettings} disabled={settingsLoading}>
                      {settingsLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Contest registration info */}
            <div className="stp-col-right" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Contest info or register card */}
              {(() => {
                if (team.status === 'CONFIRMED' || team.status === 'WAITING_APPROVAL') {
                  const contestTitle = team.contest_id?.title || 'Cuộc thi đã đăng ký';
                  const isConfirmed = team.status === 'CONFIRMED';
                  return (
                    <div className="stp-card">
                      <div className="stp-card-label" style={{ marginBottom: 12 }}>CUỘC THI ĐÃ ĐĂNG KÝ</div>
                      <div style={{ padding: '4px 0' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#fff', fontWeight: 600 }}>{contestTitle}</h4>
                        <span 
                          style={{ 
                            background: isConfirmed ? 'rgba(52,211,153,.15)' : 'rgba(251,146,60,.15)', 
                            color: isConfirmed ? '#34d399' : '#fb923c', 
                            border: `1px solid ${isConfirmed ? 'rgba(52,211,153,.3)' : 'rgba(251,146,60,.3)'}`,
                            padding: '4px 10px',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}
                        >
                          {isConfirmed ? '✓ Đã xác nhận tham gia' : '⏰ Chờ ban tổ chức duyệt'}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (team.status === 'ACTIVE' || team.status === 'REJECTED') {
                  const totalMembers   = team.members?.length ?? 0;
                  const verifiedCount  = team.members?.filter(m => m.user_id && m.user_id.profile_verify_status === 'approved').length ?? 0;
                  const canRegister    = totalMembers >= 4 && verifiedCount === totalMembers;
                  return (
                    <div className="stp-card">
                      <div className="stp-card-label" style={{ marginBottom: 6 }}>ĐĂNG KÝ CUỘC THI</div>

                      {!canRegister ? (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: '.83rem', color: '#94a3b8' }}>Thành viên đã xác thực thông tin</span>
                            <span style={{ fontSize: '.83rem', fontWeight: 700, color: verifiedCount === totalMembers && totalMembers >= 4 ? '#34d399' : '#fb923c' }}>
                              {verifiedCount}/{Math.max(totalMembers, 4)}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: 6, background: '#1e3a54', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
                            <div style={{ height: '100%', width: `${Math.min((totalMembers / 4) * 100, 100)}%`, background: totalMembers >= 4 ? '#34d399' : '#fb923c', borderRadius: 99, transition: 'width .4s' }} />
                          </div>
                          <div style={{ background: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.3)', borderRadius: 8, padding: '10px 14px' }}>
                            <p style={{ margin: 0, fontSize: '.8rem', color: '#fb923c', lineHeight: 1.5 }}>
                              ⚠ Cần đủ <strong>4 thành viên</strong> và tất cả phải <strong>xác thực thông tin</strong> (vào <a href="/dashboard/profile" style={{ color: '#60a5fa' }}>Hồ sơ</a> để cập nhật).
                              {totalMembers < 4 && ` (Còn thiếu ${4 - totalMembers} thành viên)`}
                              {totalMembers >= 4 && verifiedCount < totalMembers && ` (${totalMembers - verifiedCount} thành viên chưa xác thực)`}
                            </p>
                          </div>
                          {isLeader && totalMembers < 4 && (
                            <button className="stp-btn stp-btn--ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => setInviteOpen(true)}>
                              + Mời thêm thành viên
                            </button>
                          )}
                        </div>
                      ) : isLeader ? (
                        contests.length > 0 ? (
                          <Form form={registerForm} layout="vertical" onFinish={handleRegister} style={{ marginTop: 8 }}>
                            <p style={{ fontSize: '.83rem', color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.5 }}>
                              Chọn một cuộc thi đang mở để gửi yêu cầu tham gia. Đội sẽ chính thức tham gia sau khi được Ban tổ chức phê duyệt.
                            </p>
                            <Form.Item name="contest_id" label="Cuộc thi đang mở" rules={[{ required: true, message: 'Vui lòng chọn cuộc thi' }]}>
                              <Select placeholder="Chọn cuộc thi">
                                {contests.map(c => <Select.Option key={c._id} value={c._id}>{c.title}</Select.Option>)}
                              </Select>
                            </Form.Item>
                            <button type="submit" className="stp-btn stp-btn--cyan" style={{ width: '100%', justifyContent: 'center' }} disabled={registerLoading}>
                              {registerLoading ? 'Đang gửi...' : 'Gửi yêu cầu tham gia'}
                            </button>
                          </Form>
                        ) : (
                          <p style={{ fontSize: '.83rem', color: '#64748b', margin: '8px 0 0' }}>Hiện tại không có cuộc thi nào đang mở đăng ký.</p>
                        )
                      ) : (
                        <p style={{ fontSize: '.83rem', color: '#64748b', margin: '8px 0 0' }}>Vui lòng liên hệ Trưởng nhóm để thực hiện đăng ký tham gia một giải đấu đang mở.</p>
                      )}
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Members card */}
            <div className="stp-card">
              <div className="stp-card-head">
                <div className="stp-card-label" style={{ margin: 0 }}>
                  THÀNH VIÊN ({team.members?.length ?? 0})
                </div>
                {isLeader && (
                  <button className="stp-btn stp-btn--cyan stp-btn--sm" onClick={() => setInviteOpen(true)}>
                    <Ico d={MAIL_D} size={13} />
                    Mời thành viên
                  </button>
                )}
              </div>

              <table className="stp-table">
                <thead>
                  <tr>
                    <th>THÀNH VIÊN</th>
                    <th>ROLE</th>
                    <th>THÔNG TIN</th>
                    {isLeader && <th style={{ width: 36 }} />}
                  </tr>
                </thead>
                <tbody>
                  {(team.members ?? []).map(m => {
                    const isTeamLeader = (m.user_id?._id ?? m.user_id) === (team.leader_id?._id ?? team.leader_id);
                    const isSelf       = (m.user_id?._id ?? m.user_id) === user._id;
                    return (
                      <tr key={m.email}>
                        <td>
                          <div className="stp-member-cell">
                            <Avatar name={m.full_name || m.email} />
                            <div>
                              <div className="stp-member-name">{m.full_name || '—'}</div>
                              <div className="stp-member-email">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {isTeamLeader
                            ? <span className="stp-role-badge stp-role-badge--leader">LEADER</span>
                            : <span className="stp-role-badge stp-role-badge--member">MEMBER</span>
                          }
                        </td>
                        <td>
                          {m.user_id && m.user_id.profile_verify_status === 'approved'
                            ? <span className="stp-verify-badge stp-verify-badge--ok">ĐÃ XÁC THỰC</span>
                            : m.user_id && m.user_id.profile_verify_status === 'pending'
                              ? <span className="stp-verify-badge stp-verify-badge--pending" style={{ background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.3)', color: '#60a5fa' }}>CHỜ DUYỆT</span>
                              : isSelf
                                ? <a href="/dashboard/profile" style={{ textDecoration: 'none' }}>
                                    <span className="stp-verify-badge stp-verify-badge--pending" style={{ cursor: 'pointer' }}>CẦN XÁC THỰC →</span>
                                  </a>
                                : <span className="stp-verify-badge stp-verify-badge--pending">CẦN XÁC THỰC</span>
                          }
                        </td>
                        {isLeader && (
                          <td>
                            {!isSelf && (
                              <button className="stp-icon-btn" title="Tùy chọn">
                                <MoreOutlined />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pending invitations card */}
            {isLeader && pending.length > 0 && (
              <div className="stp-card">
                <div className="stp-card-head">
                  <div className="stp-pending-title">
                    <span style={{ color: '#facc15' }}>▶</span>
                    PENDING INVITATIONS
                  </div>
                  <span className="stp-pending-count">{pending.length} lời mời</span>
                </div>

                <div className="stp-invite-list">
                  {pending.map(m => (
                    <div key={m.email} className="stp-invite-item">
                      <div className="stp-member-cell">
                        <Avatar name={m.email} size={32} />
                        <div>
                          <div className="stp-member-name" style={{ fontSize: '0.85rem' }}>{m.email}</div>
                          <div className="stp-member-email">Sent {timeAgo(m.created_at || team.created_at)}</div>
                        </div>
                      </div>
                      <button className="stp-cancel-invite" title="Hủy lời mời" onClick={() => message.info('Tính năng đang cập nhật.')}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <p className="stp-invite-note">Bạn có thể mời tối đa 4 thành viên vào đội của mình.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contributions' && (
          <div className="stp-card">
            <div className="stp-card-head" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: 12 }}>
              <div className="stp-card-label" style={{ margin: 0 }}>
                ĐÁNH GIÁ ĐÓNG GÓP THÀNH VIÊN
              </div>
              {isLeader && (
                <button
                  type="button"
                  className="stp-btn stp-btn--cyan stp-btn--sm"
                  onClick={() => {
                    const initial = (team.members ?? []).map(m => ({
                      email: m.email,
                      full_name: m.full_name || m.email,
                      contribution_percentage: m.contribution_percentage ?? 0,
                      contribution_rating: m.contribution_rating ?? 5,
                      contribution_note: m.contribution_note ?? '',
                    }));
                    setEvalMembers(initial);
                    setEvalOpen(true);
                  }}
                >
                  ⚙ Đánh giá
                </button>
              )}
            </div>

            <div className="contributions-list" style={{ marginTop: 16 }}>
              {(team.members ?? []).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Chưa có thành viên nào.</p>
              ) : (
                (team.members ?? []).map(m => {
                  const pct = m.contribution_percentage ?? 0;
                  const rating = m.contribution_rating ?? 5;
                  const note = m.contribution_note || 'Chưa có nhận xét';
                  const name = m.full_name || m.email;

                  return (
                    <div key={m.email} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{name}</span>
                        <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700 }}>{pct}% đóng góp</span>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: 3 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <span>Đánh giá: <span style={{ color: '#fbbf24' }}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span></span>
                        <span style={{ fontStyle: 'italic', maxWidth: '75%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={note}>
                          "{note}"
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite modal */}
      <Modal title="Mời thành viên vào đội" open={inviteOpen} onCancel={() => { setInviteOpen(false); inviteForm.resetFields(); }} onOk={() => inviteForm.submit()} confirmLoading={inviteLoading} okText="Gửi lời mời">
        <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
          <Form.Item name="email" label="Email thành viên" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
            <Input prefix={<MailOutlined />} placeholder="member@edu.vn" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Member contribution evaluation modal */}
      <Modal
        title="Đánh giá đóng góp thành viên"
        open={evalOpen}
        onCancel={() => setEvalOpen(false)}
        onOk={handleSaveContributions}
        confirmLoading={evalSaving}
        okText="Lưu đánh giá"
        width={600}
        styles={{ body: { padding: '12px 0' } }}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 8px' }}>
            Nhập tỷ lệ phần trăm đóng góp, điểm đánh giá và nhận xét cho từng thành viên.
          </p>
          <div style={{
            background: evalMembers.reduce((sum, m) => sum + (m.contribution_percentage || 0), 0) === 100 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: evalMembers.reduce((sum, m) => sum + (m.contribution_percentage || 0), 0) === 100 ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: '#e2e8f0' }}>Tổng tỷ lệ đóng góp của cả đội:</span>
            <strong style={{ color: evalMembers.reduce((sum, m) => sum + (m.contribution_percentage || 0), 0) === 100 ? '#34d399' : '#f87171' }}>
              {evalMembers.reduce((sum, m) => sum + (m.contribution_percentage || 0), 0)}% / 100%
            </strong>
          </div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
          {evalMembers.map((m, idx) => (
            <div key={m.email} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 8,
              padding: 14,
              marginBottom: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{m.full_name || m.email}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{m.email}</span>
              </div>

              {/* Slider for percentage */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: 4 }}>
                  <span>Tỷ lệ đóng góp</span>
                  <strong style={{ color: '#38bdf8' }}>{m.contribution_percentage}%</strong>
                </div>
                <Slider
                  min={0}
                  max={100}
                  value={m.contribution_percentage}
                  onChange={(val) => {
                    const next = [...evalMembers];
                    next[idx].contribution_percentage = val;
                    setEvalMembers(next);
                  }}
                  tooltip={{ formatter: (v) => `${v}%` }}
                />
              </div>

              {/* Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Đánh giá sao:</span>
                <Rate
                  value={m.contribution_rating}
                  onChange={(val) => {
                    const next = [...evalMembers];
                    next[idx].contribution_rating = val;
                    setEvalMembers(next);
                  }}
                />
              </div>

              {/* Note */}
              <div>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Ghi chú nhận xét:</span>
                <Input
                  value={m.contribution_note}
                  placeholder="Nhập nhận xét đóng góp..."
                  onChange={(e) => {
                    const next = [...evalMembers];
                    next[idx].contribution_note = e.target.value;
                    setEvalMembers(next);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
