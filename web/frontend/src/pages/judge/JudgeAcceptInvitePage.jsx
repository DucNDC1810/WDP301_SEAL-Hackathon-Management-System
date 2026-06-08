import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Alert, Spin, Card, Typography } from 'antd';

const { Title, Text } = Typography;
const API = import.meta.env.VITE_API_URL || '';

export default function JudgeAcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form] = Form.useForm();

  // Load preview — tên cuộc thi, email
  useEffect(() => {
    if (!token) { setPreviewError('Liên kết không hợp lệ.'); setPreviewLoading(false); return; }
    fetch(`${API}/api/invitations/preview?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (!d || d.success === false) throw new Error(d?.message || 'Lời mời không hợp lệ hoặc đã hết hạn');
        const inv = d.data || d;
        setPreview({ email: inv.email, contestTitle: inv.contest_id?.title || 'cuộc thi' });
      })
      .catch(e => setPreviewError(e.message))
      .finally(() => setPreviewLoading(false));
  }, [token]);

  const onFinish = async ({ full_name, password }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/invitations/judge/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi kích hoạt tài khoản');
      setDone(true);
    } catch (e) {
      form.setFields([{ name: 'password', errors: [e.message] }]);
    } finally {
      setSubmitting(false);
    }
  };

  if (previewLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (previewError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <Alert type="error" showIcon message="Liên kết không hợp lệ" description={previewError} />
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate('/login')}>Về trang đăng nhập</Button>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <Title level={4}>Tài khoản đã được kích hoạt!</Title>
          <Text type="secondary">Bạn có thể đăng nhập để bắt đầu chấm điểm.</Text>
          <br /><br />
          <Button type="primary" onClick={() => navigate('/login')}>Đăng nhập ngay</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚖️</div>
          <Title level={4} style={{ margin: 0 }}>Xác nhận tham gia làm Giám khảo</Title>
          <Text type="secondary">
            Bạn được mời làm giám khảo cho <strong>{preview.contestTitle}</strong>
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 13 }}>Email: <strong>{preview.email}</strong></Text>
        </div>

        <Alert
          type="info"
          showIcon
          message="Điền thông tin để kích hoạt tài khoản"
          description="Tài khoản sẽ được tạo tự động với email trên và quyền Giám khảo."
          style={{ marginBottom: 20 }}
        />

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Họ và tên"
            name="full_name"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nguyễn Văn A" size="large" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 8, message: 'Mật khẩu tối thiểu 8 ký tự' },
            ]}
          >
            <Input.Password placeholder="Tối thiểu 8 ký tự" size="large" />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu"
            name="confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Mật khẩu không khớp'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu" size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
            Kích hoạt tài khoản
          </Button>
        </Form>
      </Card>
    </div>
  );
}
