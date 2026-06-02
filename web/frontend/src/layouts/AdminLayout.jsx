import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const GRID  = ['M3 3h7v7H3z','M14 3h7v7h-7z','M3 14h7v7H3z','M14 14h7v7h-7z'];
const GEAR  = ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'];
const BRAIN = 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.99-3.02A2.5 2.5 0 0 1 9.5 2M14.5 2a2.5 2.5 0 0 0-2.5 2.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.99-3.02A2.5 2.5 0 0 0 14.5 2';
const USER  = ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2','M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'];
const ZAP   = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';
const BAR   = ['M18 20V10','M12 20V4','M6 20v-6'];
const CL    = 'M15 18l-6-6 6-6';
const CR    = 'M9 18l6-6-6-6';
const LOGOUT = ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','M16 17l5-5-5-5','M21 12H9'];

const NAV = [
  { key: 'dashboard',  label: 'Dashboard',        path: '/admin/dashboard',        d: GRID  },
  { key: 'admin',      label: 'Admin Panel',       path: '/admin/contest/create',   d: GEAR  },
  { key: 'ai',         label: 'AI Assistant',      path: '/admin/ai-assistant',     d: BRAIN },
  { key: 'team',       label: 'Team Registration', path: '/admin/team',             d: USER  },
  { key: 'insights',   label: 'AI Insights',       path: '/admin/ai-insights',      d: ZAP   },
  { key: 'results',    label: 'Results',           path: '/admin/results',          d: BAR   },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/signout`, { method: 'POST', credentials: 'include' }).catch(() => {});
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
