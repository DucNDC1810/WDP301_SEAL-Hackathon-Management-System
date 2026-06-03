import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './AdminLayout.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const GRID = ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'];
const GEAR = ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'];
const BRAIN = 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.99-3.02A2.5 2.5 0 0 1 9.5 2M14.5 2a2.5 2.5 0 0 0-2.5 2.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.99-3.02A2.5 2.5 0 0 0 14.5 2';
const USER = ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'];
const ZAP = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';
const BAR = ['M18 20V10', 'M12 20V4', 'M6 20v-6'];
const TROPHY = ['M6 9H3.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h2.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M18 2H6v7a6 6 0 0 0 12 0V2z'];
const CL = 'M15 18l-6-6 6-6';
const CR = 'M9 18l6-6-6-6';
const LOGOUT = ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'];
const SUN = 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z';
const MOON = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';

const USERS_D = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'];

const NAV = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', d: GRID },
  { key: 'hackathons', label: 'Hackathons', path: '/admin/hackathons', d: TROPHY },
  { key: 'ai', label: 'AI Assistant', path: '/admin/ai-assistant', d: BRAIN },
  { key: 'team', label: 'Team Registration', path: '/admin/team', d: USER },
  { key: 'users', label: 'Users', path: '/admin/users', d: USERS_D },
  { key: 'results', label: 'Results', path: '/admin/results', d: BAR },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/signout`, { method: 'POST', credentials: 'include' }).catch(() => { });
    logout();
    navigate('/login');
  };

  const activeKey = NAV.find(n => n.path && location.pathname.startsWith(n.path))?.key || 'dashboard';

  return (
    <div className="al-root">
      {/* ── Sidebar ── */}
      <aside className={`al-sidebar${collapsed ? ' al-sm' : ''}`}>
        <div className="al-logo-row">
          <div className="al-logo">
            <div className="al-logo-icon">
              <Ico d={ZAP} size={18} sw={2} />
            </div>
            {!collapsed && (
              <div className="al-logo-txt">
                <span className="al-logo-name">SEAL</span>
                <span className="al-logo-sub">Hackathon</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggle — absolute trên cạnh phải sidebar */}
        <button className="al-toggle" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Expand' : 'Collapse'}>
          <Ico d={collapsed ? CR : CL} size={13} sw={2.5} />
        </button>

        <nav className="al-nav">
          {NAV.map(({ key, label, path, d }) => (
            <button
              key={key}
              className={`al-nav-item${activeKey === key ? ' active' : ''}`}
              onClick={() => path && navigate(path)}
              title={collapsed ? label : undefined}
            >
              <span className="al-nav-icon"><Ico d={d} size={16} /></span>
              {!collapsed && <span className="al-nav-label">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="al-sidebar-foot">
          {!collapsed && user && (
            <div className="al-user">
              <div className="al-user-av">{(user.full_name?.[0] || 'A').toUpperCase()}</div>
              <div className="al-user-info">
                <span className="al-user-name">{user.full_name}</span>
                <span className="al-user-role">Admin</span>
              </div>
            </div>
          )}
          <button
            className="al-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển Light Mode' : 'Chuyển Dark Mode'}
          >
            <Ico d={theme === 'dark' ? SUN : MOON} size={16} />
            {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button className="al-logout" onClick={handleLogout} title="Logout">
            <Ico d={LOGOUT} size={16} sw={1.8} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Page content ── */}
      <div className="al-content">
        <Outlet />
      </div>
    </div>
  );
}
