import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spin, Card, Typography, Alert, Button, Input, Tag } from 'antd';

const { Title, Text, Paragraph } = Typography;
const API = import.meta.env.VITE_API_URL || '';

const ROLE_LABEL = { judge: 'Giám khảo', mentor: 'Mentor' };

export default function ScheduleChangeResponsePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState(null); // 'confirmed' | 'declined' | null
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
        const res = await fetch(`${API}/api/schedule-change/preview?token=${token}`);
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data?.message || 'Liên kết không hợp lệ hoặc đã hết hạn');
        }
        setInfo(data.data);
        if (data.data.status !== 'pending') {
          setOutcome(data.data.status === 'confirmed' ? 'confirmed' : 'declined');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [token]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/schedule-change/confirm?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Không thể xác nhận');
      }
      setOutcome('confirmed');
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
      const res = await fetch(`${API}/api/schedule-change/decline?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Không thể từ chối');
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
        <Text style={{ fontSize: 16, fontWeight: 500, color: '#4f46e5' }}>Đang tải thông tin...</Text>
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

  if (outcome === 'confirmed') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f7fa' }}>
        <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <Title level={3} style={{ margin: '0 0 8px 0', color: '#1a1a2e' }}>Đã xác nhận tiếp tục tham gia</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Cảm ơn bạn đã phản hồi. Vòng thi <strong>{info?.round_name}</strong> của cuộc thi <strong>{info?.contest_title}</strong> vẫn diễn ra như lịch mới, mong bạn sắp xếp tham gia đầy đủ.
          </Text>
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
          <Title level={3} style={{ margin: '0 0 8px 0', color: '#1a1a2e' }}>Đã ghi nhận từ chối</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Bạn đã rút khỏi vòng thi <strong>{info?.round_name}</strong>. Ban tổ chức đã được thông báo để tìm người thay thế. Cảm ơn bạn đã phản hồi.
          </Text>
          <Button style={{ height: 40, borderRadius: 6 }} onClick={() => navigate('/')} block>
            Về trang chủ
          </Button>
        </Card>
      </div>
    );
  }

  // Trạng thái mặc định: hiển thị thông tin + 2 lựa chọn Xác nhận / Từ chối
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f7fa' }}>
      <Card style={{ maxWidth: 480, width: '100%', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 40 }}>🔔</div>
          <Title level={3} style={{ margin: '8px 0' }}>Thay đổi lịch trình</Title>
        </div>
        <Paragraph style={{ textAlign: 'center' }}>
          Với vai trò <Tag color="purple">{ROLE_LABEL[info?.recipient_role] || info?.recipient_role}</Tag>, vòng thi <strong>{info?.round_name}</strong> của cuộc thi <strong>{info?.contest_title}</strong> đã được kích hoạt lệch với lịch dự kiến.
        </Paragraph>
        {info?.reason && (
          <Paragraph style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Lý do: {info.reason}
          </Paragraph>
        )}
        <Paragraph style={{ textAlign: 'center', fontWeight: 600 }}>
          Bạn có còn tiếp tục tham gia vòng thi này được không?
        </Paragraph>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16, borderRadius: 8 }} />}

        {!showDeclineForm ? (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <Button danger style={{ flex: 1, height: 44, borderRadius: 6 }} onClick={() => setShowDeclineForm(true)} disabled={submitting}>
              Từ chối
            </Button>
            <Button type="primary" style={{ flex: 1, height: 44, borderRadius: 6 }} onClick={handleConfirm} loading={submitting}>
              Xác nhận
            </Button>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <Text style={{ display: 'block', marginBottom: 8 }}>Lý do (không bắt buộc — ví dụ: trùng lịch khác):</Text>
            <Input.TextArea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Vd: Tôi bận vào khung giờ mới này..."
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
