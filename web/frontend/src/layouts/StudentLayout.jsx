import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from '../components/NotificationBell';
import './StudentLayout.css';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── SVG icon helper ──────────────────────────────────────────────────────────
const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
  >
    {(Array.isArray(d) ? d : [d]).map((p, i) => (
      <path key={i} d={p} />
    ))}
  </svg>
);

// ── Icon paths ───────────────────────────────────────────────────────────────
const HOUSE  = ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'];
const TEAM   = [
  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
  'M9 7a4 4 0 0 0 0 8',
  'M23 21v-2a4 4 0 0 0-3-3.87',
  'M16 3.13a4 4 0 0 1 0 7.75',
];
const UPLOAD = ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'];
const USER   = ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 0 0 0 8'];
const MAIL   = ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'];
const CHAT   = ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'];
const BELL   = ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'];
const LOGOUT = ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'];
const SUN    = 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z';
const MOON   = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';


// ── Navigation groups ────────────────────────────────────────────────────────
const GROUP1 = [
  { key: 'overview', label: 'Tổng quan', path: '/dashboard',         d: HOUSE,  exact: true },
  { key: 'team',     label: 'Đội thi',   path: '/dashboard/team',    d: TEAM  },
  { key: 'submit',   label: 'Nộp bài',   path: '/dashboard/submit',  d: UPLOAD, badge: { type: 'amber', text: '7d' } },
  { key: 'profile',  label: 'Hồ sơ',     path: '/dashboard/profile', d: USER  },
];

const GROUP2 = [
  { key: 'chat', label: 'Trò chuyện', path: '/dashboard/chat', d: CHAT, badge: { type: 'green', count: 0 } },
];

// ── Format clock ─────────────────────────────────────────────────────────────
const formatClock = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// ── Sidebar nav item ─────────────────────────────────────────────────────────
const NavItem = ({ item, active, onClick }) => (
  <button
    className={`sl-nav-item${active ? ' active' : ''}`}
    onClick={onClick}
  >
    {active && <span className="sl-nav-active-bg" />}
    {active && <span className="sl-nav-accent-bar" />}
    <span className="sl-nav-icon">
      <Ico d={item.d} size={18} sw={1.8} />
    </span>
    <span className="sl-nav-label">{item.label}</span>
    {item.badge && item.badge.type === 'amber' && (
      <span className="sl-badge sl-badge-amber">{item.badge.text}</span>
    )}
    {item.badge && (item.badge.type === 'cyan' || item.badge.type === 'green') && item.badge.count > 0 && (
      <span className={`sl-badge sl-badge-${item.badge.type}`}>{item.badge.count}</span>
    )}
  </button>
);

// ── Main layout ──────────────────────────────────────────────────────────────
export const StudentLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());

  // Live 1-second clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch(`${API_URL}/api/auth/signout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Active detection
  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const userInitial = (user?.full_name?.[0] || 'U').toUpperCase();

  return (
    <div className="sl-root">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="sl-sidebar">
        {/* Logo */}
        <div className="sl-logo-area">
          <div className="sl-logo-icon-wrap">
            <span style={{ fontSize: 20, lineHeight: 1 }}>⬡</span>
          </div>
          <div className="sl-logo-txt">
            <span className="sl-logo-name">SEAL</span>
            <span className="sl-logo-sub">Hackathon</span>
          </div>
        </div>

        <div className="sl-divider" />

        {/* Nav group 1 */}
        <nav className="sl-nav">
          <span className="sl-nav-group-label">Bảng Điều khiển</span>
          {GROUP1.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              active={isActive(item)}
              onClick={() => navigate(item.path)}
            />
          ))}

          <span className="sl-nav-group-label" style={{ paddingTop: 16 }}>Tương tác</span>
          {GROUP2.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              active={isActive(item)}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>

        {/* User footer */}
        <div className="sl-sidebar-foot">
          <div className="sl-user-row" onClick={() => navigate('/dashboard/profile')}>
            <div className="sl-user-av">{userInitial}</div>
            <div className="sl-user-info">
              <span className="sl-user-name">{user?.full_name || 'Người dùng'}</span>
              <span className="sl-user-role">👥 Thí sinh</span>
            </div>
            <button
              className="sl-logout-icon"
              onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
              title={theme === 'dark' ? 'Chuyển Light Mode' : 'Chuyển Dark Mode'}
            >
              <Ico d={theme === 'dark' ? SUN : MOON} size={16} sw={1.8} />
            </button>
            <button
              className="sl-logout-icon"
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              title="Đăng xuất"
            >
              <Ico d={LOGOUT} size={16} sw={1.8} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="sl-main">
        {/* Topbar */}
        <header className="sl-topbar">
          {/* Left: status + clock */}
          <div className="sl-topbar-left">
            <span className="sl-status-dot" />
            <span className="sl-status-label">SEAL Hackathon 2026</span>
            <span className="sl-status-sep">·</span>
            <span className="sl-clock">{formatClock(now)}</span>
          </div>

          {/* Right: Bell */}
          <div className="sl-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <div className="sl-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
