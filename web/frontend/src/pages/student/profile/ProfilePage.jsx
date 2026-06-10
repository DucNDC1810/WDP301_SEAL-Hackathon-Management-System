import { useRef, useState, useEffect } from 'react';
import { Form, Input, Button, Tag, message } from 'antd';
import {
  CameraOutlined,
  CheckCircleFilled,
  WarningFilled,
  IdcardOutlined,
  EditOutlined,
  UnlockOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import '../student.css';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { request } = useApi();
  const fileRef = useRef(null);

  const [editing,       setEditing]      = useState(false);
  const [saveLoading,   setSaveLoading]  = useState(false);
  const [pwLoading,     setPwLoading]    = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [cardPreview,   setCardPreview]  = useState(null);
  const [pwOpen,        setPwOpen]       = useState(false);
  const cardRef = useRef(null);

  // States cho Custom Password Modal
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState({});

  const [infoForm] = Form.useForm();

  // Kiểm tra profile đã đầy đủ chưa
  const isProfileComplete = !!(user?.phone && user?.student_id && user?.student_card);

  // Tự động mở edit nếu profile chưa hoàn thiện
  useEffect(() => {
    if (user && !isProfileComplete) {
      handleEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = () => {
    infoForm.setFieldsValue({
      full_name:  user?.full_name,
      phone:      user?.phone,
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
      if (cardPreview)   body.student_card = cardPreview;
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
    if (!oldPassword) errs.oldPassword = "Vui lòng nhập mật khẩu hiện tại";
    if (!newPassword) errs.newPassword = "Vui lòng nhập mật khẩu mới";
    else if (newPassword.length < 6) errs.newPassword = "Mật khẩu mới phải có ít nhất 6 ký tự";
    
    if (!confirmPassword) errs.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
    else if (newPassword !== confirmPassword) errs.confirmPassword = "Mật khẩu xác nhận không khớp";
    
    if (Object.keys(errs).length > 0) {
      setPwErrors(errs);
      return;
    }
    
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

  return (
    <div className="sp-page">
      {/* Header aligned with status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <h2 className="sp-page-title" style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Hồ sơ</h2>
        <div>
          {user?.profile_verify_status === 'approved' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 8, padding: '6px 14px', fontSize: '.82rem', fontWeight: 700, color: '#34d399' }}>
              <CheckCircleFilled /> Thông tin đã được xác thực
            </span>
          )}
          {user?.profile_verify_status === 'pending' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)', borderRadius: 8, padding: '6px 14px', fontSize: '.82rem', fontWeight: 700, color: '#fbbf24' }}>
              ⏳ Đang chờ Admin xét duyệt
            </span>
          )}
          {user?.profile_verify_status === 'rejected' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '6px 14px', fontSize: '.82rem', fontWeight: 700, color: '#ef4444' }}>
              ✕ Yêu cầu bị từ chối
            </span>
          )}
          {(user?.profile_verify_status === 'unsubmitted' || !user?.profile_verify_status) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.3)', borderRadius: 8, padding: '6px 14px', fontSize: '.82rem', fontWeight: 700, color: '#fb923c' }}>
              <WarningFilled /> Chưa xác thực thông tin
            </span>
          )}
          {isProfileComplete && (user?.profile_verify_status === 'unsubmitted' || user?.profile_verify_status === 'rejected' || !user?.profile_verify_status) && (
            <Button
              type="primary"
              loading={verifyLoading}
              onClick={handleSendVerifyRequest}
              style={{ borderRadius: 8, fontSize: '.82rem', height: 32, background: '#00d4ff', color: '#060b16', border: 'none', fontWeight: 700, marginLeft: 12 }}
            >
              Gửi yêu cầu xác thực →
            </Button>
          )}
        </div>
      </div>

      {/* Banner cảnh báo nếu chưa hoàn thiện thông tin */}
      {!isProfileComplete && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(251,146,60,.08)', border: '1px solid rgba(251,146,60,.35)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 12,
        }}>
          <WarningFilled style={{ color: '#fb923c', fontSize: 20, marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#fb923c', fontSize: '.9rem', marginBottom: 4 }}>
              Cần xác thực thông tin
            </div>
            <div style={{ color: '#94a3b8', fontSize: '.82rem', lineHeight: 1.5 }}>
              Vui lòng điền đầy đủ <strong>số điện thoại</strong>, <strong>mã số sinh viên</strong> và <strong>tải lên hình ảnh thẻ sinh viên</strong> bên dưới.
              Thông tin này bắt buộc để tham gia cuộc thi.
            </div>
          </div>
        </div>
      )}

      {/* Lý do từ chối */}
      {user?.profile_verify_status === 'rejected' && user?.profile_verify_note && (
        <div style={{ background: 'rgba(248,113,113,.07)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#f87171', fontSize: '.8rem', marginBottom: 4 }}>Lý do từ chối:</div>
          <div style={{ color: '#94a3b8', fontSize: '.83rem' }}>{user.profile_verify_note}</div>
        </div>
      )}

      <div className="profile-grid-container">
        {/* Left Column - Main Details */}
        <div className="profile-main-col">
          <div className="sp-card">
            <Form form={infoForm} layout="vertical">
              {/* Divider: THÔNG TIN CƠ BẢN */}
              <div className="sp-profile-divider"><span>Thông tin cơ bản</span></div>

              {/* Email */}
              <div className="activity-row" style={{ padding: '14px 0' }}>
                <span className="activity-label" style={{ fontSize: '.85rem' }}>Email</span>
                <span className="activity-value" style={{ color: '#fff', fontSize: '.85rem', fontWeight: 400 }}>{user?.email}</span>
              </div>

              {/* Họ và tên */}
              <div className="activity-row" style={{ padding: '14px 0' }}>
                <span className="activity-label" style={{ fontSize: '.85rem' }}>Họ và tên</span>
                {editing ? (
                  <Form.Item name="full_name" style={{ margin: 0, flex: 1, maxWidth: 350 }} rules={[{ required: true, message: 'Nhập họ và tên' }]}>
                    <Input style={{ background: '#0c1524', border: '1px solid #162036', color: '#fff' }} />
                  </Form.Item>
                ) : (
                  <span className="activity-value" style={{ color: '#fff', fontSize: '.85rem', fontWeight: 400 }}>{user?.full_name || '—'}</span>
                )}
              </div>

              {/* Số điện thoại */}
              <div className="activity-row" style={{ padding: '14px 0' }}>
                <span className="activity-label" style={{ fontSize: '.85rem' }}>Số điện thoại</span>
                {editing ? (
                  <Form.Item name="phone" style={{ margin: 0, flex: 1, maxWidth: 350 }} rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
                    <Input style={{ background: '#0c1524', border: '1px solid #162036', color: '#fff' }} />
                  </Form.Item>
                ) : (
                  <span className="activity-value" style={{ color: user?.phone ? '#fff' : '#ef4444', fontSize: '.85rem', fontWeight: 400 }}>
                    {user?.phone || '⚠ Chưa cập nhật'}
                  </span>
                )}
              </div>

              {/* Vai trò */}
              <div className="activity-row" style={{ padding: '14px 0', borderBottom: 'none' }}>
                <span className="activity-label" style={{ fontSize: '.85rem' }}>Vai trò</span>
                <div>
                  {user?.roles?.map((r) => (
                    <span key={r.role_name} style={{
                      display: 'inline-block', border: '1px solid #00d4ff', color: '#00d4ff',
                      padding: '2px 10px', borderRadius: 20, fontSize: '.7rem', fontWeight: 700,
                      background: 'rgba(0,212,255,0.05)'
                    }}>
                      {r.role_name.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Divider: THÔNG TIN SINH VIÊN */}
              <div className="sp-profile-divider" style={{ margin: '24px 0 16px' }}><span>Thông tin sinh viên</span></div>

              {/* Mã số sinh viên */}
              <div className="activity-row" style={{ padding: '14px 0' }}>
                <span className="activity-label" style={{ fontSize: '.85rem' }}>Mã số sinh viên</span>
                {editing ? (
                  <Form.Item name="student_id" style={{ margin: 0, flex: 1, maxWidth: 350 }} rules={[{ required: true, message: 'Nhập mã số sinh viên' }]}>
                    <Input style={{ background: '#0c1524', border: '1px solid #162036', color: '#fff' }} />
                  </Form.Item>
                ) : (
                  <span className="activity-value" style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>
                    {user?.student_id || '⚠ Chưa cập nhật'}
                  </span>
                )}
              </div>

              {/* Hình ảnh thẻ sinh viên */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                <span className="activity-label" style={{ fontSize: '.85rem' }}>Hình ảnh thẻ sinh viên</span>

                {editing ? (
                  <div
                    onClick={() => cardRef.current?.click()}
                    style={{
                      border: '2px dashed #1e3a54', borderRadius: 8, padding: '24px 16px',
                      cursor: 'pointer', textAlign: 'center', transition: 'border-color .2s',
                      background: 'rgba(0,212,255,.02)', maxWidth: 450
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#00d4ff'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e3a54'}
                  >
                    {cardPreview || user?.student_card ? (
                      <div>
                        <img
                          src={cardPreview || user?.student_card}
                          alt="Preview thẻ sinh viên"
                          style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, objectFit: 'cover' }}
                        />
                        <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: 8 }}>Nhấn để đổi ảnh</div>
                      </div>
                    ) : (
                      <div style={{ color: '#64748b' }}>
                        <IdcardOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                        <div style={{ fontSize: '.83rem' }}>Nhấn để tải lên hình ảnh thẻ sinh viên</div>
                        <div style={{ fontSize: '.72rem', marginTop: 4 }}>JPG, PNG, tối đa 5MB</div>
                      </div>
                    )}
                  </div>
                ) : (
                  user?.student_card ? (
                    <div style={{ display: 'inline-block', maxWidth: 450 }}>
                      <img
                        src={user.student_card}
                        alt="Thẻ sinh viên"
                        style={{ width: '100%', height: 260, borderRadius: '8px 8px 0 0', objectFit: 'cover', display: 'block', border: '1px solid #162036', borderBottom: 'none' }}
                      />
                      <div className="card-upload-footer">
                        <CheckCircleFilled /> Đã tải lên thành công
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#ef4444', fontSize: '.85rem' }}>⚠ Chưa tải lên</span>
                  )
                )}
                <input ref={cardRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCardChange} />
              </div>
            </Form>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="profile-sidebar-col">
          {/* Sidebar Card 1: Avatar and main action buttons */}
          <div className="sp-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
            <div className="profile-sidebar-avatar-wrap">
              <img
                src={avatarSrc || 'https://via.placeholder.com/150'}
                alt="Avatar"
                className="profile-sidebar-avatar-img"
                style={{ cursor: editing ? 'pointer' : 'default' }}
                onClick={editing ? () => fileRef.current?.click() : undefined}
              />
              {editing && (
                <div className="profile-sidebar-camera-btn" onClick={() => fileRef.current?.click()}>
                  <CameraOutlined style={{ fontSize: 13 }} />
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                {user?.full_name || '—'}
              </h3>
              <div style={{ fontSize: '.82rem', color: '#64748b' }}>
                @{user?.email ? user.email.split('@')[0] : 'user'}_dev
              </div>
            </div>

            {/* Sidebar action buttons */}
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                <button
                  className="sp-btn sp-btn--primary"
                  style={{ width: '100%', justifyContent: 'center', background: '#00d4ff', color: '#060b16', border: 'none', fontWeight: 700 }}
                  onClick={handleSave}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  className="sp-btn"
                  style={{ width: '100%', justifyContent: 'center', background: 'transparent', color: '#fff', border: '1px solid #162036' }}
                  onClick={handleCancel}
                  disabled={saveLoading}
                >
                  Huỷ
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                <button
                  className="sp-btn"
                  style={{ width: '100%', justifyContent: 'center', background: '#00d4ff', color: '#060b16', border: 'none', fontWeight: 700 }}
                  onClick={handleEdit}
                >
                  <EditOutlined style={{ marginRight: 4 }} /> Chỉnh sửa hồ sơ
                </button>
                <button
                  className="sp-btn"
                  style={{ width: '100%', justifyContent: 'center', background: 'transparent', color: '#fff', border: '1px solid #162036' }}
                  onClick={() => {
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPwErrors({});
                    setPwOpen(true);
                  }}
                >
                  <UnlockOutlined style={{ marginRight: 4 }} /> Đổi mật khẩu
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Card 2: Activity Stats */}
          <div className="sp-card" style={{ padding: '20px 24px' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '.8rem', fontWeight: 700, color: '#4a6080', letterSpacing: '.8px', textTransform: 'uppercase' }}>
              HOẠT ĐỘNG
            </h4>

            <div className="activity-row">
              <span className="activity-label">Xếp hạng hackathon</span>
              <span className="activity-value" style={{ color: '#fbbf24' }}>#14</span>
            </div>
            <div className="activity-row">
              <span className="activity-label">Đồ án đã nộp</span>
              <span className="activity-value">3</span>
            </div>
            <div className="activity-row">
              <span className="activity-label">Đồng đội kết nối</span>
              <span className="activity-value">12</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Password Modal - Premium Glassmorphism Experience */}
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
