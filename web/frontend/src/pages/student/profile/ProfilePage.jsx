import { useRef, useState, useEffect } from 'react';
import { App as AntdApp, Form, Input, Button } from 'antd';
import {
  CameraOutlined,
  CheckCircleFilled,
  WarningFilled,
  IdcardOutlined,
  EditOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import '../student.css';
import { useTheme } from '../../../context/ThemeContext';
import { getStudentColors } from '../studentColors';

// ── Avatar gradient helper ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#7c3aed', '#4f46e5'], ['#0ea5e9', '#0284c7'], ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'], ['#ef4444', '#dc2626'], ['#ec4899', '#db2777'],
];
function avatarGradient(name = '') {
  const i = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
}
function avatarInitials(name = '') {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children, C }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase',
    color: C.dim, marginBottom: 14,
  }}>
    {children}
  </div>
);

// ── Info field (view mode) ────────────────────────────────────────────────────
const InfoField = ({ label, children, C }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim }}>
      {label}
    </span>
    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
      {children || '—'}
    </span>
  </div>
);

// ── Card wrapper ──────────────────────────────────────────────────────────────
const Card = ({ children, style, C }) => (
  <div style={{
    border: `1px solid ${C.line}`, borderRadius: 14,
    background: C.card, padding: 22, ...style,
  }}>
    {children}
  </div>
);

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { request } = useApi();
  const { theme } = useTheme();
  const C = getStudentColors(theme);
  // Context-aware message — the static antd API ignores ConfigProvider.
  const { message } = AntdApp.useApp();
  const fileRef = useRef(null);
  const cardRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [cardPreview, setCardPreview] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);

  // States for custom password modal
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState({});

  const [infoForm] = Form.useForm();

  // Team + latest published result for the activity card. /api/users/me does not
  // embed a team, so both come from their own endpoints.
  const [team, setTeam] = useState(null);
  const [latestResult, setLatestResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadActivity = async () => {
      try {
        const teamsRes = await request('/api/teams/me');
        const teams = Array.isArray(teamsRes) ? teamsRes : teamsRes?.data ?? [];
        const mine = teams.find((t) => t.contest_id) ?? teams[0] ?? null;
        if (cancelled) return;
        setTeam(mine);
        if (!mine?.contest_id) return;

        const contestId = mine.contest_id?._id ?? mine.contest_id;
        const res = await request(`/api/scores/contests/${contestId}/my-team-results`);
        const rounds = Array.isArray(res?.results) ? res.results : [];
        // Latest round whose scores are published — anything else has no rank yet.
        const published = rounds.filter((r) => r.locked && r.total_score != null);
        if (!cancelled) setLatestResult(published[published.length - 1] ?? null);
      } catch {
        // leave the card on its em-dash placeholders
      }
    };
    loadActivity();
    return () => { cancelled = true; };
  }, [request]);

  // Check if profile is complete
  const isProfileComplete = !!(user?.phone && user?.student_id && user?.student_card);

  // Auto-open edit if profile incomplete
  useEffect(() => {
    if (user && !isProfileComplete) {
      handleEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = () => {
    infoForm.setFieldsValue({
      full_name: user?.full_name,
      phone: user?.phone,
      student_id: user?.student_id,
    });
    setAvatarPreview(null);
    setCardPreview(null);
    setEditing(true);
  };

  const handleCancel = () => {
    infoForm.resetFields();
    setAvatarPreview(null);
    setCardPreview(null);
    setEditing(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { message.warning('Ảnh tối đa 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCardChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { message.warning('Chỉ chấp nhận file hình ảnh'); return; }
    if (file.size > 5 * 1024 * 1024) { message.warning('Ảnh thẻ tối đa 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setCardPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    let values;
    try { values = await infoForm.validateFields(); } catch { return; }
    if (!cardPreview && !user?.student_card) {
      message.warning('Vui lòng tải lên hình ảnh thẻ sinh viên');
      return;
    }
    setSaveLoading(true);
    try {
      const body = { ...values };
      if (avatarPreview) body.avatar_url = avatarPreview;
      if (cardPreview) body.student_card = cardPreview;
      await request('/api/users/me', { method: 'PATCH', body });
      await refreshUser();
      message.success('Cập nhật thành công');
      setAvatarPreview(null);
      setEditing(false);
    } catch (err) {
      message.error(err.message || 'Cập nhật thất bại');
    } finally {
      setSaveLoading(false);
    }
  };

  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleSendVerifyRequest = async () => {
    setVerifyLoading(true);
    try {
      await request('/api/users/me/verify-request', { method: 'POST' });
      await refreshUser();
      message.success('Đã gửi yêu cầu xác thực thông tin!');
    } catch (err) {
      message.error(err.message || 'Không thể gửi yêu cầu xác thực');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCustomPasswordSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!oldPassword) errs.oldPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (!newPassword) errs.newPassword = 'Vui lòng nhập mật khẩu mới';
    else if (newPassword.length < 6) errs.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    if (!confirmPassword) errs.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Mật khẩu xác nhận không khớp';

    if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }

    setPwErrors({});
    setPwLoading(true);
    try {
      await request('/api/users/me/password', {
        method: 'PATCH',
        body: { current_password: oldPassword, new_password: newPassword },
      });
      message.success('Đổi mật khẩu thành công');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwOpen(false);
    } catch (err) {
      message.error(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setPwLoading(false);
    }
  };

  const avatarSrc = avatarPreview || user?.avatar_url || undefined;
  const displayName = user?.full_name || '—';
  const verifyStatus = user?.profile_verify_status;

  // Determine team/role display
  const teamName = team?.team_name || null;
  const isLeader = !!team && (team.leader_id?._id ?? team.leader_id) === user?._id;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 18,
      fontFamily: "'Manrope', sans-serif", color: C.text2,
    }}>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '1.4px',
            color: C.dim, textTransform: 'uppercase', marginBottom: 7,
          }}>
            Tài khoản
          </div>
          <h1 style={{
            margin: 0, fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 30, fontWeight: 700, letterSpacing: '-.5px', color: C.text,
          }}>
            Hồ sơ cá nhân
          </h1>
        </div>

        {/* Verify status badge + send request button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {verifyStatus === 'approved' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)',
              borderRadius: 8, padding: '6px 14px', fontSize: '.82rem', fontWeight: 700, color: C.green,
            }}>
              <CheckCircleFilled /> Thông tin đã được xác thực
            </span>
          )}
          {verifyStatus === 'pending' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
              borderRadius: 8, padding: '6px 14px', fontSize: '.82rem', fontWeight: 700, color: C.amber,
            }}>
              ⏳ Đang chờ Admin xét duyệt
            </span>
          )}
          {verifyStatus === 'rejected' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)',
              borderRadius: 8, padding: '6px 14px', fontSize: '.82rem', fontWeight: 700, color: C.red,
            }}>
              ✕ Yêu cầu bị từ chối
            </span>
          )}
          {(verifyStatus === 'unsubmitted' || !verifyStatus) && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
              borderRadius: 8, padding: '6px 14px', fontSize: '.82rem', fontWeight: 700, color: C.amber,
            }}>
              <WarningFilled /> Chưa xác thực thông tin
            </span>
          )}
          {isProfileComplete && (verifyStatus === 'unsubmitted' || verifyStatus === 'rejected' || !verifyStatus) && (
            <Button
              type="primary"
              loading={verifyLoading}
              onClick={handleSendVerifyRequest}
              style={{
                borderRadius: 8, fontSize: '.82rem', height: 34,
                background: C.cyan, color: '#060b16', border: 'none', fontWeight: 700,
              }}
            >
              Gửi yêu cầu xác thực →
            </Button>
          )}
        </div>
      </div>

      {/* ── Warning banner if profile incomplete ─────────────────────────── */}
      {!isProfileComplete && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(245,158,11,.08)', border: `1px solid rgba(245,158,11,.35)`,
          borderRadius: 10, padding: '14px 18px',
        }}>
          <WarningFilled style={{ color: '#fb923c', fontSize: 20, marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#fb923c', fontSize: '.9rem', marginBottom: 4 }}>
              Cần xác thực thông tin
            </div>
            <div style={{ color: C.muted, fontSize: '.82rem', lineHeight: 1.5 }}>
              Vui lòng điền đầy đủ <strong>số điện thoại</strong>, <strong>mã số sinh viên</strong> và <strong>tải lên hình ảnh thẻ sinh viên</strong> bên dưới.
              Thông tin này bắt buộc để tham gia cuộc thi.
            </div>
          </div>
        </div>
      )}

      {/* ── Rejected note ─────────────────────────────────────────────────── */}
      {verifyStatus === 'rejected' && user?.profile_verify_note && (
        <div style={{
          background: 'rgba(248,113,113,.07)', border: `1px solid rgba(248,113,113,.3)`,
          borderRadius: 8, padding: '10px 14px',
        }}>
          <div style={{ fontWeight: 600, color: C.red, fontSize: '.8rem', marginBottom: 4 }}>Lý do từ chối:</div>
          <div style={{ color: C.muted, fontSize: '.83rem' }}>{user.profile_verify_note}</div>
        </div>
      )}

      {/* ── Two-column grid ───────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 18,
        alignItems: 'start',
      }}>
        {/* ──── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Card 1 — Personal info */}
          <Card C={C}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <SectionLabel C={C}>THÔNG TIN CÁ NHÂN</SectionLabel>
              {!editing && (
                <button
                  onClick={handleEdit}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'transparent', border: `1px solid ${C.line}`,
                    borderRadius: 7, padding: '5px 11px',
                    color: C.text2, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <EditOutlined style={{ fontSize: 12 }} /> Chỉnh sửa
                </button>
              )}
            </div>

            <Form form={infoForm} layout="vertical">
              {/* Info grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '18px 24px',
                marginBottom: 20,
              }}>
                {/* Họ và tên */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim, marginBottom: 5 }}>
                    Họ và tên
                  </div>
                  {editing ? (
                    <Form.Item name="full_name" style={{ margin: 0 }} rules={[{ required: true, message: 'Nhập họ và tên' }]}>
                      <Input
                        placeholder="Nhập họ và tên"
                        style={{ background: C.card, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8, fontSize: 13 }}
                      />
                    </Form.Item>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{user?.full_name || '—'}</span>
                  )}
                </div>

                {/* Mã sinh viên */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim, marginBottom: 5 }}>
                    Mã sinh viên
                  </div>
                  {editing ? (
                    <Form.Item name="student_id" style={{ margin: 0 }} rules={[{ required: true, message: 'Nhập mã sinh viên' }]}>
                      <Input
                        placeholder="VD: SE12345"
                        style={{ background: C.card, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8, fontSize: 13 }}
                      />
                    </Form.Item>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: user?.student_id ? C.text : C.red }}>
                      {user?.student_id || '⚠ Chưa cập nhật'}
                    </span>
                  )}
                </div>

                {/* Email */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim, marginBottom: 5 }}>
                    Email
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{user?.email || '—'}</span>
                </div>

                {/* Số điện thoại */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim, marginBottom: 5 }}>
                    Số điện thoại
                  </div>
                  {editing ? (
                    <Form.Item name="phone" style={{ margin: 0 }} rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
                      <Input
                        placeholder="VD: 0912345678"
                        style={{ background: C.card, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8, fontSize: 13 }}
                      />
                    </Form.Item>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: user?.phone ? C.text : C.red }}>
                      {user?.phone || '⚠ Chưa cập nhật'}
                    </span>
                  )}
                </div>

                {/* Vai trò */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim, marginBottom: 5 }}>
                    Vai trò
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {user?.roles?.map((r) => (
                      <span key={r.role_name} style={{
                        display: 'inline-block', border: `1px solid ${C.cyan}`,
                        color: C.cyan, padding: '2px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 700, background: 'rgba(0,212,255,0.05)',
                      }}>
                        {r.role_name.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Edit mode save/cancel buttons */}
              {editing && (
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button
                    onClick={handleSave}
                    disabled={saveLoading}
                    style={{
                      padding: '8px 20px', borderRadius: 8, border: 'none',
                      background: C.cyan, color: '#060b16',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {saveLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saveLoading}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: `1px solid ${C.line}`,
                      background: 'transparent', color: C.text2,
                      fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Huỷ
                  </button>
                </div>
              )}
            </Form>
          </Card>

          {/* Card 2 — Verification status + student card upload */}
          <Card C={C}>
            <SectionLabel C={C}>XÁC THỰC SINH VIÊN</SectionLabel>

            {/* Verification status display */}
            {verifyStatus === 'approved' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'rgba(34,197,94,.15)', border: `1px solid rgba(34,197,94,.3)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <CheckCircleFilled style={{ color: C.green, fontSize: 22 }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                    Thông tin sinh viên đã được xác thực
                  </div>
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 4,
                    background: 'rgba(34,197,94,.12)', border: `1px solid rgba(34,197,94,.2)`,
                    color: C.green, fontSize: 11, fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase',
                  }}>
                    ĐÃ DUYỆT
                  </span>
                </div>
              </div>
            ) : verifyStatus === 'pending' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'rgba(245,158,11,.15)', border: `1px solid rgba(245,158,11,.3)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <WarningFilled style={{ color: C.amber, fontSize: 22 }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                    Đang chờ Admin xét duyệt
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>Thông tin của bạn đã được gửi đi và đang được xem xét.</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'rgba(248,113,113,.15)', border: `1px solid rgba(248,113,113,.3)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IdcardOutlined style={{ color: C.red, fontSize: 22 }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                    Cần upload ảnh thẻ sinh viên
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>Tải lên ảnh thẻ để hoàn thiện hồ sơ và gửi yêu cầu xác thực.</div>
                </div>
              </div>
            )}

            {/* Mã số sinh viên display */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim, marginBottom: 5 }}>
                Mã số sinh viên
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
                {user?.student_id || <span style={{ color: C.red, fontSize: 14 }}>⚠ Chưa cập nhật</span>}
              </div>
            </div>

            {/* Student card image */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim, marginBottom: 10 }}>
                Hình ảnh thẻ sinh viên
              </div>

              {editing ? (
                <div style={{ position: 'relative', maxWidth: 450 }}>
                  <div
                    onClick={() => cardRef.current?.click()}
                    style={{
                      border: `2px dashed ${C.line}`, borderRadius: 8, padding: '24px 16px',
                      cursor: 'pointer', textAlign: 'center', transition: 'border-color .2s',
                      background: 'rgba(0,212,255,.02)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.cyan}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e3a54'}
                  >
                    {cardPreview || user?.student_card ? (
                      <div>
                        <img
                          src={cardPreview || user?.student_card}
                          alt="Preview thẻ sinh viên"
                          style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, objectFit: 'cover' }}
                        />
                        <div style={{ fontSize: '.75rem', color: C.muted, marginTop: 8 }}>Nhấn để đổi ảnh</div>
                      </div>
                    ) : (
                      <div style={{ color: C.muted }}>
                        <IdcardOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                        <div style={{ fontSize: '.83rem' }}>Nhấn để tải lên hình ảnh thẻ sinh viên</div>
                        <div style={{ fontSize: '.72rem', marginTop: 4 }}>JPG, PNG, tối đa 5MB</div>
                      </div>
                    )}
                  </div>
                  {cardPreview && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setCardPreview(null); if (cardRef.current) cardRef.current.value = ''; }}
                      style={{
                        position: 'absolute', top: 8, right: 8, width: 24, height: 24,
                        borderRadius: '50%', background: 'rgba(239,68,68,.9)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', zIndex: 10,
                      }}
                      title="Xoá ảnh vừa chọn"
                    >✕</div>
                  )}
                </div>
              ) : (
                user?.student_card ? (
                  <div style={{ display: 'inline-block', maxWidth: 450 }}>
                    <img
                      src={user.student_card}
                      alt="Thẻ sinh viên"
                      style={{ width: '100%', height: 220, borderRadius: '8px 8px 0 0', objectFit: 'cover', display: 'block', borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}`, borderTop: `1px solid ${C.line}` }}
                    />
                    <div style={{
                      background: '#10b981', color: '#fff', fontSize: '.8rem', fontWeight: 600,
                      padding: '8px 12px', borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <CheckCircleFilled /> Đã tải lên thành công
                    </div>
                  </div>
                ) : (
                  <span style={{ color: C.red, fontSize: '.85rem' }}>⚠ Chưa tải lên</span>
                )
              )}
              <input ref={cardRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCardChange} />
            </div>
          </Card>

          {/* Card 3 — Security */}
          <Card C={C}>
            <SectionLabel C={C}>BẢO MẬT</SectionLabel>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: C.card, border: `1px solid ${C.line2}`,
              borderRadius: 11, padding: '14px 16px',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>Mật khẩu</div>
                <div style={{ fontSize: 12, color: C.dim }}>Cập nhật mật khẩu để bảo vệ tài khoản</div>
              </div>
              <button
                onClick={() => {
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPwErrors({});
                  setPwOpen(true);
                }}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.line}`,
                  background: 'transparent', color: C.text2,
                  fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                <UnlockOutlined style={{ fontSize: 12 }} /> Đổi mật khẩu
              </button>
            </div>
          </Card>
        </div>

        {/* ──── RIGHT SIDEBAR ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Card — Avatar */}
          <Card C={C} style={{ textAlign: 'center', padding: 24 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 16px' }}>
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  style={{
                    width: 110, height: 110, borderRadius: 18, objectFit: 'cover',
                    border: `2px solid ${C.line}`,
                    cursor: editing ? 'pointer' : 'default',
                    boxShadow: `0 0 24px rgba(0,212,255,0.18)`,
                  }}
                  onClick={editing ? () => fileRef.current?.click() : undefined}
                />
              ) : (
                <div
                  style={{
                    width: 110, height: 110, borderRadius: 18,
                    background: avatarGradient(displayName),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 46, fontWeight: 700, color: '#fff',
                    boxShadow: `0 0 24px rgba(0,212,255,0.15)`,
                    cursor: editing ? 'pointer' : 'default',
                  }}
                  onClick={editing ? () => fileRef.current?.click() : undefined}
                >
                  {avatarInitials(displayName)}
                </div>
              )}

              {/* Camera edit button */}
              {editing && (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 30, height: 30, borderRadius: '50%',
                    background: C.cyan, border: `3px solid ${C.card}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 5,
                  }}
                >
                  <CameraOutlined style={{ fontSize: 13, color: '#060b16' }} />
                </div>
              )}

              {/* Remove avatar preview button */}
              {editing && avatarPreview && (
                <div
                  onClick={(e) => { e.stopPropagation(); setAvatarPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  style={{
                    position: 'absolute', top: 2, right: 2, width: 20, height: 20,
                    borderRadius: '50%', background: 'rgba(239,68,68,.9)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', zIndex: 10, lineHeight: 1,
                  }}
                  title="Xoá ảnh vừa chọn"
                >✕</div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            {/* Name */}
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 5,
            }}>
              {displayName}
            </div>

            {/* Email */}
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}>
              {user?.email || '—'}
            </div>

            {/* Team/role badge */}
            {teamName && (
              <div style={{ marginBottom: 20 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(0,212,255,.08)', border: `1px solid rgba(0,212,255,.25)`,
                  borderRadius: 20, padding: '4px 12px',
                  fontSize: 12, fontWeight: 600, color: C.cyan,
                }}>
                  {isLeader ? 'Trưởng nhóm' : 'Thành viên'} · {teamName}
                </span>
              </div>
            )}

            {/* Edit / Save actions */}
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                    background: C.cyan, color: '#060b16',
                    fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {saveLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saveLoading}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, border: `1px solid ${C.line}`,
                    background: 'transparent', color: C.text2,
                    fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Huỷ
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={handleEdit}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                    background: C.cyan, color: '#060b16',
                    fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <EditOutlined /> Chỉnh sửa hồ sơ
                </button>
                <button
                  onClick={() => {
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPwErrors({});
                    setPwOpen(true);
                  }}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, border: `1px solid ${C.line}`,
                    background: 'transparent', color: C.text2,
                    fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <UnlockOutlined /> Đổi mật khẩu
                </button>
              </div>
            )}
          </Card>

          {/* Card — Activity */}
          <Card C={C} style={{ padding: '20px 22px' }}>
            <SectionLabel C={C}>HOẠT ĐỘNG</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Đội thi', value: teamName || '—', color: C.cyan },
                { label: 'Vai trò', value: team ? (isLeader ? 'Trưởng nhóm' : 'Thành viên') : '—' },
                { label: 'Hạng hiện tại', value: latestResult?.rank ? `#${latestResult.rank}` : '—', color: C.gold },
                { label: 'Tổng điểm', value: latestResult?.total_score ?? '—' },
                {
                  label: 'Ngày tham gia',
                  value: user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : '—',
                  last: true,
                },
              ].map(({ label, value, color, last }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '11px 0',
                    borderBottom: last ? 'none' : `1px solid ${C.line2}`,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: C.muted }}>{label}</span>
                  <span style={{ fontWeight: 700, color: color || C.text }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Custom Password Modal ─────────────────────────────────────────── */}
      {pwOpen && (
        <div className="custom-pw-modal-overlay" onClick={() => { setPwOpen(false); setPwErrors({}); }}>
          <div className="custom-pw-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="custom-pw-modal-title">Đổi mật khẩu</h3>
            <p className="custom-pw-modal-subtitle">Nhập mật khẩu hiện tại và mật khẩu mới của bạn để cập nhật thông tin bảo mật.</p>

            <form onSubmit={handleCustomPasswordSubmit}>
              <div className="custom-pw-field">
                <label className="custom-pw-label">Mật khẩu hiện tại</label>
                <div className="custom-pw-input-wrapper">
                  <input
                    type="password"
                    className="custom-pw-input"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {pwErrors.oldPassword && <span className="custom-pw-error">{pwErrors.oldPassword}</span>}
              </div>

              <div className="custom-pw-field">
                <label className="custom-pw-label">Mật khẩu mới</label>
                <div className="custom-pw-input-wrapper">
                  <input
                    type="password"
                    className="custom-pw-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
                {pwErrors.newPassword && <span className="custom-pw-error">{pwErrors.newPassword}</span>}
              </div>

              <div className="custom-pw-field">
                <label className="custom-pw-label">Xác nhận mật khẩu mới</label>
                <div className="custom-pw-input-wrapper">
                  <input
                    type="password"
                    className="custom-pw-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
                {pwErrors.confirmPassword && <span className="custom-pw-error">{pwErrors.confirmPassword}</span>}
              </div>

              <div className="custom-pw-actions">
                <button
                  type="button"
                  className="custom-pw-btn custom-pw-btn--cancel"
                  onClick={() => { setPwOpen(false); setPwErrors({}); }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="custom-pw-btn custom-pw-btn--submit"
                  disabled={pwLoading}
                >
                  {pwLoading ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
