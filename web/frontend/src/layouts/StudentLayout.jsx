import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
const UPLOAD = ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'];
const ZAP    = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';
const CL     = 'M15 18l-6-6 6-6';
const CR     = 'M9 18l6-6-6-6';
const LOGOUT = ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'];
const SUN    = 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z';
const MOON   = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';

const NAV = [
  { key: 'dashboard',         label: 'Tổng quan', path: '/dashboard',         d: GRID },
  { key: 'dashboard/team',    label: 'Đội thi',   path: '/dashboard/team',    d: TEAM },
  { key: 'dashboard/connect',  label: 'Kết nối',        path: '/dashboard/connect',  d: MSG    },
  { key: 'dashboard/submit',   label: 'Nộp bài',        path: '/dashboard/submit',   d: UPLOAD },
  { key: 'dashboard/profile',  label: 'Hồ sơ',          path: '/dashboard/profile',  d: USER   },
];

export const StudentLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
          <button className="sl-logout" onClick={handleLogout} title="Đăng xuất" style={{ color: '#ef4444' }}>
            <Ico d={LOGOUT} size={16} sw={1.8} />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="sl-content" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <header style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', borderBottom: '1px solid var(--sl-border)', background: 'var(--sl-bg)', flexShrink: 0, gap: 16 }}>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển Light Mode' : 'Chuyển Dark Mode'}
            style={{ background: 'transparent', border: 'none', color: 'var(--sl-text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ico d={theme === 'dark' ? SUN : MOON} size={20} />
          </button>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sl-accent-bg), rgba(124, 58, 237, 0.2))', border: '1.5px solid var(--sl-accent-border)', color: 'var(--sl-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                {(user.full_name?.[0] || 'U').toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sl-text)' }}>{user.full_name}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--sl-accent)', background: 'var(--sl-accent-bg)', padding: '1px 6px', borderRadius: 10, width: 'fit-content', border: '1px solid var(--sl-accent-border)' }}>👥 Thí sinh</span>
              </div>
            </div>
          )}
        </header>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};
