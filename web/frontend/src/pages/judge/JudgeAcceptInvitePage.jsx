import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spin, Card, Typography, Alert, Button, Input } from 'antd';

const { Title, Text, Paragraph } = Typography;
const API = import.meta.env.VITE_API_URL || '';

export default function JudgeAcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [contestTitle, setContestTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState(null); // 'accepted' | 'declined' | null
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const didLoad = useRef(false);

  useEffect(() => {
    if (!token) {
      setError('Liên kết không hợp lệ.');
      setLoading(false);
      return;
    }
    if (didLoad.current) return;
    didLoad.current = true;

    const loadPreview = async () => {
      try {
        const res = await fetch(`${API}/api/invitations/preview?token=${token}`);
        const data = await res.json();
        if (!res.ok || !data || data.success === false) {
          throw new Error(data?.message || 'Lời mời không hợp lệ hoặc đã hết hạn');
        }
        const inv = data.data || data;
        setEmail(inv.email);
        setContestTitle(inv.contest_id?.title || 'cuộc thi');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [token]);

  const handleAccept = async () => {
    setSubmitting(true);
    setError('');
    try {
      const prefix = email.split('@')[0];
      const fullName = prefix
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const res = await fetch(`${API}/api/invitations/judge/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể chấp nhận lời mời');
      }
      setIsNewAccount(!!data.data?.isNewAccount);
      setOutcome('accepted');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/invitations/decline?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể từ chối lời mời');
      }
      setOutcome('declined');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', gap: 16 }}>
        <Spin size="large" />
        <Text style={{ fontSize: 16, fontWeight: 500, color: '#4f46e5' }}>Đang tải thông tin lời mời...</Text>
      </div>
    );
  }

  if (error && !outcome) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f7fa' }}>
        <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Alert type="error" showIcon message="Không thể xử lý" description={error} style={{ borderRadius: 8 }} />
          <Button type="primary" style={{ marginTop: 24, height: 40, borderRadius: 6 }} onClick={() => navigate('/login')} block>
            Về trang đăng nhập
          </Button>
        </Card>
      </div>
    );
  }

  if (outcome === 'accepted') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f7fa' }}>
        <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <Title level={3} style={{ margin: '0 0 8px 0', color: '#1a1a2e' }}>Đã chấp nhận lời mời!</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Chào mừng bạn đến với cuộc thi <strong>{contestTitle}</strong>.
          </Text>

          {isNewAccount ? (
            <Alert
              type="info"
              showIcon
              message="Tài khoản của bạn đã được tạo"
              description={
                <div style={{ textAlign: 'left', marginTop: 8 }}>
                  <div>Tài khoản: <strong>{email}</strong></div>
                  <div style={{ marginTop: 8 }}>
                    Hệ thống đã gửi email chứa liên kết để bạn <strong>đặt mật khẩu lần đầu</strong>. Vui lòng kiểm tra hộp thư (kể cả mục spam) và làm theo hướng dẫn trước khi đăng nhập.
                  </div>
                </div>
              }
              style={{ marginBottom: 24, borderRadius: 8 }}
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="Tài khoản của bạn đã được phân quyền Giám khảo"
              description={`Đăng nhập bằng tài khoản hiện có: ${email}`}
              style={{ marginBottom: 24, borderRadius: 8 }}
            />
          )}

          <Button type="primary" size="large" style={{ height: 44, borderRadius: 6 }} onClick={() => navigate('/login')} block>
            Đăng nhập ngay
          </Button>
        </Card>
      </div>
    );
  }

  if (outcome === 'declined') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f7fa' }}>
        <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
          <Title level={3} style={{ margin: '0 0 8px 0', color: '#1a1a2e' }}>Đã từ chối lời mời</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Ban tổ chức cuộc thi <strong>{contestTitle}</strong> đã được thông báo. Cảm ơn bạn đã phản hồi.
          </Text>
          <Button style={{ height: 40, borderRadius: 6 }} onClick={() => navigate('/')} block>
            Về trang chủ
          </Button>
        </Card>
      </div>
    );
  }

  // Trạng thái mặc định: hiển thị thông tin lời mời + 2 lựa chọn Chấp nhận / Từ chối
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f7fa' }}>
      <Card style={{ maxWidth: 480, width: '100%', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 40 }}>⚖️</div>
          <Title level={3} style={{ margin: '8px 0' }}>Lời mời làm Giám khảo</Title>
        </div>
        <Paragraph style={{ textAlign: 'center' }}>
          Bạn (<strong>{email}</strong>) được mời tham gia làm <strong>Giám khảo</strong> cho cuộc thi <strong>{contestTitle}</strong>.
        </Paragraph>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16, borderRadius: 8 }} />}

        {!showDeclineForm ? (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <Button danger style={{ flex: 1, height: 44, borderRadius: 6 }} onClick={() => setShowDeclineForm(true)} disabled={submitting}>
              Từ chối
            </Button>
            <Button type="primary" style={{ flex: 1, height: 44, borderRadius: 6 }} onClick={handleAccept} loading={submitting}>
              Chấp nhận
            </Button>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <Text style={{ display: 'block', marginBottom: 8 }}>Lý do từ chối (không bắt buộc — ví dụ: đang bận):</Text>
            <Input.TextArea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Vd: Tôi đang bận trong khoảng thời gian này..."
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <Button style={{ flex: 1, height: 40, borderRadius: 6 }} onClick={() => setShowDeclineForm(false)} disabled={submitting}>
                Quay lại
              </Button>
              <Button danger type="primary" style={{ flex: 1, height: 40, borderRadius: 6 }} onClick={handleDecline} loading={submitting}>
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
