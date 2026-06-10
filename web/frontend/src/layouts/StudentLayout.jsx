import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './StudentLayout.css';

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
const ZAP    = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';
const CL     = 'M15 18l-6-6 6-6';
const CR     = 'M9 18l6-6-6-6';
const LOGOUT = ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'];

const NAV = [
  { key: 'dashboard',         label: 'Tổng quan', path: '/dashboard',         d: GRID },
  { key: 'dashboard/team',    label: 'Đội thi',   path: '/dashboard/team',    d: TEAM },
  { key: 'dashboard/connect', label: 'Kết nối',   path: '/dashboard/connect', d: MSG  },
  { key: 'dashboard/profile', label: 'Hồ sơ',     path: '/dashboard/profile', d: USER },
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
    <div className="sl-root">
      {/* ── Sidebar ── */}
      <aside className={`sl-sidebar${collapsed ? ' sl-sm' : ''}`}>
        <div className="sl-logo-row">
          <div className="sl-logo">
            <div className="sl-logo-icon">
              <Ico d={ZAP} size={18} sw={2} />
            </div>
            {!collapsed && (
              <div className="sl-logo-txt">
                <span className="sl-logo-name">SEAL</span>
                <span className="sl-logo-sub">Hackathon</span>
              </div>
            )}
          </div>
        </div>

        <button className="sl-toggle" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
          <Ico d={collapsed ? CR : CL} size={13} sw={2.5} />
        </button>

        <nav className="sl-nav">
          {NAV.map(({ key, label, path, d }) => (
            <button
              key={key}
              className={`sl-nav-item${activeKey === key ? ' active' : ''}`}
              onClick={() => navigate(path)}
              title={collapsed ? label : undefined}
            >
              <span className="sl-nav-icon"><Ico d={d} size={16} /></span>
              {!collapsed && <span className="sl-nav-label">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="sl-sidebar-foot">
          {!collapsed && user && (
            <div className="sl-user">
              <div className="sl-user-av">{(user.full_name?.[0] || 'U').toUpperCase()}</div>
              <div className="sl-user-info">
                <span className="sl-user-name">{user.full_name}</span>
                <span className="sl-user-role">Thí sinh</span>
              </div>
            </div>
          )}
          <button className="sl-logout" onClick={handleLogout} title="Đăng xuất">
            <Ico d={LOGOUT} size={16} sw={1.8} />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="sl-content">
        <Outlet />
      </div>
    </div>
  );
};
