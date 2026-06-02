import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const OAUTH_ERRORS = {
  google_failed: 'Đăng nhập Google thất bại, vui lòng thử lại.',
  github_failed: 'Đăng nhập GitHub thất bại, vui lòng thử lại.',
};

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorKey = searchParams.get('error');
    if (errorKey && OAUTH_ERRORS[errorKey]) {
      setError(OAUTH_ERRORS[errorKey]);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
        return;
      }

      // save token & user via AuthContext
      login(data.data);

      const isAdmin = data.data.roles?.some((r) => r.role_name === 'admin');
      navigate(isAdmin ? '/admin/dashboard' : '/');
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

      {/* Login Card */}
      <div className="login-page__content">
        <div className="login-card" id="login-card">
          {/* Logo */}
          <div className="login-card__header">
            <Link to="/" className="login-card__logo">
              <span className="login-card__logo-icon">⬡</span>
              <span className="login-card__logo-text">SEAL</span>
            </Link>
            <h1 className="login-card__title">Đăng Nhập</h1>
            <p className="login-card__subtitle">
              Chào mừng bạn quay trở lại hệ thống
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="login-card__error" id="login-error">
              <span className="login-card__error-icon">⚠</span>
              {error}
            </div>
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
              <label htmlFor="password" className="login-card__label">
                Mật khẩu
              </label>
              <div className="login-card__input-wrap">
                <svg className="login-card__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="login-card__input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`login-card__submit ${loading ? 'login-card__submit--loading' : ''}`}
              disabled={loading}
              id="btn-login-submit"
            >
              {loading ? (
                <span className="login-card__spinner" />
              ) : (
                'Đăng Nhập'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="login-card__divider">
            <span>hoặc</span>
          </div>

          {/* Social Buttons */}
          <div className="login-card__socials">
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
            <a
              href={`${API_URL}/api/auth/github`}
              className="login-card__social"
              id="btn-github-login"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
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
  );
}

export default LoginPage;
