import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const API = import.meta.env.VITE_API_URL || '';

export default function InvitationVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status,   setStatus]   = useState(() => (token ? 'loading' : 'error'));
  const [msg,      setMsg]      = useState(() => token ? '' : 'Link xác thực không hợp lệ hoặc đã hết hạn.');
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/teams/verify?token=${token}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setTeamName(data.data?.teamName || data.data?.team_name || data.data?.name || '');
          setMsg(data.message || 'Email của bạn đã được xác nhận. Chào mừng đến với đội thi!');
        } else {
          setStatus('error');
          setMsg(data.message || 'Link xác nhận không hợp lệ hoặc đã hết hạn (24 giờ).');
        }
      })
      .catch(() => {
        setStatus('error');
        setMsg('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e17] px-4">
      <div className="w-full max-w-[440px] bg-[rgba(17,24,39,0.8)] backdrop-blur-xl border border-[rgba(0,240,255,0.15)] rounded-2xl p-8 text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#a855f7] flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <span className="text-[#f1f5f9] font-semibold text-lg">SEAL Hackathon</span>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Spin size="large" />
            <p className="text-[#f1f5f9] text-lg font-semibold">Đang xác nhận lời mời...</p>
            <p className="text-[#94a3b8] text-sm">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
              <CheckCircleOutlined className="text-4xl text-green-400" />
            </div>
            <p className="text-[#f1f5f9] text-xl font-bold">Tham gia đội thành công!</p>
            {teamName && (
              <p className="text-[#94a3b8] text-sm">
                Đội thi: <strong className="text-[#00f0ff]">{teamName}</strong>
              </p>
            )}
            <p className="text-[#94a3b8] text-sm">{msg}</p>
            <div className="flex gap-3 mt-2">
              <Button type="primary" onClick={() => navigate('/dashboard')}>Đến Dashboard</Button>
              <Button onClick={() => navigate('/')}>Trang chủ</Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
              <CloseCircleOutlined className="text-4xl text-red-400" />
            </div>
            <p className="text-[#f1f5f9] text-xl font-bold">Xác nhận thất bại</p>
            <p className="text-[#94a3b8] text-sm">{msg}</p>
            <div className="flex gap-3 mt-2">
              <Button type="primary" onClick={() => navigate('/login')}>Đăng nhập</Button>
              <Button onClick={() => navigate('/')}>Trang chủ</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
