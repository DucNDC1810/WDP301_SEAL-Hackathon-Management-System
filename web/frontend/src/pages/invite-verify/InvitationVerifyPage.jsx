import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function InvitationVerifyPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); return; }

    fetch(`${API}/api/teams/verify?token=${token}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.message?.includes('hạn') && !data.message?.includes('không')) {
          const name = data.team_name || data.data?.team_name || '';
          setTeamName(name);
          setStatus('success');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 120 }}>
        <Spin size="large" tip="Đang xác nhận..." />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <Result
        status="success"
        title="Xác nhận thành công!"
        subTitle={teamName ? `Bạn đã gia nhập đội "${teamName}"` : 'Bạn đã xác nhận tham gia đội thi.'}
        extra={<Button type="primary"><Link to="/dashboard">Về trang chủ</Link></Button>}
        style={{ marginTop: 80 }}
      />
    );
  }

  return (
    <Result
      status="error"
      title="Xác nhận thất bại"
      subTitle="Link xác nhận không hợp lệ hoặc đã hết hạn (24 giờ)."
      extra={<Button><Link to="/login">Đăng nhập</Link></Button>}
      style={{ marginTop: 80 }}
    />
  );
}
