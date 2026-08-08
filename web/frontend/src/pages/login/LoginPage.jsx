import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const OAUTH_ERRORS = {
  google_failed: 'Đăng nhập Google thất bại, vui lòng thử lại.',
  github_failed: 'Đăng nhập GitHub thất bại, vui lòng thử lại.',
};

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: localStorage.getItem('rememberedEmail') || '',
    password: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberedEmail'));
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const errorKey = searchParams.get('error');
    if (errorKey && OAUTH_ERRORS[errorKey]) {
      setError(OAUTH_ERRORS[errorKey]);
    }
    if (searchParams.get('registered') === 'true') {
      setInfo('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản, sau đó đăng nhập.');
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
    if (info) setInfo('');
    if (needsVerification) setNeedsVerification(false);
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('Vui lòng nhập email để gửi lại xác nhận');
      return;
    }
    setResending(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (data.success) {
        setNeedsVerification(false);
        setError('');
        setInfo('Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư.');
      } else {
        setError(data.message);
      }
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        if (res.status === 403) setNeedsVerification(true);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setInfo('');
      login(data.data);

      const isAdmin = data.data.roles?.some((r) => r.role_name === 'admin');
      const isMentor = data.data.roles?.some((r) => r.role_name === 'mentor');
      if (isAdmin) navigate('/admin/dashboard');
      else if (isMentor) navigate('/mentor/dashboard');
      else navigate('/dashboard');
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" id="login-page">
      {/* Video Background */}
      <div className="login-page__video-wrap">
        <iframe
          src="https://player.mux.com/7LTJwDIxZwhdkJCZRdZJuXQamj00eCUP6ZvuihJ4d004w?autoplay=muted&loop=true&background=true"
          className="login-page__video"
          allow="autoplay; fullscreen"
          title="SEAL Background"
        />
        <div className="login-page__video-overlay" />
      </div>

      {/* Floating Particles */}
      <div className="login-page__particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="login-page__particle"
            style={{
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`,
              '--delay': `${Math.random() * 6}s`,
              '--duration': `${3 + Math.random() * 4}s`,
              '--size': `${2 + Math.random() * 3}px`,
            }}
          />
        ))}
      </div>

      {/* Back to Homepage Button */}
      <Link to="/" className="login-page__back-btn" id="btn-back-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Trang chủ</span>
      </Link>

      {/* Login Card */}
      <div className="login-page__content">
        <div className="login-card" id="login-card">

          {/* Left Panel - Branding */}
          <div className="login-card__brand">
            <div className="login-card__brand-logo">
              <span className="login-card__logo-icon">⬡</span>
              <span className="login-card__logo-text">SEAL</span>
            </div>
            <h2 className="login-card__brand-title">Hackathon<br />Management</h2>
            <p className="login-card__brand-desc">
              Nền tảng quản lý hackathon chuyên nghiệp — kết nối đội thi, mentor và ban tổ chức.
            </p>
            <div className="login-card__brand-stats">
              <div className="login-card__stat">
                <span className="login-card__stat-num">1200+</span>
                <span className="login-card__stat-label">Developers</span>
              </div>
              <div className="login-card__stat">
                <span className="login-card__stat-num">50+</span>
                <span className="login-card__stat-label">Hackathons</span>
              </div>
              <div className="login-card__stat">
                <span className="login-card__stat-num">500M₫</span>
                <span className="login-card__stat-label">Prizes</span>
              </div>
            </div>
            <div className="login-card__brand-decor" />
          </div>

          {/* Right Panel - Form */}
          <div className="login-card__form-panel">
            {/* Header */}
            <div className="login-card__header">
              <h1 className="login-card__title">Đăng Nhập</h1>
              <p className="login-card__subtitle">Chào mừng bạn quay trở lại</p>
            </div>

            {/* Info */}
            {info && (
              <div className="login-card__info" id="login-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                {info}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="login-card__error" id="login-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {needsVerification && (
              <button
                type="button"
                className="login-card__resend-btn"
                id="btn-resend-verification"
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
              </button>
            )}

            {/* Form */}
            <form className="login-card__form" onSubmit={handleSubmit} id="login-form">
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
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-card__field">
                <div className="login-card__label-row">
                  <label htmlFor="password" className="login-card__label">
                    Mật khẩu
                  </label>
                  <Link to="/forgot-password" className="login-card__forgot-link" id="link-forgot-password">
                    Quên mật khẩu?
                  </Link>
                </div>
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
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
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

              <label className="login-card__remember" htmlFor="remember-me">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <button
                type="submit"
                className={`login-card__submit ${loading ? 'login-card__submit--loading' : ''}`}
                disabled={loading}
                id="btn-login-submit"
              >
                {loading ? (
                  <span className="login-card__spinner" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    Đăng Nhập
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="login-card__divider">
              <span>hoặc tiếp tục với</span>
            </div>

            {/* Social Buttons */}
            <div className="login-card__socials login-card__socials--single">
              <a
                href={`${API_URL}/api/auth/google`}
                className="login-card__social"
                id="btn-google-login"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </a>
            </div>

            {/* Footer */}
            <p className="login-card__footer">
              Chưa có tài khoản?{' '}
              <Link to="/signup" className="login-card__link" id="link-signup">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
