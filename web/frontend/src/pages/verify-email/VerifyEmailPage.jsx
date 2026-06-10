import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status,  setStatus]  = useState(() => (token ? 'loading' : 'error'));
  const [message, setMessage] = useState(() => token ? '' : 'Link xác thực không hợp lệ hoặc đã hết hạn.');

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) { setStatus('success'); setMessage(data.message || 'Tài khoản của bạn đã được kích hoạt thành công!'); }
        else { setStatus('error'); setMessage(data.message || 'Link xác thực không hợp lệ hoặc đã hết hạn.'); }
      })
      .catch(() => { setStatus('error'); setMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'); });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#060b16] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0b1120] border border-white/8 rounded-2xl p-8 text-center shadow-2xl">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center font-extrabold text-black text-lg">S</div>
          <span className="font-bold text-white text-[1.1rem] tracking-wide">SEAL Hackathon</span>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#00d4ff] animate-spin" />
            <p className="font-bold text-white text-lg">Đang xác thực email...</p>
            <p className="text-white/50 text-sm">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.15)] border-2 border-[#10b981] flex items-center justify-center">
              <svg className="text-[#10b981]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-bold text-white text-lg">Email đã xác thực!</p>
            <p className="text-white/50 text-sm">{message}</p>
            <div className="flex flex-col gap-2.5 w-full mt-2">
              <button className="py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-black border-none cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => navigate('/login')}>Đăng nhập ngay</button>
              <button className="py-2.5 rounded-xl text-sm font-bold border border-white/15 text-white/60 bg-transparent cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => navigate('/')}>Trang chủ</button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[rgba(239,68,68,0.1)] border-2 border-[#ef4444] flex items-center justify-center">
              <svg className="text-[#ef4444]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <p className="font-bold text-white text-lg">Xác thực thất bại</p>
            <p className="text-white/50 text-sm">{message}</p>
            <div className="flex flex-col gap-2.5 w-full mt-2">
              <button className="py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-black border-none cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => navigate('/login')}>Về trang đăng nhập</button>
              <button className="py-2.5 rounded-xl text-sm font-bold border border-white/15 text-white/60 bg-transparent cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => navigate('/')}>Trang chủ</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
