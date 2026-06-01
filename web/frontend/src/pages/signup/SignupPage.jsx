import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignupPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!formData.full_name || !formData.email || !formData.password) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      // Redirect to login with success message
      navigate('/login?registered=true');
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page" id="signup-page">
      {/* Video Background */}
      <div className="signup-page__video-wrap">
        <iframe
          src="https://player.mux.com/7LTJwDIxZwhdkJCZRdZJuXQamj00eCUP6ZvuihJ4d004w?autoplay=muted&loop=true&background=true"
          className="signup-page__video"
          allow="autoplay; fullscreen"
          title="SEAL Background"
        />
        <div className="signup-page__video-overlay" />
      </div>

      {/* Floating Particles */}
      <div className="signup-page__particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="signup-page__particle"
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

      {/* Signup Card */}
      <div className="signup-page__content">
        <div className="signup-card" id="signup-card">
          {/* Logo */}
          <div className="signup-card__header">
            <Link to="/" className="signup-card__logo">
              <span className="signup-card__logo-icon">⬡</span>
              <span className="signup-card__logo-text">SEAL</span>
            </Link>
            <h1 className="signup-card__title">Tạo Tài Khoản</h1>
            <p className="signup-card__subtitle">
              Đăng ký để tham gia các cuộc thi hackathon
            </p>
            <div className="signup-card__role-badge">
              <span className="signup-card__role-badge-dot" />
              Contestant
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="signup-card__error" id="signup-error">
              <span className="signup-card__error-icon">⚠</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form className="signup-card__form" onSubmit={handleSubmit} id="signup-form">
            {/* Full Name */}
            <div className="signup-card__field">
              <label htmlFor="full_name" className="signup-card__label">
                Họ và tên <span className="signup-card__required">*</span>
              </label>
              <div className="signup-card__input-wrap">
                <svg className="signup-card__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  className="signup-card__input"
                  placeholder="Nguyễn Văn A"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="signup-card__field">
              <label htmlFor="email" className="signup-card__label">
                Email <span className="signup-card__required">*</span>
              </label>
              <div className="signup-card__input-wrap">
                <svg className="signup-card__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="signup-card__input"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="signup-card__field">
              <label htmlFor="phone" className="signup-card__label">
                Số điện thoại
              </label>
              <div className="signup-card__input-wrap">
                <svg className="signup-card__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="signup-card__input"
                  placeholder="0912 345 678"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password Row */}
            <div className="signup-card__row">
              <div className="signup-card__field">
                <label htmlFor="password" className="signup-card__label">
                  Mật khẩu <span className="signup-card__required">*</span>
                </label>
                <div className="signup-card__input-wrap">
                  <svg className="signup-card__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="signup-card__input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="signup-card__field">
                <label htmlFor="confirmPassword" className="signup-card__label">
                  Xác nhận <span className="signup-card__required">*</span>
                </label>
                <div className="signup-card__input-wrap">
                  <svg className="signup-card__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    className="signup-card__input"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className={`signup-card__submit ${loading ? 'signup-card__submit--loading' : ''}`}
              disabled={loading}
              id="btn-signup-submit"
            >
              {loading ? (
                <span className="signup-card__spinner" />
              ) : (
                'Đăng Ký'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="signup-card__divider">
            <span>hoặc</span>
          </div>

          {/* Social Buttons */}
          <div className="signup-card__socials">
            <a
              href={`${API_URL}/api/auth/google`}
              className="signup-card__social"
              id="btn-google-signup"
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
              className="signup-card__social"
              id="btn-github-signup"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>

          {/* Footer */}
          <p className="signup-card__footer">
            Đã có tài khoản?{' '}
            <Link to="/login" className="signup-card__link" id="link-login">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
