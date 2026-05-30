import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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

    if (token) {
      localStorage.setItem('accessToken', token);
      navigate('/');
    } else {
      navigate('/login');
    }
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
