import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function OAuthCallback() {
  const navigate = useNavigate();
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

    // Save token, fetch user info, then redirect
    localStorage.setItem('accessToken', token);

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem('user', JSON.stringify(data.data));

          const roles = data.data.roles?.map((r) => r.role_name) || [];
          if (roles.includes('admin')) {
            navigate('/admin');
          } else if (roles.includes('contestant')) {
            navigate('/contestant');
          } else {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      } catch {
        navigate('/');
      }
    };

    fetchUser();
  }, [navigate, searchParams]);

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
