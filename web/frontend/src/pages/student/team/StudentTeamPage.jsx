import { useEffect, useState } from 'react';
import { App as AntdApp, Button, Form, Input, Modal, Select, Tag, Slider, Rate } from 'antd';
import { CrownOutlined, MailOutlined, UserDeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import '../student.css';
import './StudentTeamPage.css';
import { useTheme } from '../../../context/ThemeContext';
import { getStudentColors } from '../studentColors';

// ── SVG helpers ─────────────────────────────────────────────────────────────
const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const MAIL_D = 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6';
const SETTINGS_D = ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'];
const TEAM_D = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'];
const PLUS_D = ['M12 5v14', 'M5 12h14'];
const COPY_D = ['M9 9h10v10H9z', 'M5 15V5h10'];

const STATUS_BADGE = {
  PENDING_MEMBERS: { label: 'Chờ xác thực', bg: '#7c3a00', color: '#f97316' },
  WAITING_APPROVAL: { label: 'Chờ duyệt', bg: '#1e3a5f', color: '#60a5fa' },
  CONFIRMED: { label: 'Đã xác nhận', bg: '#064e3b', color: '#34d399' },
  REJECTED: { label: 'Bị từ chối', bg: '#3f1010', color: '#f87171' },
  DISQUALIFIED: { label: 'Bị loại', bg: '#3f1010', color: '#f87171' },
  ELIMINATED: { label: 'Bị loại', bg: '#3f1010', color: '#f87171' },
  ACTIVE: { label: 'Đang hoạt động', bg: '#064e3b', color: '#34d399' },
};

const statusDesc = {
  WAITING_APPROVAL: 'Đội đang chờ Ban tổ chức phê duyệt. Hãy đảm bảo tất cả thành viên đã xác thực email.',
  REJECTED: 'Đội của bạn hiện đang bị từ chối. Trưởng nhóm có thể chỉnh sửa thông tin đội, thay đổi thành viên và bấm "Gửi yêu cầu tham gia" bên dưới để gửi yêu cầu duyệt lại.',
  ACTIVE: 'Đội đã sẵn sàng. Hãy đăng ký tham gia một cuộc thi để bắt đầu thi đấu.',
  CONFIRMED: 'Đội đã được xác nhận tham gia cuộc thi. Chúc bạn thi đấu tốt!',
  DISQUALIFIED: 'Đội đã bị loại khỏi cuộc thi.',
  ELIMINATED: 'Đội đã bị loại khỏi cuộc thi.',
};

// Avatar with gradient background or image
const Avatar = ({ name, url, size = 36, radius = '50%' }) => {
  const letter = (name || '?')[0].toUpperCase();
  const palettes = [
    ['#0e7490', '#06b6d4'],
    ['#7c3aed', '#a855f7'],
    ['#059669', '#10b981'],
    ['#d97706', '#f59e0b'],
    ['#dc2626', '#f87171'],
    ['#2563eb', '#60a5fa'],
  ];
  const [from, to] = palettes[letter.charCodeAt(0) % palettes.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: `linear-gradient(135deg,${from},${to})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, color: '#fff', flexShrink: 0,
      fontFamily: "'Space Grotesk', sans-serif",
      boxShadow: `0 0 12px ${from}55`,
      overflow: 'hidden',
    }}>
      {url ? (
        <img
          src={url}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        letter
      )}
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
  const { user } = useAuth();
  const { request } = useApi();
  const { theme } = useTheme();
  const C = getStudentColors(theme);
  // Context-aware message/modal — the static antd APIs ignore ConfigProvider and
  // would stay dark while the page is in light mode.
  const { message, modal } = AntdApp.useApp();

  // Shared card style
  const cardStyle = {
    border: `1px solid ${C.line}`,
    borderRadius: 14,
    background: C.card,
    overflow: 'hidden',
  };

  // Shared input style
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${C.line}`, background: C.card,
    color: C.text, fontFamily: 'inherit', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.5px',
    color: C.dim, marginBottom: 5,
  };

  const [team, setTeam] = useState(null);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinForm] = Form.useForm();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm] = Form.useForm();

  // Team settings
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [teamName, setTeamName] = useState('');

  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerForm] = Form.useForm();

  // Đánh giá đóng góp thành viên
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalMembers, setEvalMembers] = useState([]);
  const [evalSaving, setEvalSaving] = useState(false);

  // Leave / Transfer leader
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferForm] = Form.useForm();

  // Pending team invitations (shown when no team)
  const [invitations, setInvitations] = useState([]);
  const [inviteActionLoading, setInviteActionLoading] = useState({});

  const refresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [teamsRes, contestsRes, invitesRes] = await Promise.all([
          request('/api/teams/me'),
          request('/api/contests?status=open'),
          request('/api/invitations/me').catch(() => ({ data: [] })),
        ]);
        const teams = Array.isArray(teamsRes) ? teamsRes : teamsRes?.data ?? [];
        const open = Array.isArray(contestsRes) ? contestsRes : contestsRes?.data ?? [];
        const invs = Array.isArray(invitesRes) ? invitesRes : invitesRes?.data ?? [];
        setContests(open);
        setInvitations(invs.filter(i => i.status === 'pending'));
        const found = teams.find(t => open.some(c => (c._id ?? c) === (t.contest_id?._id ?? t.contest_id))) ?? teams[0] ?? null;
        setTeam(found);
        if (found) setTeamName(found.team_name || '');
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
      await request('/api/teams/join', { method: 'POST', body: { team_code: values.team_code } });
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

  const handleLeaveTeam = async () => {
    setLeaveLoading(true);
    try {
      const res = await request(`/api/teams/${team._id}/leave`, { method: 'POST' });
      message.success(res?.message || 'Đã rời đội thành công');
      refresh();
    } catch (err) {
      message.error(err.message || 'Không thể rời đội');
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleAcceptInvite = async (inv) => {
    setInviteActionLoading(p => ({ ...p, [inv._id]: 'accept' }));
    try {
      await request(`/api/invitations/${inv._id}/accept`, { method: 'POST' });
      message.success('Đã chấp nhận lời mời! Chào mừng bạn vào đội.');
      refresh();
    } catch (err) {
      message.error(err.message || 'Không thể chấp nhận lời mời');
    } finally {
      setInviteActionLoading(p => { const n = { ...p }; delete n[inv._id]; return n; });
    }
  };

  const handleRejectInvite = async (inv) => {
    setInviteActionLoading(p => ({ ...p, [inv._id]: 'reject' }));
    try {
      await request(`/api/invitations/${inv._id}/reject`, { method: 'POST' });
      message.success('Đã từ chối lời mời.');
      setInvitations(p => p.filter(i => i._id !== inv._id));
    } catch (err) {
      message.error(err.message || 'Không thể từ chối lời mời');
    } finally {
      setInviteActionLoading(p => { const n = { ...p }; delete n[inv._id]; return n; });
    }
  };

  const handleDissolveTeam = () => {
    modal.confirm({
      title: 'Giải tán đội thi?',
      content: `Toàn bộ thành viên sẽ bị xóa khỏi đội "${team.team_name}". Hành động này không thể hoàn tác.`,
      okText: 'Giải tán',
      okType: 'danger',
      cancelText: 'Huỷ',
      onOk: async () => {
        try {
          await request(`/api/teams/${team._id}`, { method: 'DELETE' });
          message.success('Đã giải tán đội thành công');
          refresh();
        } catch (err) {
          message.error(err.message || 'Không thể giải tán đội');
        }
      },
    });
  };

  const handleTransferLeader = async (values) => {
    setTransferLoading(true);
    try {
      await request(`/api/teams/${team._id}/transfer-leader`, { method: 'PATCH', body: { new_leader_email: values.new_leader_email } });
      message.success('Chuyển quyền Leader thành công!');
      setTransferOpen(false);
      transferForm.resetFields();
      refresh();
    } catch (err) {
      message.error(err.message || 'Không thể chuyển quyền Leader');
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) return <div className="sp-loading"><div className="sp-spinner" /></div>;

  const isLeader = team && user && (team.leader_id?._id ?? team.leader_id) === user._id;
  // Team size comes from the contest the team registered for. A team with no
  // contest yet falls back to the strictest requirement among the open contests,
  // so the progress bars measure against a real configured value rather than a
  // hardcoded number.
  const minTeamSize =
    team?.contest_id?.min_team_size ??
    contests.reduce((acc, c) => Math.max(acc, c.min_team_size ?? 0), 0) ??
    0;
  const maxTeamSize = team?.contest_id?.max_team_size ?? minTeamSize;
  // Đội đang tham gia cuộc thi còn mở → không được giải tán
  const hasActiveContest = !!team?.contest_id && contests.some(
    c => (c._id ?? c)?.toString() === (team.contest_id?._id ?? team.contest_id)?.toString()
  );

  // ── No team ─────────────────────────────────────────────────────────────
  if (!team) {
    return (
      <div style={{ padding: '28px 32px', minHeight: '100vh', background: C.bg }}>
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: C.dim, letterSpacing: 1, marginBottom: 6 }}>
            Quản lý đội
          </div>
          <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
            Đội thi
          </h2>
        </div>

        {/* Two action cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }}>
          {/* Create team card */}
          <div
            onClick={() => setCreateOpen(true)}
            style={{
              ...cardStyle,
              padding: '28px 26px',
              border: `1.5px dashed ${C.cyan}`,
              cursor: 'pointer',
              transition: 'box-shadow .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 20px rgba(0,212,255,.15)`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(0,212,255,.08)', border: `1px solid rgba(0,212,255,.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.cyan, marginBottom: 16,
            }}>
              <Ico d={TEAM_D} size={24} sw={1.5} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>
              Tạo đội mới
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, marginBottom: 18 }}>
              Đặt tên đội và mời thành viên ngay từ đầu
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 20 }}>
              {['① Đặt tên đội', '② Mời thành viên qua email', '③ Đăng ký cuộc thi'].map(s => (
                <span key={s} style={{ fontSize: 12, color: C.dim }}>{s}</span>
              ))}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, color: C.cyan,
            }}>
              Tạo đội ngay →
            </div>
          </div>

          {/* Join team card */}
          <div
            onClick={() => setJoinOpen(true)}
            style={{
              ...cardStyle,
              padding: '28px 26px',
              border: `1.5px dashed ${C.purple}`,
              cursor: 'pointer',
              transition: 'box-shadow .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 20px rgba(124,58,237,.15)`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(124,58,237,.08)', border: `1px solid rgba(124,58,237,.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.purple2, marginBottom: 16,
            }}>
              <Ico d={PLUS_D} size={24} sw={1.5} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>
              Tham gia đội
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, marginBottom: 18 }}>
              Bạn đã được mời? Nhập mã đội để tham gia
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 20 }}>
              {['① Nhận mã đội từ Leader', '② Nhập mã và xác nhận', '③ Sẵn sàng thi đấu'].map(s => (
                <span key={s} style={{ fontSize: 12, color: C.dim }}>{s}</span>
              ))}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, color: C.purple2,
            }}>
              Nhập mã đội →
            </div>
          </div>
        </div>

        {/* Requirements checklist */}
        <div style={{ ...cardStyle, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: C.dim, letterSpacing: .5, marginBottom: 14 }}>
            📋 Yêu cầu tham gia cuộc thi
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '👥', text: <>Đội cần đủ <strong style={{ color: C.text }}>{minTeamSize} thành viên</strong></> },
              { icon: '✅', text: <>Tất cả thành viên xác thực sinh viên</> },
              { icon: '🔧', text: <>Xác nhận qua email sau khi được mời</> },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.muted }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Lời mời đang chờ</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(0,212,255,.1)', border: '1px solid rgba(0,212,255,.25)', color: C.cyan }}>{invitations.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {invitations.map(inv => {
                const teamName = inv.team_id?.team_name ?? 'Đội không tên';
                const inviterName = inv.invited_by?.full_name ?? 'Ai đó';
                const contestTitle = inv.contest_id?.title ?? '';
                const memberCount = inv.team_id?.members?.length ?? 0;
                const isAccepting = inviteActionLoading[inv._id] === 'accept';
                const isRejecting = inviteActionLoading[inv._id] === 'reject';
                const isBusy = isAccepting || isRejecting;
                return (
                  <div key={inv._id} style={{ ...cardStyle, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#fff' }}>
                      {teamName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>
                        {teamName}
                        {contestTitle && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 600, color: C.cyan, background: 'rgba(0,212,255,.08)', border: '1px solid rgba(0,212,255,.2)', padding: '2px 7px', borderRadius: 5 }}>{contestTitle}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        Mời bởi <span style={{ color: C.text2, fontWeight: 600 }}>{inviterName}</span> · {memberCount} thành viên
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button disabled={isBusy} onClick={() => handleRejectInvite(inv)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(248,113,113,.3)', background: 'transparent', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? .5 : 1 }}>
                        {isRejecting ? '...' : 'Từ chối'}
                      </button>
                      <button disabled={isBusy} onClick={() => handleAcceptInvite(inv)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#00d4ff,#0099cc)', color: '#070b14', fontSize: 12, fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? .5 : 1 }}>
                        {isAccepting ? '...' : 'Chấp nhận'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modals */}
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
  const hasContest = !!team.contest_id;
  const isConfirmed = team.status === 'CONFIRMED' || (team.status === 'ACTIVE' && hasContest);
  const badge = isConfirmed ? STATUS_BADGE.CONFIRMED : (STATUS_BADGE[team.status] || STATUS_BADGE.ACTIVE);
  const desc = isConfirmed ? 'Đội đã được xác nhận tham gia cuộc thi. Chúc bạn thi đấu tốt!' : (statusDesc[team.status] || '');
  // Pending invitations = thành viên chưa xác thực email trong đội (chưa click link verify)
  const pending = team.members?.filter(m => !m.email_verified) ?? [];

  const contestCard = (() => {
    if (isConfirmed || team.status === 'WAITING_APPROVAL') {
      const contestTitle = team.contest_id?.title || 'Cuộc thi đã đăng ký';
      return (
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={labelStyle}>Cuộc thi đã đăng ký</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 10 }}>{contestTitle}</div>
          <span style={{
            background: isConfirmed ? 'rgba(52,211,153,.12)' : 'rgba(251,146,60,.12)',
            color: isConfirmed ? '#34d399' : '#fb923c',
            border: `1px solid ${isConfirmed ? 'rgba(52,211,153,.3)' : 'rgba(251,146,60,.3)'}`,
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'inline-block',
          }}>
            {isConfirmed ? '✓ Đã xác nhận tham gia' : '⏰ Chờ ban tổ chức duyệt'}
          </span>
        </div>
      );
    }
    if ((team.status === 'ACTIVE' && !hasContest) || team.status === 'REJECTED') {
      const totalMembers = team.members?.length ?? 0;
      const verifiedCount = team.members?.filter(m => m.user_id && m.user_id.profile_verify_status === 'approved').length ?? 0;
      const canRegister = minTeamSize > 0 && totalMembers >= minTeamSize && verifiedCount === totalMembers;
      return (
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={labelStyle}>Đăng ký cuộc thi</div>
          {minTeamSize === 0 ? (
            <div style={{ background: 'rgba(251,146,60,.08)', border: '1px solid rgba(251,146,60,.25)', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: C.amber, lineHeight: 1.5 }}>
                Hiện chưa có cuộc thi nào đang mở đăng ký.
              </p>
            </div>
          ) : !canRegister ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Thành viên đã xác thực</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: verifiedCount === totalMembers && totalMembers >= minTeamSize ? C.green : C.amber }}>
                  {verifiedCount}/{Math.max(totalMembers, minTeamSize)}
                </span>
              </div>
              <div style={{ height: 6, background: C.line2, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${minTeamSize > 0 ? Math.min((totalMembers / minTeamSize) * 100, 100) : 0}%`, background: totalMembers >= minTeamSize ? C.green : C.amber, borderRadius: 99, transition: 'width .4s' }} />
              </div>
              <div style={{ background: 'rgba(251,146,60,.08)', border: '1px solid rgba(251,146,60,.25)', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ margin: 0, fontSize: 12, color: C.amber, lineHeight: 1.5 }}>
                  ⚠ Cần đủ <strong>{minTeamSize} thành viên</strong> và tất cả phải <strong>xác thực thông tin</strong>.
                  {totalMembers < minTeamSize && ` (Còn thiếu ${minTeamSize - totalMembers} thành viên)`}
                  {totalMembers >= minTeamSize && verifiedCount < totalMembers && ` (${totalMembers - verifiedCount} chưa xác thực)`}
                </p>
              </div>
              {isLeader && totalMembers < minTeamSize && (
                <button className="stp-btn stp-btn--ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => setInviteOpen(true)}>
                  + Mời thêm thành viên
                </button>
              )}
            </div>
          ) : isLeader ? (
            contests.length > 0 ? (
              <Form form={registerForm} layout="vertical" onFinish={handleRegister} style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
                  Chọn một cuộc thi đang mở để gửi yêu cầu tham gia.
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
              <p style={{ fontSize: 12, color: C.dim, margin: '8px 0 0' }}>Hiện tại không có cuộc thi nào đang mở đăng ký.</p>
            )
          ) : (
            <p style={{ fontSize: 12, color: C.dim, margin: '8px 0 0' }}>Vui lòng liên hệ Trưởng nhóm để đăng ký tham gia.</p>
          )}
        </div>
      );
    }
    return null;
  })();

  // Avatar letter + gradient for team name
  const teamLetter = (team.team_name || '?')[0].toUpperCase();
  const avatarPalettes = [
    ['#0e7490', '#06b6d4'], ['#7c3aed', '#a855f7'],
    ['#059669', '#10b981'], ['#d97706', '#f59e0b'],
    ['#dc2626', '#f87171'], ['#2563eb', '#60a5fa'],
  ];
  const [avFrom, avTo] = avatarPalettes[teamLetter.charCodeAt(0) % avatarPalettes.length];

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: C.bg }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: C.dim, letterSpacing: 1, marginBottom: 6 }}>
            Quản lý đội
          </div>
          <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
            Đội thi
          </h2>
        </div>
        {isConfirmed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: C.green }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, display: 'inline-block', boxShadow: `0 0 6px ${C.green}` }} />
            Đã xác nhận
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Card 1 — Team identity */}
          <div style={{ ...cardStyle, padding: 22 }}>
            {/* Team avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: `linear-gradient(135deg,${avFrom},${avTo})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: '#fff',
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: `0 0 18px ${avFrom}66`,
              }}>
                {teamLetter}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>
                  {team.team_name}
                </div>
                <span style={{
                  fontSize: 11.5, fontWeight: 600,
                  color: C.cyan, background: 'rgba(0,212,255,.08)',
                  border: `1px solid rgba(0,212,255,.25)`,
                  borderRadius: 20, padding: '3px 10px',
                }}>
                  {team.contest_id?.title || 'Chưa đăng ký cuộc thi'}
                </span>
              </div>
            </div>

            {desc && (
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, margin: '0 0 14px' }}>
                {desc}
              </p>
            )}

            {/* Actions */}
            <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isLeader && (team.members?.filter(m => m.user_id && (m.user_id?._id ?? m.user_id).toString() !== user._id.toString()).length > 0) && (
                <button
                  className="stp-btn stp-btn--ghost"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12, color: '#60a5fa', borderColor: 'rgba(96,165,250,.3)' }}
                  onClick={() => setTransferOpen(true)}
                >
                  🔄 Chuyển quyền Leader
                </button>
              )}
              {!isLeader && (
                <button
                  className="stp-leave-btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={leaveLoading}
                  onClick={() => {
                    modal.confirm({
                      title: 'Rời khỏi đội thi?',
                      content: 'Bạn có chắc chắn muốn rời khỏi đội này không?',
                      okText: 'Rời đội',
                      cancelText: 'Hủy',
                      okButtonProps: { danger: true },
                      onOk: () => handleLeaveTeam(),
                    });
                  }}
                >
                  {leaveLoading ? 'Đang xử lý...' : '← Rời đội'}
                </button>
              )}
              {isLeader && (
                <button
                  disabled={hasActiveContest}
                  title={hasActiveContest ? 'Không thể giải tán khi cuộc thi đang diễn ra' : ''}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 9,
                    border: `1px solid ${hasActiveContest ? 'rgba(248,113,113,.15)' : 'rgba(248,113,113,.35)'}`,
                    background: hasActiveContest ? 'rgba(248,113,113,.03)' : 'rgba(248,113,113,.07)',
                    color: hasActiveContest ? 'rgba(248,113,113,.4)' : '#f87171',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                    cursor: hasActiveContest ? 'not-allowed' : 'pointer', transition: 'all .18s',
                  }}
                  onClick={hasActiveContest ? undefined : handleDissolveTeam}
                >
                  🗑 Giải tán đội{hasActiveContest ? ' (đang thi)' : ''}
                </button>
              )}
            </div>
          </div>

          {/* Card 2 — Contest registration */}
          {contestCard}

          {/* Card 3 — Team settings (leader only) */}
          {isLeader && (
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, fontWeight: 700, color: C.text2 }}>
                <Ico d={SETTINGS_D} size={16} />
                Cấu hình đội thi
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Tên đội</label>
                  <input style={inputStyle} value={teamName} onChange={e => setTeamName(e.target.value)} />
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsLoading}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(90deg,#00d4ff,#0099bb)',
                    color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    opacity: settingsLoading ? .7 : 1,
                  }}
                >
                  {settingsLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Members table */}
          <div style={{ ...cardStyle }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderBottom: `1px solid ${C.line}`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: C.dim }}>
                Thành viên ({team.members?.length ?? 0})
              </span>
              {isLeader && (
                <button
                  onClick={() => setInviteOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600, color: C.cyan,
                    background: 'rgba(0,212,255,.08)', border: `1px solid rgba(0,212,255,.25)`,
                    borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                  }}
                >
                  <Ico d={MAIL_D} size={12} /> Mời thành viên
                </button>
              )}
            </div>

            {isLeader && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 18px', borderBottom: `1px solid ${C.line}`, gap: 10,
              }}>
                <span style={{ fontSize: 12, color: C.muted }}>
                  Mã đội: <strong style={{ color: C.dim, fontFamily: 'monospace' }}>{team._id}</strong>
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(team._id);
                    message.success('Đã sao chép mã đội!');
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600, color: C.muted,
                    background: 'transparent', border: `1px solid ${C.line2}`,
                    borderRadius: 6, padding: '4px 9px', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <Ico d={COPY_D} size={12} /> Sao chép
                </button>
              </div>
            )}

            <div>
              {(team.members ?? []).map((m, i) => {
                const isTeamLeader = (m.user_id?._id ?? m.user_id) === (team.leader_id?._id ?? team.leader_id);
                const isSelf = (m.user_id?._id ?? m.user_id) === user._id;
                const memberName = m.full_name || m.user_id?.full_name || '—';
                const verified = m.user_id && m.user_id.profile_verify_status === 'approved';
                const pendingVerify = m.user_id && m.user_id.profile_verify_status === 'pending';

                return (
                  <div key={m.email} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                    borderBottom: i < (team.members?.length ?? 0) - 1 ? `1px solid ${C.line2}` : 'none',
                  }}>
                    <Avatar name={memberName} url={m.user_id?.avatar_url} size={40} radius={11} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{memberName}</div>
                      <div style={{ fontSize: 12, color: C.dim }}>{m.email}</div>
                    </div>
                    {/* Role badge */}
                    {isTeamLeader ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: 'rgba(250,204,21,.08)', border: `1px solid rgba(250,204,21,.25)`, borderRadius: 20, padding: '3px 9px' }}>
                        LEADER
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: 'rgba(126,144,171,.08)', border: `1px solid rgba(126,144,171,.2)`, borderRadius: 20, padding: '3px 9px' }}>
                        MEMBER
                      </span>
                    )}
                    {/* Verify badge */}
                    {verified ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: 'rgba(34,197,94,.08)', border: `1px solid rgba(34,197,94,.25)`, borderRadius: 20, padding: '3px 9px' }}>
                        Verified
                      </span>
                    ) : pendingVerify ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,.08)', border: `1px solid rgba(96,165,250,.25)`, borderRadius: 20, padding: '3px 9px' }}>
                        Pending
                      </span>
                    ) : isSelf ? (
                      <a href="/dashboard/profile" style={{ textDecoration: 'none' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: 'rgba(245,158,11,.08)', border: `1px solid rgba(245,158,11,.25)`, borderRadius: 20, padding: '3px 9px', cursor: 'pointer' }}>
                          Xác thực →
                        </span>
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: 'rgba(245,158,11,.08)', border: `1px solid rgba(245,158,11,.25)`, borderRadius: 20, padding: '3px 9px' }}>
                        Chưa xác thực
                      </span>
                    )}
                    {isLeader && !isSelf && (
                      <button className="stp-icon-btn" title="Tùy chọn" style={{ color: C.dim }}>
                        <MoreOutlined />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending invitations */}
          {isLeader && pending.length > 0 && (
            <div style={{ ...cardStyle }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderBottom: `1px solid ${C.line}`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: C.gold }}>
                  ▶ Pending Invitations
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>{pending.length} lời mời</span>
              </div>
              <div style={{ padding: '8px 18px' }}>
                {pending.map(m => (
                  <div key={m.email} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: `1px solid ${C.line2}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={m.email} url={m.user_id?.avatar_url} size={32} radius={9} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.email}</div>
                        <div style={{ fontSize: 11, color: C.dim }}>
                          {m.invited_at ? `Mời ${timeAgo(m.invited_at)}` : 'Chưa rõ thời điểm mời'}
                        </div>
                      </div>
                    </div>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: 14, padding: '2px 6px' }}
                      title="Hủy lời mời"
                      onClick={() => message.info('Tính năng đang cập nhật.')}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: C.dim, margin: '10px 0 6px', fontStyle: 'italic' }}>
                  Bạn có thể mời tối đa {maxTeamSize} thành viên vào đội của mình.
                </p>
              </div>
            </div>
          )}

          {/* Member contributions */}
          <div style={{ ...cardStyle, padding: '20px 22px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `1px solid ${C.line}`, paddingBottom: 12, marginBottom: 16,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: C.dim }}>
                Đánh giá đóng góp thành viên
              </span>
              {isLeader && (
                <button
                  type="button"
                  onClick={() => {
                    setEvalMembers((team.members ?? []).map(m => ({
                      email: m.email,
                      full_name: m.full_name || m.user_id?.full_name || m.email,
                      contribution_percentage: m.contribution_percentage ?? 0,
                      contribution_rating: m.contribution_rating ?? 5,
                      contribution_note: m.contribution_note ?? '',
                    })));
                    setEvalOpen(true);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600, color: C.cyan,
                    background: 'rgba(0,212,255,.08)', border: `1px solid rgba(0,212,255,.25)`,
                    borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                  }}
                >
                  ⚙ Đánh giá
                </button>
              )}
            </div>

            {(team.members ?? []).length === 0 ? (
              <p style={{ color: C.dim, fontSize: 13, margin: 0 }}>Chưa có thành viên nào.</p>
            ) : (
              <div>
                {(team.members ?? []).map((m, i) => {
                  const pct = m.contribution_percentage ?? 0;
                  const rating = m.contribution_rating ?? 5;
                  const note = m.contribution_note || 'Chưa có nhận xét';
                  const name = m.full_name || m.user_id?.full_name || m.email;
                  return (
                    <div key={m.email} style={{
                      borderBottom: i < (team.members?.length ?? 0) - 1 ? `1px solid ${C.line2}` : 'none',
                      padding: '12px 0',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.cyan, fontFamily: "'JetBrains Mono', monospace" }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={{ height: 7, background: C.line2, borderRadius: 99, overflow: 'hidden', marginBottom: 7 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#38bdf8,#818cf8)', borderRadius: 99 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                        <span>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
                        <span style={{ fontStyle: 'italic', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={note}>"{note}"</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
          <p style={{ fontSize: '0.85rem', color: C.muted, margin: '0 0 8px' }}>
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
            <span style={{ color: C.text }}>Tổng tỷ lệ đóng góp của cả đội:</span>
            <strong style={{ color: evalMembers.reduce((sum, m) => sum + (m.contribution_percentage || 0), 0) === 100 ? '#34d399' : '#f87171' }}>
              {evalMembers.reduce((sum, m) => sum + (m.contribution_percentage || 0), 0)}% / 100%
            </strong>
          </div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
          {evalMembers.map((m, idx) => (
            <div key={m.email} style={{
              background: C.card2,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: 14,
              marginBottom: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: C.text }}>{m.full_name || m.email}</span>
                <span style={{ color: C.muted, fontSize: '0.8rem' }}>{m.email}</span>
              </div>

              {/* Slider for percentage */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: C.muted, marginBottom: 4 }}>
                  <span>Tỷ lệ đóng góp</span>
                  <strong style={{ color: C.cyan }}>{m.contribution_percentage}%</strong>
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
                <span style={{ fontSize: '0.85rem', color: C.muted }}>Đánh giá sao:</span>
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
                <span style={{ fontSize: '0.85rem', color: C.muted, display: 'block', marginBottom: 4 }}>Ghi chú nhận xét:</span>
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

      {/* Transfer Leader modal */}
      <Modal
        title="Chuyển quyền Leader"
        open={transferOpen}
        onCancel={() => { setTransferOpen(false); transferForm.resetFields(); }}
        onOk={() => transferForm.submit()}
        confirmLoading={transferLoading}
        okText="Xác nhận chuyển"
        okButtonProps={{ danger: false }}
      >
        <p style={{ fontSize: '.85rem', color: C.muted, marginBottom: 16 }}>
          Sau khi chuyển, bạn sẽ trở thành thành viên thường. Hành động này không thể hoàn tác (trừ khi Leader mới chuyển lại cho bạn).
        </p>
        <Form form={transferForm} layout="vertical" onFinish={handleTransferLeader}>
          <Form.Item name="new_leader_email" label="Chọn thành viên nhận quyền Leader" rules={[{ required: true, message: 'Vui lòng chọn thành viên' }]}>
            <Select placeholder="Chọn thành viên">
              {(team?.members ?? [])
                .filter(m => m.user_id && (m.user_id?._id ?? m.user_id)?.toString() !== user._id.toString())
                .map(m => (
                  <Select.Option key={m.email} value={m.email}>
                    {m.full_name || m.user_id?.full_name || m.email} — {m.email}
                  </Select.Option>
                ))
              }
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
