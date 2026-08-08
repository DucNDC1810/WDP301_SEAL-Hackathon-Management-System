import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import './LoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Không thể đặt lại mật khẩu.');
        return;
      }
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch {
      setError('Không thể kết nối đến server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" id="reset-password-page">
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
        <div className="login-card" id="reset-password-card">
          <div className="login-card__brand">
            <div className="login-card__brand-logo">
              <span className="login-card__logo-icon">⬡</span>
              <span className="login-card__logo-text">SEAL</span>
            </div>
            <h2 className="login-card__brand-title">Đặt Lại<br />Mật Khẩu</h2>
            <p className="login-card__brand-desc">
              Chọn mật khẩu mới cho tài khoản của bạn để đăng nhập vào hệ thống.
            </p>
            <div className="login-card__brand-decor" />
          </div>

          <div className="login-card__form-panel">
            <div className="login-card__header">
              <h1 className="login-card__title">Đặt Lại Mật Khẩu</h1>
              <p className="login-card__subtitle">
                {done ? 'Mật khẩu đã được cập nhật' : 'Nhập mật khẩu mới cho tài khoản của bạn'}
              </p>
            </div>

            {!token && (
              <div className="login-card__error" id="reset-error-no-token">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Liên kết không hợp lệ — thiếu token. Vui lòng dùng đúng liên kết trong email.
              </div>
            )}

            {error && (
              <div className="login-card__error" id="reset-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {done ? (
              <div className="login-card__info" id="reset-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Đặt lại mật khẩu thành công! Đang chuyển tới trang đăng nhập...
              </div>
            ) : (
              <form className="login-card__form" onSubmit={handleSubmit} id="reset-password-form">
                <div className="login-card__field">
                  <label htmlFor="password" className="login-card__label">
                    Mật khẩu mới
                  </label>
                  <div className="login-card__input-wrap">
                    <svg className="login-card__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      className="login-card__input"
                      placeholder="Ít nhất 6 ký tự"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      disabled={!token}
                    />
                    <button
                      type="button"
                      className="login-card__toggle-pw"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="login-card__field">
                  <label htmlFor="confirmPassword" className="login-card__label">
                    Nhập lại mật khẩu mới
                  </label>
                  <div className="login-card__input-wrap">
                    <svg className="login-card__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      className="login-card__input"
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      disabled={!token}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`login-card__submit ${loading ? 'login-card__submit--loading' : ''}`}
                  disabled={loading || !token}
                  id="btn-reset-submit"
                >
                  {loading ? <span className="login-card__spinner" /> : 'Đặt Lại Mật Khẩu'}
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

export default ResetPasswordPage;
