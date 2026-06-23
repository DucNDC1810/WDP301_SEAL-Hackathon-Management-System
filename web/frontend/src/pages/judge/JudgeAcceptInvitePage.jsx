import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spin, Card, Typography, Alert, Button } from 'antd';

const { Title, Text } = Typography;
const API = import.meta.env.VITE_API_URL || '';

export default function JudgeAcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [contestTitle, setContestTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const didRequest = useRef(false);

  useEffect(() => {
    if (!token) {
      setError('Liên kết không hợp lệ.');
      setLoading(false);
      return;
    }

    if (didRequest.current) return;
    didRequest.current = true;

    const autoActivate = async () => {
      try {
        // 1. Lấy thông tin preview để biết email và contest
        const previewRes = await fetch(`${API}/api/invitations/preview?token=${token}`);
        const previewData = await previewRes.json();
        if (!previewRes.ok || !previewData || previewData.success === false) {
          throw new Error(previewData?.message || 'Lời mời không hợp lệ hoặc đã hết hạn');
        }

        const inv = previewData.data || previewData;
        const targetEmail = inv.email;
        const title = inv.contest_id?.title || 'cuộc thi';
        setEmail(targetEmail);
        setContestTitle(title);

        // 2. Trích xuất tên hiển thị từ email
        const prefix = targetEmail.split('@')[0];
        const fullName = prefix
          .split(/[._-]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // 3. Tự động kích hoạt tài khoản với mật khẩu 123456
        const completeRes = await fetch(`${API}/api/invitations/judge/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            full_name: fullName || 'Giám khảo ngoài',
            password: '123456',
          }),
        });

        const completeData = await completeRes.json();
        if (!completeRes.ok) {
          throw new Error(completeData.message || 'Lỗi tự động kích hoạt tài khoản');
        }

        setDone(true);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    autoActivate();
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', gap: 16 }}>
        <Spin size="large" />
        <Text style={{ fontSize: 16, fontWeight: 500, color: '#4f46e5' }}>
          Đang tự động xác nhận và kích hoạt tài khoản giám khảo của bạn...
        </Text>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f7fa' }}>
        <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Alert type="error" showIcon message="Không thể kích hoạt" description={error} style={{ borderRadius: 8 }} />
          <Button type="primary" style={{ marginTop: 24, height: 40, borderRadius: 6 }} onClick={() => navigate('/login')} block>
            Về trang đăng nhập
          </Button>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f7fa' }}>
        <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <Title level={3} style={{ margin: '0 0 8px 0', color: '#1a1a2e' }}>Tài khoản đã được tự động kích hoạt!</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Chào mừng bạn đến với cuộc thi <strong>{contestTitle}</strong>. Tài khoản giám khảo của bạn đã sẵn sàng.
          </Text>

          <Alert
            type="info"
            showIcon
            message="Thông tin đăng nhập của bạn"
            description={
              <div style={{ textAlign: 'left', marginTop: 8 }}>
                <div>Tài khoản: <strong>{email}</strong></div>
                <div>Mật khẩu mặc định: <strong>123456</strong></div>
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>* Vui lòng đổi mật khẩu sau khi đăng nhập để bảo mật tài khoản.</div>
              </div>
            }
            style={{ marginBottom: 24, borderRadius: 8 }}
          />

          <Button type="primary" size="large" style={{ height: 44, borderRadius: 6 }} onClick={() => navigate('/login')} block>
            Đăng nhập ngay
          </Button>
        </Card>
      </div>
    );
  }

  return null;
}
