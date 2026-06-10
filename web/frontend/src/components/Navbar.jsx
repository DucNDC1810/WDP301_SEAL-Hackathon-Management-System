import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from 'antd';

const API_URL = import.meta.env.VITE_API_URL || '';

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Trang Chủ', href: '#hero' },
    { label: 'Giới Thiệu', href: '#about' },
    { label: 'Hackathons', href: '#hackathons' },
    { label: 'Quy Trình', href: '#process' },
    { label: 'Thống Kê', href: '#stats' },
    { label: 'FAQ', href: '#faq' },
  ];

  const handleNavClick = (e, hash) => {
    e.preventDefault();
    setMobileOpen(false);
    if (location.pathname === '/') {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  return (
    <nav
      id="main-navbar"
      className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${
        scrolled
          ? 'bg-[rgba(10,14,23,0.92)] backdrop-blur-xl border-b border-[rgba(0,240,255,0.15)] py-[10px] shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between gap-8">
        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-[#f1f5f9] no-underline hover:scale-[1.03] transition-transform"
          style={{ fontFamily: "'Orbitron', monospace" }}
          onClick={(e) => { e.preventDefault(); handleNavClick(e, '#hero'); }}
        >
          <span className="text-[28px] text-[#00f0ff] drop-shadow-[0_0_10px_rgba(0,240,255,0.5)] animate-pulse">⬡</span>
          <span
            className="font-bold"
            style={{
              background: 'linear-gradient(135deg, #00f0ff, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            SEAL
          </span>
          <span className="text-[13px] font-normal text-[#64748b] pl-2 border-l border-[rgba(0,240,255,0.15)]" style={{ fontFamily: 'inherit' }}>
            Hackathon
          </span>
        </a>

        {/* Desktop Nav Links */}
        <ul className="hidden lg:flex items-center gap-1 list-none m-0 p-0">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-[#94a3b8] rounded-lg transition-all duration-200 hover:text-[#f1f5f9] hover:bg-[rgba(0,240,255,0.1)] no-underline
                  after:content-[''] after:absolute after:bottom-[2px] after:left-1/2 after:w-0 after:h-[2px]
                  after:bg-gradient-to-r after:from-[#00f0ff] after:to-[#a855f7]
                  after:transition-all after:duration-300 after:-translate-x-1/2 after:rounded-sm
                  hover:after:w-[60%]"
                onClick={(e) => handleNavClick(e, link.href)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <Button
                type="text"
                className="text-[#94a3b8] hover:text-[#00f0ff] hover:border hover:border-[rgba(0,240,255,0.15)] font-semibold text-sm"
                onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/dashboard')}
                id="btn-dashboard"
              >
                Dashboard
              </Button>
              <Button
                type="primary"
                className="font-bold text-sm"
                style={{
                  background: 'linear-gradient(135deg, #00f0ff, #a855f7)',
                  border: 'none',
                  color: '#0a0e17',
                  boxShadow: '0 0 20px rgba(0,240,255,0.3)',
                }}
                onClick={async () => {
                  await fetch(`${API_URL}/api/auth/signout`, { method: 'POST', credentials: 'include' }).catch(() => {});
                  logout();
                  navigate('/login');
                }}
                id="btn-signout"
              >
                Đăng Xuất
              </Button>
            </>
          ) : (
            <Link to="/login" id="btn-signin">
              <Button
                type="primary"
                className="font-bold text-sm"
                style={{
                  background: 'linear-gradient(135deg, #00f0ff, #a855f7)',
                  border: 'none',
                  color: '#0a0e17',
                  boxShadow: '0 0 20px rgba(0,240,255,0.3)',
                }}
              >
                Đăng Nhập
              </Button>
            </Link>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="flex lg:hidden flex-col gap-[5px] p-2 cursor-pointer bg-transparent border-none z-[1001]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          id="btn-mobile-menu"
        >
          <span
            className={`block w-6 h-[2px] bg-[#f1f5f9] rounded-sm transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-x-[5px] translate-y-[5px]' : ''}`}
          />
          <span
            className={`block w-6 h-[2px] bg-[#f1f5f9] rounded-sm transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block w-6 h-[2px] bg-[#f1f5f9] rounded-sm transition-all duration-300 ${mobileOpen ? '-rotate-45 translate-x-[5px] -translate-y-[5px]' : ''}`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-2 bg-[rgba(10,14,23,0.98)] backdrop-blur-xl lg:hidden">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-lg font-medium text-[#94a3b8] px-6 py-3 rounded-lg no-underline hover:text-[#f1f5f9] hover:bg-[rgba(0,240,255,0.1)] transition-all"
              onClick={(e) => handleNavClick(e, link.href)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col items-center gap-3 mt-4">
            {user ? (
              <>
                <Button
                  type="text"
                  className="text-[#94a3b8] font-semibold"
                  onClick={() => { setMobileOpen(false); navigate(isAdmin ? '/admin/dashboard' : '/dashboard'); }}
                >
                  Dashboard
                </Button>
                <Button
                  type="primary"
                  style={{ background: 'linear-gradient(135deg, #00f0ff, #a855f7)', border: 'none', color: '#0a0e17' }}
                  onClick={async () => {
                    setMobileOpen(false);
                    await fetch(`${API_URL}/api/auth/signout`, { method: 'POST', credentials: 'include' }).catch(() => {});
                    logout();
                    navigate('/login');
                  }}
                >
                  Đăng Xuất
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button
                  type="primary"
                  style={{ background: 'linear-gradient(135deg, #00f0ff, #a855f7)', border: 'none', color: '#0a0e17' }}
                >
                  Đăng Nhập
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
