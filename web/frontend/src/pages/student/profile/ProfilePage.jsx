import { useRef, useState, useEffect } from 'react';
import { Form, Input, Button, Avatar, Tag, message, Space, Tooltip } from 'antd';
import { CameraOutlined, UserOutlined, CheckCircleFilled, WarningFilled, IdcardOutlined } from '@ant-design/icons';
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

  const [infoForm] = Form.useForm();
  const [pwForm]   = Form.useForm();

  // Tự động mở edit nếu profile chưa hoàn thiện
  useEffect(() => {
    if (user && !isProfileComplete) {
      handleEdit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kiểm tra profile đã đầy đủ chưa
  const isProfileComplete = !!(user?.phone && user?.student_id && user?.student_card);

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

  const handleChangePassword = async (values) => {
    setPwLoading(true);
    try {
      await request('/api/users/me/password', {
        method: 'PATCH',
        body: { current_password: values.oldPassword, new_password: values.newPassword },
      });
      message.success('Đổi mật khẩu thành công');
      pwForm.resetFields();
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
      <h2 className="sp-page-title">Hồ sơ</h2>

      {/* Banner cảnh báo nếu chưa hoàn thiện thông tin */}
      {!isProfileComplete && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(251,146,60,.08)', border: '1px solid rgba(251,146,60,.35)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
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

      {/* Badge trạng thái */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {user?.profile_verify_status === 'approved' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 20, padding: '3px 12px', fontSize: '.75rem', fontWeight: 700, color: '#34d399' }}>
            <CheckCircleFilled /> Thông tin đã được xác thực
          </span>
        )}
        {user?.profile_verify_status === 'pending' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.3)', borderRadius: 20, padding: '3px 12px', fontSize: '.75rem', fontWeight: 700, color: '#60a5fa' }}>
            ⏳ Đang chờ Admin xét duyệt
          </span>
        )}
        {user?.profile_verify_status === 'rejected' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 20, padding: '3px 12px', fontSize: '.75rem', fontWeight: 700, color: '#f87171' }}>
            ✕ Yêu cầu bị từ chối
          </span>
        )}
        {(user?.profile_verify_status === 'unsubmitted' || !user?.profile_verify_status) && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.3)', borderRadius: 20, padding: '3px 12px', fontSize: '.75rem', fontWeight: 700, color: '#fb923c' }}>
            <WarningFilled /> Chưa xác thực thông tin
          </span>
        )}
        {isProfileComplete && (user?.profile_verify_status === 'unsubmitted' || user?.profile_verify_status === 'rejected' || !user?.profile_verify_status) && (
          <Button
            type="primary"
            loading={verifyLoading}
            onClick={handleSendVerifyRequest}
            style={{ borderRadius: 20, fontSize: '.75rem', height: 28, background: '#00d4ff', color: '#060b16', border: 'none', fontWeight: 700 }}
          >
            Gửi yêu cầu xác thực →
          </Button>
        )}
      </div>

      {/* Lý do từ chối */}
      {user?.profile_verify_status === 'rejected' && user?.profile_verify_note && (
        <div style={{ background: 'rgba(248,113,113,.07)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#f87171', fontSize: '.8rem', marginBottom: 4 }}>Lý do từ chối:</div>
          <div style={{ color: '#94a3b8', fontSize: '.83rem' }}>{user.profile_verify_note}</div>
        </div>
      )}

      <div className="sp-card sp-profile">

        {/* Basic info divider */}
        <div className="sp-profile-divider"><span>Thông tin cơ bản</span></div>

        <div className="sp-profile-row">
          {/* Left: fields */}
          <div className="sp-profile-fields">
            {!editing ? (
              <>
                <div className="sp-profile-field">
                  <span className="sp-profile-field-label">Email</span>
                  <span className="sp-text">{user?.email}</span>
                </div>
                <div className="sp-profile-field">
                  <span className="sp-profile-field-label">Họ và tên</span>
                  <span className="sp-text">{user?.full_name || '—'}</span>
                </div>
                <div className="sp-profile-field">
                  <span className="sp-profile-field-label">Số điện thoại</span>
                  <span className="sp-text" style={{ color: user?.phone ? undefined : '#ef4444' }}>
                    {user?.phone || '⚠ Chưa cập nhật'}
                  </span>
                </div>
                <div className="sp-profile-field">
                  <span className="sp-profile-field-label">Vai trò</span>
                  <div>
                    {user?.roles?.map((r) => (
                      <Tag key={r.role_name} color="blue">{r.role_name}</Tag>
                    ))}
                  </div>
                </div>

                {/* Divider sinh viên */}
                <div className="sp-profile-divider" style={{ margin: '16px 0 12px' }}><span>Thông tin sinh viên</span></div>

                <div className="sp-profile-field">
                  <span className="sp-profile-field-label">Mã số sinh viên</span>
                  <span className="sp-text" style={{ color: user?.student_id ? undefined : '#ef4444' }}>
                    {user?.student_id || '⚠ Chưa cập nhật'}
                  </span>
                </div>
                <div className="sp-profile-field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <span className="sp-profile-field-label">Hình ảnh thẻ sinh viên</span>
                  {user?.student_card ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={user.student_card}
                        alt="Thẻ sinh viên"
                        style={{ maxWidth: 280, maxHeight: 160, borderRadius: 8, border: '1px solid #1e3a54', objectFit: 'cover' }}
                      />
                      <span style={{ display: 'block', marginTop: 4, fontSize: '.72rem', color: '#34d399' }}>✓ Đã tải lên</span>
                    </div>
                  ) : (
                    <span style={{ color: '#ef4444', fontSize: '.85rem' }}>⚠ Chưa tải lên</span>
                  )}
                </div>
              </>
            ) : (
              <Form form={infoForm}>
                <div className="sp-profile-field">
                  <span className="sp-profile-field-label">Email</span>
                  <Input value={user?.email} disabled style={{ flex: 1 }} />
                </div>
                <div className="sp-profile-field">
                  <span className="sp-profile-field-label">Họ và tên</span>
                  <Form.Item name="full_name" style={{ flex: 1, margin: 0 }} rules={[{ required: true, message: 'Nhập họ và tên' }]}>
                    <Input />
                  </Form.Item>
                </div>
                <div className="sp-profile-field">
                  <span className="sp-profile-field-label">Số điện thoại</span>
                  <Form.Item name="phone" style={{ flex: 1, margin: 0 }} rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
                    <Input placeholder="0901234567" />
                  </Form.Item>
                </div>

                <div className="sp-profile-divider" style={{ margin: '16px 0 12px' }}><span>Thông tin sinh viên</span></div>

                <div className="sp-profile-field">
                  <span className="sp-profile-field-label">Mã số sinh viên</span>
                  <Form.Item name="student_id" style={{ flex: 1, margin: 0 }} rules={[{ required: true, message: 'Nhập mã số sinh viên' }]}>
                    <Input placeholder="VD: SE123456" />
                  </Form.Item>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span className="sp-profile-field-label" style={{ display: 'block', marginBottom: 8 }}>Hình ảnh thẻ sinh viên *</span>
                  <div
                    onClick={() => cardRef.current?.click()}
                    style={{
                      border: '2px dashed #1e3a54', borderRadius: 8, padding: '16px',
                      cursor: 'pointer', textAlign: 'center', transition: 'border-color .2s',
                      background: 'rgba(0,212,255,.03)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#00d4ff'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e3a54'}
                  >
                    {cardPreview || user?.student_card ? (
                      <div>
                        <img
                          src={cardPreview || user?.student_card}
                          alt="Preview thẻ sinh viên"
                          style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, objectFit: 'cover', marginBottom: 8 }}
                        />
                        <div style={{ fontSize: '.75rem', color: '#64748b' }}>Nhấn để đổi ảnh</div>
                      </div>
                    ) : (
                      <div style={{ color: '#64748b' }}>
                        <IdcardOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                        <div style={{ fontSize: '.83rem' }}>Nhấn để tải lên hình ảnh thẻ sinh viên</div>
                        <div style={{ fontSize: '.72rem', marginTop: 4 }}>JPG, PNG, tối đa 5MB</div>
                      </div>
                    )}
                  </div>
                  <input ref={cardRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCardChange} />
                </div>
              </Form>
            )}
          </div>

          {/* Right: avatar + action buttons */}
          <div className="sp-profile-avatar-col">
            <div
              className={`sp-avatar-wrap${editing ? ' sp-avatar-wrap--editing' : ''}`}
              onClick={editing ? () => fileRef.current?.click() : undefined}
            >
              <Avatar size={80} src={avatarSrc} icon={<UserOutlined />} />
              {editing && (
                <Tooltip title="Đổi ảnh (tối đa 2MB)">
                  <div className="sp-avatar-overlay">
                    <CameraOutlined />
                  </div>
                </Tooltip>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>

            <div className="sp-stack" style={{ marginTop: 10, width: '100%' }}>
              {!editing ? (
                <button className="sp-btn sp-btn--sm" onClick={handleEdit}>Chỉnh sửa</button>
              ) : (
                <>
                  <Button type="primary" size="small" loading={saveLoading} onClick={handleSave} block>Lưu</Button>
                  <Button size="small" onClick={handleCancel} disabled={saveLoading} block>Huỷ</Button>
                </>
              )}
              {!editing && (
                <button
                  className="sp-btn sp-btn--sm"
                  onClick={() => { setPwOpen((v) => !v); pwForm.resetFields(); }}
                >
                  Đổi mật khẩu
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Change password — collapsible */}
        {pwOpen && (
          <>
            <div className="sp-profile-divider"><span>Đổi mật khẩu</span></div>
            <Form form={pwForm} layout="vertical" onFinish={handleChangePassword} style={{ maxWidth: 480 }}>
              <Form.Item name="oldPassword" label="Mật khẩu hiện tại" rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
              <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}>
                <Input.Password />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu mới"
                dependencies={['newPassword']}
                rules={[
                  { required: true },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                      return Promise.reject(new Error('Mật khẩu không khớp'));
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={pwLoading}>Lưu</Button>
                <Button onClick={() => { setPwOpen(false); pwForm.resetFields(); }}>Huỷ</Button>
              </Space>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
