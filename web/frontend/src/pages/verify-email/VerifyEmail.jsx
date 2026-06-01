import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './VerifyEmail.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('send'); // 'send' | 'verify' | 'success' | 'error'
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check if there's a token in URL (from email link)
  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      verifyWithToken(token);
    }
  }, [searchParams]);

  // Get current user info
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserId(user._id);
  }, []);

  const verifyWithToken = async (token) => {
    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/contestants/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (data.success) {
        setPhase('success');
        setMessage(data.message);
        setStatus('success');
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.is_verified = true;
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        setPhase('error');
        setMessage(data.message);
        setStatus('error');
      }
    } catch {
      setPhase('error');
      setMessage('Không thể kết nối đến server');
      setStatus('error');
    }
  };

  const handleSendVerification = async () => {
    if (!userId) {
      setMessage('Vui lòng đăng nhập trước');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('loading');

    try {
      const res = await fetch(`${API_URL}/api/contestants/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setMessage(data.message);
        setStatus('success');
        setPhase('verify');
        // Show verification code in dev mode if provided
        if (data.verifyUrl) {
          console.log('Verify URL (dev mode):', data.verifyUrl);
        }
      } else {
        setMessage(data.message);
        setStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Không thể gửi email xác thực');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setMessage('Vui lòng nhập mã xác thực');
      setStatus('error');
      return;
    }

    if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      setMessage('Mã xác thực phải là 6 chữ số');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('loading');

    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, verification_code: verificationCode }),
      });
      const data = await res.json();

      if (data.success) {
        setPhase('success');
        setMessage(data.message);
        setStatus('success');
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.is_verified = true;
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        setMessage(data.message);
        setStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Không thể xác thực email');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ve-page" id="verify-email-page">
      <div className="ve-page__bg">
        <div className="ve-page__glow ve-page__glow--1" />
        <div className="ve-page__glow ve-page__glow--2" />
      </div>

      <div className="ve-card">
        {/* PHASE: SEND - Display button to send verification email */}
        {phase === 'send' && (
          <>
            <div className="ve-card__icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h2 className="ve-card__title">Xác Thực Email</h2>
            <p className="ve-card__desc">Vui lòng xác thực email để tiếp tục sử dụng hệ thống.</p>
            
            {message && (
              <div className={`ve-card__alert ve-card__alert--${status}`}>
                {message}
              </div>
            )}

            <button
              className="ve-card__btn"
              onClick={handleSendVerification}
              disabled={loading}
              id="btn-send-verification"
            >
              {loading ? 'Đang gửi...' : '✈️ GỬI EMAIL XÁC THỰC'}
            </button>

            <p className="ve-card__info">
              Sau khi nhận email, nhấn vào link xác thực rồi quay lại trang này.
            </p>
          </>
        )}

        {/* PHASE: VERIFY - Display form to enter verification code */}
        {phase === 'verify' && (
          <>
            <div className="ve-card__icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="ve-card__title">Nhập Mã Xác Thực</h2>
            <p className="ve-card__desc">Hãy nhập mã 6 chữ số được gửi tới email của bạn.</p>

            {message && (
              <div className={`ve-card__alert ve-card__alert--${status}`}>
                {message}
              </div>
            )}

            <div className="ve-card__input-group">
              <input
                type="text"
                maxLength="6"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setVerificationCode(value);
                }}
                disabled={loading}
                className="ve-card__input"
                id="verification-code-input"
              />
            </div>

            <button
              className="ve-card__btn"
              onClick={handleVerifyCode}
              disabled={loading || verificationCode.length !== 6}
              id="btn-verify-code"
            >
              {loading ? 'Đang xác thực...' : 'XÁC THỰC'}
            </button>

            <p className="ve-card__info">
              <span
                onClick={() => {
                  setPhase('send');
                  setStatus('idle');
                  setMessage('');
                }}
                className="ve-card__link"
              >
                ⤴️ Gửi lại email xác thực
              </span>
            </p>
          </>
        )}

        {/* PHASE: SUCCESS - Display success message */}
        {phase === 'success' && (
          <>
            <div className="ve-card__icon ve-card__icon--success">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="ve-card__title">Xác Thực Thành Công!</h2>
            <p className="ve-card__desc">{message}</p>
            <Link to="/contestant" className="ve-card__btn" id="btn-go-dashboard">
              Tiếp tục →
            </Link>
          </>
        )}

        {/* PHASE: ERROR - Display error message */}
        {phase === 'error' && (
          <>
            <div className="ve-card__icon ve-card__icon--error">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="ve-card__title">Xác Thực Thất Bại</h2>
            <p className="ve-card__desc">{message}</p>
            <button
              className="ve-card__btn ve-card__btn--outline"
              onClick={() => {
                setPhase('send');
                setStatus('idle');
                setMessage('');
              }}
              id="btn-retry"
            >
              Thử lại
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
