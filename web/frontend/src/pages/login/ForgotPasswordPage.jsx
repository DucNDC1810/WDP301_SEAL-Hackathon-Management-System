import { useState } from 'react';
import { Link } from 'react-router-dom';
import './LoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không thể gửi yêu cầu.');
        return;
      }
      setDone(true);
    } catch {
      setError('Không thể kết nối đến server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" id="forgot-password-page">
      <div className="login-page__video-wrap">
        <iframe
          src="https://player.mux.com/7LTJwDIxZwhdkJCZRdZJuXQamj00eCUP6ZvuihJ4d004w?autoplay=muted&loop=true&background=true"
          className="login-page__video"
          allow="autoplay; fullscreen"
          title="SEAL Background"
        />
        <div className="login-page__video-overlay" />
      </div>

      <Link to="/" className="login-page__back-btn" id="btn-back-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Trang chủ</span>
      </Link>

      <div className="login-page__content">
        <div className="login-card" id="forgot-password-card">
          <div className="login-card__brand">
            <div className="login-card__brand-logo">
              <span className="login-card__logo-icon">⬡</span>
              <span className="login-card__logo-text">SEAL</span>
            </div>
            <h2 className="login-card__brand-title">Quên<br />Mật Khẩu</h2>
            <p className="login-card__brand-desc">
              Nhập email đã đăng ký, chúng tôi sẽ gửi cho bạn liên kết để đặt lại mật khẩu.
            </p>
            <div className="login-card__brand-decor" />
          </div>

          <div className="login-card__form-panel">
            <div className="login-card__header">
              <h1 className="login-card__title">Quên Mật Khẩu</h1>
              <p className="login-card__subtitle">
                {done ? 'Kiểm tra hộp thư của bạn' : 'Nhập email để nhận liên kết đặt lại mật khẩu'}
              </p>
            </div>

            {error && (
              <div className="login-card__error" id="forgot-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {done ? (
              <div className="login-card__info" id="forgot-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Nếu email này tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả mục Spam).
              </div>
            ) : (
              <form className="login-card__form" onSubmit={handleSubmit} id="forgot-password-form">
                <div className="login-card__field">
                  <label htmlFor="email" className="login-card__label">
                    Email
                  </label>
                  <div className="login-card__input-wrap">
                    <svg className="login-card__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="login-card__input"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`login-card__submit ${loading ? 'login-card__submit--loading' : ''}`}
                  disabled={loading}
                  id="btn-forgot-submit"
                >
                  {loading ? <span className="login-card__spinner" /> : 'Gửi Liên Kết Đặt Lại'}
                </button>
              </form>
            )}

            <p className="login-card__footer">
              Nhớ mật khẩu rồi?{' '}
              <Link to="/login" className="login-card__link" id="link-back-login">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
