import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const GRID   = ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'];
const TEAM   = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'];
const MSG    = ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'];
const USER   = ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'];
const UPLOAD = ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'];
const ZAP    = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';
const CL     = 'M15 18l-6-6 6-6';
const CR     = 'M9 18l6-6-6-6';
const LOGOUT = ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'];

const NAV = [
  { key: 'dashboard',         label: 'Tổng quan', path: '/dashboard',         d: GRID },
  { key: 'dashboard/team',    label: 'Đội thi',   path: '/dashboard/team',    d: TEAM },
  { key: 'dashboard/connect',  label: 'Kết nối',  path: '/dashboard/connect',  d: MSG    },
  { key: 'dashboard/submit',   label: 'Nộp bài',  path: '/dashboard/submit',   d: UPLOAD },
  { key: 'dashboard/profile',  label: 'Hồ sơ',    path: '/dashboard/profile',  d: USER   },
];

export const StudentLayout = () => {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/signout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    logout();
    navigate('/login');
  };

  const activeKey = [...NAV].reverse().find((n) => location.pathname.startsWith(n.path))?.key ?? 'dashboard';

  return (
    <div className="flex min-h-screen bg-[#060b16] text-[#c9d6e8]">
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 sticky top-0 h-screen z-10 overflow-visible transition-all duration-[220ms]"
        style={{
          width: collapsed ? 60 : 210,
          background: '#0b1120',
          borderRight: '1px solid #162036',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center min-h-[56px] px-3 py-[14px]"
          style={{ borderBottom: '1px solid #162036' }}
        >
          <div className="flex items-center gap-[9px] overflow-hidden">
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-lg"
              style={{
                width: 34, height: 34,
                background: '#00d4ff14',
                border: '1px solid #00d4ff30',
                color: '#00d4ff',
              }}
            >
              <Ico d={ZAP} size={18} sw={2} />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-[#00d4ff] font-extrabold text-base tracking-[1.5px] whitespace-nowrap">SEAL</span>
                <span className="text-[#3a5068] text-[0.58rem] uppercase tracking-[1px] whitespace-nowrap">Hackathon</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggle button */}
        <button
          className="absolute top-[18px] right-[-11px] z-20 flex items-center justify-center rounded-full cursor-pointer transition-all duration-150"
          style={{
            width: 22, height: 22,
            border: '1px solid #1e3050',
            background: '#0f1827',
            color: '#3a5068',
          }}
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          onMouseEnter={e => { e.currentTarget.style.color = '#00d4ff'; e.currentTarget.style.borderColor = '#00d4ff30'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#3a5068'; e.currentTarget.style.borderColor = '#1e3050'; }}
        >
          <Ico d={collapsed ? CR : CL} size={13} sw={2.5} />
        </button>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-[2px] px-[7px] py-[10px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(({ key, label, path, d }) => {
            const isActive = activeKey === key;
            return (
              <button
                key={key}
                className="flex items-center gap-[10px] px-[11px] py-[9px] rounded-[7px] text-left w-full whitespace-nowrap cursor-pointer font-medium text-[0.83rem] transition-all duration-150"
                style={{
                  border: isActive ? '1px solid #00d4ff18' : '1px solid transparent',
                  background: isActive ? 'linear-gradient(90deg,#00d4ff18,transparent)' : 'transparent',
                  color: isActive ? '#00d4ff' : '#4a6080',
                  fontFamily: 'inherit',
                }}
                onClick={() => navigate(path)}
                title={collapsed ? label : undefined}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#121e30'; e.currentTarget.style.color = '#90aac8'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a6080'; } }}
              >
                <span className="w-4 flex items-center justify-center flex-shrink-0">
                  <Ico d={d} size={16} />
                </span>
                {!collapsed && <span className="overflow-hidden text-ellipsis">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex flex-col gap-[6px] px-[7px] py-[10px]" style={{ borderTop: '1px solid #162036' }}>
          {!collapsed && user && (
            <div
              className="flex items-center gap-[9px] px-[10px] py-2 rounded-[7px] overflow-hidden"
              style={{ background: '#0f1827', border: '1px solid #162036' }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 rounded-full text-white font-bold text-[0.8rem]"
                style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#00d4ff,#7c3aed)' }}
              >
                {(user.full_name?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[#c9d6e8] text-[0.76rem] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                  {user.full_name}
                </span>
                <span className="text-[#00d4ff] text-[0.62rem] uppercase tracking-[.5px]">Thí sinh</span>
              </div>
            </div>
          )}
          <button
            className="flex items-center gap-2 px-[11px] py-2 rounded-[7px] w-full text-[0.8rem] text-[#3a5068] cursor-pointer transition-all duration-150"
            style={{ border: 'none', background: 'transparent', fontFamily: 'inherit' }}
            onClick={handleLogout}
            title="Đăng xuất"
            onMouseEnter={e => { e.currentTarget.style.background = '#1a1020'; e.currentTarget.style.color = '#ff6b6b'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3a5068'; }}
          >
            <Ico d={LOGOUT} size={16} sw={1.8} />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-[#060b16]">
        <Outlet />
      </div>
    </div>
  );
};
