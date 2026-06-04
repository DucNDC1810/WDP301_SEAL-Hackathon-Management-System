import { useState } from 'react';
import { Form, Input, Button, Card, Avatar, Typography, Divider, Tag, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import './ProfilePage.css';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const { user, login } = useAuth();
  const { request } = useApi();
  const [editLoading, setEditLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [infoForm] = Form.useForm();
  const [pwForm] = Form.useForm();

  const handleUpdateInfo = async (values) => {
    setEditLoading(true);
    try {
      const data = await request('/api/users/me', { method: 'PUT', body: values });
      login({ ...user, ...data.data, accessToken: localStorage.getItem('accessToken') });
      message.success('Cập nhật thành công');
    } catch (err) {
      message.error(err.message || 'Tính năng đang phát triển');
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    setPwLoading(true);
    try {
      await request('/api/auth/change-password', {
        method: 'POST',
        body: { oldPassword: values.oldPassword, newPassword: values.newPassword },
      });
      message.success('Đổi mật khẩu thành công');
      pwForm.resetFields();
    } catch (err) {
      message.error(err.message || 'Tính năng đang phát triển');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <Title level={3}>Hồ sơ của tôi</Title>

      <Card className="profile-page__card">
        <div className="profile-page__avatar-section">
          <Avatar size={80} src={user?.avatar_url} icon={<UserOutlined />} />
          <div>
            <Title level={4} style={{ margin: 0 }}>{user?.full_name}</Title>
            <Text type="secondary">{user?.email}</Text>
            <div style={{ marginTop: 4 }}>
              {user?.roles?.map((r) => (
                <Tag key={r.role_name} color="blue">{r.role_name}</Tag>
              ))}
            </div>
          </div>
        </div>

        <Divider orientation="left">Thông tin cơ bản</Divider>
        <Form
          form={infoForm}
          layout="vertical"
          initialValues={{ full_name: user?.full_name, phone: user?.phone }}
          onFinish={handleUpdateInfo}
          style={{ maxWidth: 480 }}
        >
          <Form.Item label="Email">
            <Input value={user?.email} disabled />
          </Form.Item>
          <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={editLoading}>
            Lưu thay đổi
          </Button>
        </Form>

        <Divider orientation="left">Đổi mật khẩu</Divider>
        <Form
          form={pwForm}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ maxWidth: 480 }}
        >
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
          <Button htmlType="submit" loading={pwLoading}>
            Đổi mật khẩu
          </Button>
        </Form>
      </Card>
    </div>
  );
}
