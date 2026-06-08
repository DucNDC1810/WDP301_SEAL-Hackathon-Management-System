import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

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
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="main-navbar">
      <div className="navbar__container container">
        <a
          href="/"
          className="navbar__logo"
          onClick={(e) => { e.preventDefault(); handleNavClick(e, '#hero'); }}
        >
          <span className="navbar__logo-icon">⬡</span>
          <span className="navbar__logo-text">SEAL</span>
          <span className="navbar__logo-tag">Hackathon</span>
        </a>

        <ul className={`navbar__links ${mobileOpen ? 'navbar__links--open' : ''}`}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="navbar__link"
                onClick={(e) => handleNavClick(e, link.href)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="navbar__actions">
          {user ? (
            <>
              <button
                className="navbar__btn navbar__btn--ghost"
                onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/dashboard')}
                id="btn-dashboard"
              >
                {isAdmin ? 'Dashboard' : 'Dashboard'}
              </button>
              <button
                className="navbar__btn navbar__btn--primary"
                onClick={async () => {
                  await fetch(`${API_URL}/api/auth/signout`, { method: 'POST', credentials: 'include' }).catch(() => {});
                  logout();
                  navigate('/login');
                }}
                id="btn-signout"
              >
                Đăng Xuất
              </button>
            </>
          ) : (
            <Link to="/login" className="navbar__btn navbar__btn--primary" id="btn-signin">
              Đăng Nhập
            </Link>
          )}
        </div>

        <button
          className={`navbar__hamburger ${mobileOpen ? 'navbar__hamburger--active' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          id="btn-mobile-menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
