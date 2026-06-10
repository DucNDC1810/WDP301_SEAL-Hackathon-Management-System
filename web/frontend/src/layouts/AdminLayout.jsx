import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API_URL = import.meta.env.VITE_API_URL || '';

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

  const initials = (name) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name[0].toUpperCase();
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`flex min-h-screen font-sans ${isDark ? 'bg-[#060b16] text-[#c9d6e8]' : 'bg-[#f0f4f8] text-[#1e293b]'}`}
      data-theme={theme}
    >
      {/* ── Sidebar ── */}
      <aside
        className={`
          flex-shrink-0 flex flex-col sticky top-0 h-screen z-10
          transition-all duration-200 ease-in-out overflow-visible
          border-r
          ${collapsed ? 'w-[60px]' : 'w-[210px]'}
          ${isDark ? 'bg-[#0b1120] border-[#162036]' : 'bg-white border-[#e2e8f0]'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center px-3 py-3.5 border-b min-h-[56px] ${isDark ? 'border-[#162036]' : 'border-[#e2e8f0]'}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0 border ${isDark ? 'bg-[#00d4ff14] border-[#00d4ff30] text-[#00d4ff]' : 'bg-[rgba(0,152,181,0.08)] border-[rgba(0,152,181,0.3)] text-[#0098b5]'}`}>
              <Ico d={ZAP} size={18} sw={2} />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className={`text-base font-extrabold tracking-[1.5px] whitespace-nowrap ${isDark ? 'text-[#00d4ff]' : 'text-[#0098b5]'}`}>SEAL</span>
                <span className={`text-[0.58rem] uppercase tracking-[1px] whitespace-nowrap ${isDark ? 'text-[#3a5068]' : 'text-[#94a3b8]'}`}>Hackathon</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggle button */}
        <button
          className={`absolute top-[18px] -right-[11px] z-20 w-[22px] h-[22px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 border ${isDark ? 'bg-[#0f1827] border-[#1e3050] text-[#3a5068] hover:text-[#00d4ff] hover:border-[#00d4ff30]' : 'bg-[#f8fafc] border-[#e2e8f0] text-[#94a3b8] hover:text-[#0098b5]'}`}
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <Ico d={collapsed ? CR : CL} size={13} sw={2.5} />
        </button>

        {/* Nav */}
        <nav className="flex-1 py-2.5 px-[7px] flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden scrollbar-none">
          {NAV.map(({ key, label, path, d }) => (
            <button
              key={key}
              className={`
                flex items-center gap-2.5 px-[11px] py-[9px] rounded-[7px] border text-left w-full whitespace-nowrap
                cursor-pointer transition-all duration-150 text-[0.83rem] font-medium font-sans
                ${activeKey === key
                  ? isDark
                    ? 'bg-[linear-gradient(90deg,#00d4ff18,transparent)] text-[#00d4ff] border-[#00d4ff18]'
                    : 'bg-[rgba(0,152,181,0.1)] text-[#0098b5] border-[rgba(0,152,181,0.1)]'
                  : `border-transparent ${isDark ? 'text-[#4a6080] hover:bg-[#121e30] hover:text-[#90aac8]' : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]'}`
                }
              `}
              onClick={() => path && navigate(path)}
              title={collapsed ? label : undefined}
            >
              <span className="w-4 flex items-center justify-center flex-shrink-0">
                <Ico d={d} size={16} />
              </span>
              {!collapsed && <span className="overflow-hidden text-ellipsis">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer: theme toggle */}
        <div className={`px-[7px] py-2.5 border-t flex flex-col gap-1.5 ${isDark ? 'border-[#162036]' : 'border-[#e2e8f0]'}`}>
          <button
            className={`flex items-center gap-2 px-[11px] py-2 rounded-[7px] border w-full cursor-pointer font-sans text-[0.8rem] transition-all duration-150 ${isDark ? 'border-[#162036] text-[#3a5068] hover:bg-[#121e30] hover:text-[#00d4ff] hover:border-[#00d4ff30]' : 'border-[#e2e8f0] text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0098b5]'}`}
            onClick={toggleTheme}
            title={isDark ? 'Chuyển Light Mode' : 'Chuyển Dark Mode'}
          >
            <Ico d={isDark ? SUN : MOON} size={16} />
            {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </aside>

      {/* ── Right side: topbar + content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className={`h-14 flex items-center justify-end px-5 gap-3 flex-shrink-0 sticky top-0 z-[9] border-b ${isDark ? 'bg-[#0b1120] border-[#162036]' : 'bg-white border-[#e2e8f0]'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center gap-2.5 px-3 py-1.5 pl-1.5 rounded-[10px] border ${isDark ? 'bg-[#0f1827] border-[#162036]' : 'bg-[#f8fafc] border-[#e2e8f0]'}`}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] text-white font-bold text-[0.82rem] flex items-center justify-center flex-shrink-0">
                {initials(user?.full_name)}
              </div>
              <div className="flex flex-col leading-tight">
                <span className={`text-[0.82rem] font-semibold whitespace-nowrap ${isDark ? 'text-[#c9d6e8]' : 'text-[#1e293b]'}`}>{user?.full_name || 'Admin'}</span>
                <span className={`text-[0.62rem] font-bold tracking-[0.5px] ${isDark ? 'text-[#00d4ff]' : 'text-[#0098b5]'}`}>ADMIN</span>
              </div>
            </div>
            <button
              className={`flex items-center gap-1.5 px-3 py-[7px] rounded-lg border cursor-pointer font-sans text-[0.8rem] whitespace-nowrap transition-all duration-150 ${isDark ? 'border-[#162036] text-[#3a5068] hover:bg-[#1a1020] hover:text-[#ff6b6b] hover:border-[rgba(239,68,68,0.3)]' : 'border-[#e2e8f0] text-[#94a3b8] hover:bg-[#fff1f2] hover:text-[#ef4444] hover:border-[rgba(239,68,68,0.3)]'}`}
              onClick={handleLogout}
              title="Logout"
            >
              <Ico d={LOGOUT} size={16} sw={1.8} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
