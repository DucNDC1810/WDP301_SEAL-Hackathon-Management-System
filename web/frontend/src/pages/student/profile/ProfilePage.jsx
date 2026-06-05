import { useRef, useState } from 'react';
import { Form, Input, Button, Card, Avatar, Typography, Divider, Tag, message, Space, Tooltip } from 'antd';
import { CameraOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import './ProfilePage.css';

const { Text } = Typography;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { request } = useApi();
  const fileRef = useRef(null);

  const [editing,      setEditing]      = useState(false);
  const [saveLoading,  setSaveLoading]  = useState(false);
  const [pwLoading,    setPwLoading]    = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pwOpen,       setPwOpen]       = useState(false);

  const [infoForm] = Form.useForm();
  const [pwForm]   = Form.useForm();

  const handleEdit = () => {
    infoForm.setFieldsValue({ full_name: user?.full_name, phone: user?.phone });
    setAvatarPreview(null);
    setEditing(true);
  };

  const handleCancel = () => {
    infoForm.resetFields();
    setAvatarPreview(null);
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

  const handleSave = async () => {
    let values;
    try { values = await infoForm.validateFields(); } catch { return; }
    setSaveLoading(true);
    try {
      const body = { ...values };
      if (avatarPreview) body.avatar_url = avatarPreview;
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
    <div className="profile-page">
      <Card className="profile-page__card">

        {/* Thông tin cơ bản */}
        <Divider orientation="left">Thông tin cơ bản</Divider>

        <div className="profile-page__info-row">
          {/* Left: fields */}
          <div className="profile-page__fields">
            {!editing ? (
              <>
                <div className="profile-page__view-row">
                  <Text type="secondary" className="profile-page__view-label">Email</Text>
                  <Text>{user?.email}</Text>
                </div>
                <div className="profile-page__view-row">
                  <Text type="secondary" className="profile-page__view-label">Họ và tên</Text>
                  <Text>{user?.full_name || '—'}</Text>
                </div>
                <div className="profile-page__view-row">
                  <Text type="secondary" className="profile-page__view-label">Số điện thoại</Text>
                  <Text>{user?.phone || '—'}</Text>
                </div>
                <div className="profile-page__view-row">
                  <Text type="secondary" className="profile-page__view-label">Vai trò</Text>
                  <div>
                    {user?.roles?.map((r) => (
                      <Tag key={r.role_name} color="blue">{r.role_name}</Tag>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <Form form={infoForm}>
                <div className="profile-page__view-row">
                  <Text type="secondary" className="profile-page__view-label">Email</Text>
                  <Input value={user?.email} disabled style={{ flex: 1 }} />
                </div>
                <div className="profile-page__view-row">
                  <Text type="secondary" className="profile-page__view-label">Họ và tên</Text>
                  <Form.Item name="full_name" style={{ flex: 1, margin: 0 }} rules={[{ required: true, message: 'Nhập họ và tên' }]}>
                    <Input />
                  </Form.Item>
                </div>
                <div className="profile-page__view-row">
                  <Text type="secondary" className="profile-page__view-label">Số điện thoại</Text>
                  <Form.Item name="phone" style={{ flex: 1, margin: 0 }}>
                    <Input />
                  </Form.Item>
                </div>
              </Form>
            )}
          </div>

          {/* Right: avatar + action buttons */}
          <div className="profile-page__avatar-col">
            <div
              className={`profile-page__avatar-wrap${editing ? ' profile-page__avatar-wrap--editing' : ''}`}
              onClick={editing ? () => fileRef.current?.click() : undefined}
            >
              <Avatar size={80} src={avatarSrc} icon={<UserOutlined />} />
              {editing && (
                <Tooltip title="Đổi ảnh (tối đa 2MB)">
                  <div className="profile-page__avatar-overlay">
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

            <Space direction="vertical" style={{ marginTop: 10, width: '100%' }}>
              {!editing ? (
                <Button size="small" onClick={handleEdit} block>Chỉnh sửa</Button>
              ) : (
                <>
                  <Button type="primary" size="small" loading={saveLoading} onClick={handleSave} block>Lưu</Button>
                  <Button size="small" onClick={handleCancel} disabled={saveLoading} block>Huỷ</Button>
                </>
              )}
              {!editing && (
                <Button
                  size="small"
                  block
                  onClick={() => { setPwOpen((v) => !v); pwForm.resetFields(); }}
                >
                  Đổi mật khẩu
                </Button>
              )}
            </Space>
          </div>
        </div>

        {/* Đổi mật khẩu — collapsible */}
        {pwOpen && (
          <>
            <Divider orientation="left">Đổi mật khẩu</Divider>
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
      </Card>
    </div>
  );
}
