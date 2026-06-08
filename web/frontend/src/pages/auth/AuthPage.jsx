import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Tabs, Form, Input, Button, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import './AuthPage.css';

const API = import.meta.env.VITE_API_URL || '';

const OAUTH_ERRORS = {
  google_failed: 'Đăng nhập Google thất bại, vui lòng thử lại.',
  github_failed: 'Đăng nhập GitHub thất bại, vui lòng thử lại.',
};

function LoginForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      if (!data.data) throw new Error('Phản hồi từ server không hợp lệ');
      onSuccess(data.data);
    } catch (err) {
      message.error(err.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
        <Input placeholder="your@email.com" autoComplete="email" />
      </Form.Item>
      <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
        <Input.Password placeholder="••••••••" autoComplete="current-password" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Đăng nhập
        </Button>
      </Form.Item>
    </Form>
  );
}

function RegisterForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: values.full_name,
          email: values.email,
          password: values.password,
          phone: values.phone,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const signinRes = await fetch(`${API}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const signinData = await signinRes.json();
      if (!signinData.success) throw new Error(signinData.message);
      onSuccess(signinData.data);
    } catch (err) {
      message.error(err.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
      <Form.Item name="full_name" label="Tên hiển thị" rules={[{ required: true }]}>
        <Input placeholder="Nguyễn Văn A" />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
        <Input placeholder="your@email.com" autoComplete="email" />
      </Form.Item>
      <Form.Item name="phone" label="Số điện thoại">
        <Input placeholder="0912345678" />
      </Form.Item>
      <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}>
        <Input.Password placeholder="Tối thiểu 6 ký tự" />
      </Form.Item>
      <Form.Item
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        dependencies={['password']}
        rules={[
          { required: true },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) return Promise.resolve();
              return Promise.reject(new Error('Mật khẩu không khớp'));
            },
          }),
        ]}
      >
        <Input.Password placeholder="Nhập lại mật khẩu" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Đăng ký
        </Button>
      </Form.Item>
    </Form>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!user) return;
    if (isAdmin) navigate('/admin/dashboard', { replace: true });
    else if (user?.roles?.some(r => r.role_name === 'mentor')) navigate('/mentor/dashboard', { replace: true });
    else navigate('/dashboard', { replace: true });
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    const errorKey = searchParams.get('error');
    if (errorKey && OAUTH_ERRORS[errorKey]) message.error(OAUTH_ERRORS[errorKey]);
  }, [searchParams]);

  const handleSuccess = async (userData) => {
    await login(userData);
    const admin = userData.roles?.some((r) => r.role_name === 'admin');
    const mentor = userData.roles?.some((r) => r.role_name === 'mentor');
    if (admin) navigate('/admin/dashboard', { replace: true });
    else if (mentor) navigate('/mentor/dashboard', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  const particles = Array.from({ length: 20 }).map((_, i) => ({
    x: `${(i * 17 + 5) % 100}%`,
    y: `${(i * 23 + 10) % 100}%`,
    delay: `${(i * 0.3) % 6}s`,
    duration: `${3 + (i % 4)}s`,
    size: `${2 + (i % 3)}px`,
  }));

  return (
    <div className="auth-page">
      <div className="auth-page__video-wrap">
        <iframe
          src="https://player.mux.com/7LTJwDIxZwhdkJCZRdZJuXQamj00eCUP6ZvuihJ4d004w?autoplay=muted&loop=true&background=true"
          className="auth-page__video"
          allow="autoplay; fullscreen"
          title="SEAL Background"
        />
        <div className="auth-page__video-overlay" />
      </div>

      <div className="auth-page__particles">
        {particles.map((p, i) => (
          <span
            key={i}
            className="auth-page__particle"
            style={{ '--x': p.x, '--y': p.y, '--delay': p.delay, '--duration': p.duration, '--size': p.size }}
          />
        ))}
      </div>

      <div className="auth-page__content">
        <div className="auth-card">
          <div className="auth-card__header">
            <Link to="/" className="auth-card__logo">
              <span className="auth-card__logo-icon">⬡</span>
              <span className="auth-card__logo-text">SEAL</span>
            </Link>
          </div>

          <Tabs
            centered
            items={[
              {
                key: 'login',
                label: 'Đăng nhập',
                children: (
                  <>
                    <LoginForm onSuccess={handleSuccess} />
                    <div className="auth-card__socials">
                      <a href={`${API}/api/auth/google`} className="auth-card__social">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </a>
                    </div>
                  </>
                ),
              },
              {
                key: 'register',
                label: 'Đăng ký',
                children: <RegisterForm onSuccess={handleSuccess} />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
