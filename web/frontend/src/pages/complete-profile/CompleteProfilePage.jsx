import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Form, Input, Spin, Typography, message } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

export const CompleteProfilePage = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { login }      = useAuth();

  const [fullName, setFullName] = useState('');
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) { navigate('/login', { replace: true }); return; }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success || data.data) {
          setFullName(data.data?.full_name ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [token, navigate]);

  const onFinish = async ({ phone }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/complete-profile`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật thông tin');

      await login({ accessToken: token });
      message.success('Chào mừng bạn đến với SEAL Hackathon!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) return null;

  return (
    <div
      style={{
        minHeight:      '100vh',
        background:     '#0d1117',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '24px 16px',
      }}
    >
      <Card
        style={{ width: '100%', maxWidth: 420, background: '#111827', border: '1px solid #1f2937' }}
        styles={{ body: { padding: '32px 28px' } }}
      >
        <div className="text-center mb-6">
          <span style={{ color: '#00f0ff', fontWeight: 700, fontSize: 22, letterSpacing: '0.08em' }}>SEAL</span>
          <span style={{ color: '#6b7280', fontSize: 13, marginLeft: 6 }}>Hackathon</span>
        </div>

        {fetching ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Title level={4} style={{ color: '#f9fafb', marginBottom: 4, textAlign: 'center' }}>
              Xin chào{fullName ? `, ${fullName}` : ''}!
            </Title>
            <Text style={{ color: '#9ca3af', display: 'block', textAlign: 'center', marginBottom: 24 }}>
              Vui lòng xác nhận số điện thoại để hoàn tất đăng ký.
            </Text>

            <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
              <Form.Item
                name="phone"
                label={<span style={{ color: '#d1d5db' }}>Số điện thoại</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại' },
                  { pattern: /^[0-9]{9,11}$/, message: 'Số điện thoại không hợp lệ' },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined style={{ color: '#6b7280' }} />}
                  placeholder="0901234567"
                  size="large"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={submitting}
                block
                style={{ marginTop: 8 }}
              >
                Bắt đầu tham gia
              </Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
};
