import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../team-verify/TeamVerifyPage.css';

const API = import.meta.env.VITE_API_URL || '';

export default function InvitationVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status,   setStatus]   = useState(() => (token ? 'loading' : 'error'));
  const [message,  setMessage]  = useState(() => token ? '' : 'Link xác thực không hợp lệ hoặc đã hết hạn.');
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/teams/verify?token=${token}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setTeamName(data.data?.teamName || data.data?.team_name || data.data?.name || '');
          setMessage(data.message || 'Email của bạn đã được xác nhận. Chào mừng đến với đội thi!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Link xác nhận không hợp lệ hoặc đã hết hạn (24 giờ).');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      });
  }, [token]);

  return (
    <div className="verify-container">
      <div className="verify-card">
        {/* Branding */}
        <div className="verify-brand">
          <div className="verify-brand__logo">S</div>
          <span className="verify-brand__name">SEAL Hackathon</span>
        </div>

        {status === 'loading' && (
          <div className="verify-state">
            <div className="verify-spinner" />
            <p className="verify-title">Đang xác nhận lời mời...</p>
            <p className="verify-desc">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-state">
            <div className="verify-icon verify-icon--success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="verify-title">Tham gia đội thành công!</p>
            {teamName && (
              <p className="verify-team">
                Đội thi: <strong>{teamName}</strong>
              </p>
            )}
            <p className="verify-desc">{message}</p>
            <div className="verify-actions">
              <button className="verify-btn verify-btn--primary" onClick={() => navigate('/dashboard')}>
                Đến Dashboard
              </button>
              <button className="verify-btn verify-btn--ghost" onClick={() => navigate('/')}>
                Trang chủ
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-state">
            <div className="verify-icon verify-icon--error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <p className="verify-title">Xác nhận thất bại</p>
            <p className="verify-desc">{message}</p>
            <div className="verify-actions">
              <button className="verify-btn verify-btn--primary" onClick={() => navigate('/login')}>
                Đăng nhập
              </button>
              <button className="verify-btn verify-btn--ghost" onClick={() => navigate('/')}>
                Trang chủ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
