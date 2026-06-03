import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './TeamVerifyPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function TeamVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState(() => (token ? 'loading' : 'error'));
  const [message, setMessage] = useState(() =>
    token ? '' : 'Mã xác thực không hợp lệ hoặc đã hết hạn.'
  );
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/api/teams/verify?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setTeamName(data.data?.teamName || data.data?.name || '');
          setMessage(data.message || 'Thành viên đã được xác thực thành công!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Xác thực thất bại. Vui lòng thử lại.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Có lỗi kết nối hệ thống. Vui lòng thử lại sau.');
      });
  }, [token]);

  return (
    <div className="verify-container">
      <div className="verify-card">
        {status === 'loading' && (
          <div className="verify-state verify-state--loading">
            <div className="verify-spinner"></div>
            <p className="verify-title">Đang xác thực thành viên...</p>
            <p className="verify-desc">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-state verify-state--success">
            <div className="verify-icon verify-icon--success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <p className="verify-title">Xác thực thành công!</p>
            {teamName && (
              <p className="verify-team">
                Đội thi: <strong>{teamName}</strong>
              </p>
            )}
            <p className="verify-desc">{message}</p>
            <button className="verify-btn" onClick={() => navigate('/')}>
              Về trang chủ
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-state verify-state--error">
            <div className="verify-icon verify-icon--error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <p className="verify-title">Lỗi xác thực!</p>
            <p className="verify-desc">{message}</p>
            <button className="verify-btn" onClick={() => navigate('/')}>
              Về trang chủ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
