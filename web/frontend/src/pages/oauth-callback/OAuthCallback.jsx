import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

function OAuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate(`/login?error=${error}`);
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user info to get roles for redirect
    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const userData = { ...data.data, accessToken: token };
          login(userData);
          const isAdmin = data.data.roles?.some((r) => r.role_name === 'admin');
          navigate(isAdmin ? '/admin/dashboard' : '/');
        } else {
          localStorage.setItem('accessToken', token);
          navigate('/');
        }
      })
      .catch(() => {
        localStorage.setItem('accessToken', token);
        navigate('/');
      });
  }, [navigate, searchParams, login]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#0a0a0f',
      color: '#00d4ff',
      fontFamily: 'Inter, sans-serif',
      fontSize: '1rem',
    }}>
      Đang xử lý đăng nhập...
    </div>
  );
}

export default OAuthCallback;
