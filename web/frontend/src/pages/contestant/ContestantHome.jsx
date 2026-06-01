import { useState, useEffect, useRef } from 'react';
import './ContestantHome.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/* ── Binary Rain Background ─────────────────────────────────────────────── */
function BinaryRain() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const columns = Math.floor(canvas.width / 20);
    const drops = Array(columns).fill(1);
    const draw = () => {
      ctx.fillStyle = 'rgba(5, 10, 20, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '13px monospace';
      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.5 ? '1' : '0';
        const opacity = Math.random() * 0.3 + 0.03;
        ctx.fillStyle = `rgba(0, 243, 255, ${opacity})`;
        ctx.fillText(text, i * 20, drops[i] * 20);
        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }} />;
}

export default function ContestantHome() {
  const [onboarding, setOnboarding] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeCompetitions, setActiveCompetitions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitForm, setSubmitForm] = useState({
    team_id: '',
    project_name: '',
    description: '',
    repo_url: '',
  });

  // State for competition detail view
  const [selectedCompId, setSelectedCompId] = useState(null);
  const [compDetailData, setCompDetailData] = useState(null);
  const [compDetailLoading, setCompDetailLoading] = useState(false);

  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/contestants/onboarding`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (res.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }

        const data = await res.json();
        if (data.success) {
          setOnboarding(data.data);
          setUser(data.data.user);
        } else {
          setError(data.message || 'Không thể tải dữ liệu.');
        }
      } catch (err) {
        setError('Không thể kết nối đến máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    const fetchActiveComps = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teams/competitions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setActiveCompetitions(data.data);
      } catch { /* ignore */ }
    };

    fetchData();
    fetchActiveComps();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'competition_detail' && selectedCompId) {
      const fetchCompDetail = async () => {
        setCompDetailLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/competitions/${selectedCompId}/public`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            setCompDetailData(data.data);
          }
        } catch { /* ignore */ } finally {
          setCompDetailLoading(false);
        }
      };
      fetchCompDetail();
    }
  }, [activeTab, selectedCompId, token]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/signout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
    } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!submitForm.team_id) {
      setSubmitMsg('Vui lòng chọn đội để nộp bài.');
      return;
    }

    setSubmitting(true);
    setSubmitMsg('');
    try {
      const res = await fetch(`${API_URL}/api/teams/${submitForm.team_id}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        credentials: 'include',
        body: JSON.stringify({
          project_name: submitForm.project_name,
          description: submitForm.description,
          repo_url: submitForm.repo_url,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitMsg('Nộp dự án thành công!');
        // Refresh data
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSubmitMsg(data.message || 'Lỗi nộp bài');
      }
    } catch {
      setSubmitMsg('Không thể kết nối đến server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (teamId) => {
    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        alert('Điểm danh thành công!');
        window.location.reload();
      } else {
        alert(data.message || 'Lỗi điểm danh');
      }
    } catch (err) {
      alert('Không thể kết nối đến server');
    }
  };

  if (!token) return null;

  if (loading) {
    return (
      <div className="hc-loading">
        <div className="hc-loading__spinner" />
        <p>Đang tải Hệ Thống Điều Khiển...</p>
      </div>
    );
  }

  if (error || !onboarding || !user) {
    return (
      <div className="hc-loading">
        <p style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Lỗi dữ liệu truy cập.'}</p>
        <a href="/contestant" className="hc-btn-outline" style={{ textDecoration: 'none' }}>
          ← Quay lại Dashboard
        </a>
      </div>
    );
  }

  const teams = onboarding?.teams || (onboarding?.team ? [onboarding.team] : []);

  return (
    <div className="hc-layout" style={{ position: 'relative' }}>
      <BinaryRain />
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="hc-sidebar" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hc-brand">
          <span style={{ fontSize: '24px' }}>⬡</span>
          <span style={{ fontWeight: 700, color: '#fff' }}>SEAL <span style={{ color: 'var(--hc-gold)' }}>Hackathon</span></span>
        </div>

        <div className="hc-user-info">
          <div className="hc-avatar">
            {user?.avatar_url 
              ? <img src={user.avatar_url} alt="avatar" style={{width: '100%', height: '100%', borderRadius: '4px'}}/>
              : <span>{user?.full_name?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="hc-user-details">
            <span className="hc-user-name">{user?.full_name}</span>
            <span className="hc-user-role">Contestant</span>
          </div>
        </div>

        <nav className="hc-nav">
          <button className={`hc-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="hc-nav-icon">⊞</span>
            Dashboard
          </button>
          <button className="hc-nav-item" onClick={() => window.location.href = '/contestant'}>
            <span className="hc-nav-icon">👥</span>
            Quản Lý Đội
          </button>
          <button className={`hc-nav-item ${activeTab === 'join_competition' ? 'active' : ''}`} onClick={() => setActiveTab('join_competition')}>
            <span className="hc-nav-icon">➕</span>
            Tham Gia Giải
          </button>
          <button className={`hc-nav-item ${activeTab === 'submit_project' ? 'active' : ''}`} onClick={() => setActiveTab('submit_project')}>
            <span className="hc-nav-icon">⭐</span>
            Submit Project
          </button>
          <button className="hc-nav-item" onClick={() => window.location.href = '/leaderboard'}>
            <span className="hc-nav-icon">🏆</span>
            Leaderboard
          </button>
          <button className="hc-nav-item">
            <span className="hc-nav-icon">⚙</span>
            Settings
          </button>
        </nav>

        <div className="hc-sidebar-footer">
          <button className="hc-nav-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
            <span className="hc-nav-icon">⏻</span>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="hc-main" style={{ position: 'relative', zIndex: 1 }}>
        <header className="hc-header">
          <div className="hc-header-title">Live Command Center</div>
          <div className="hc-header-actions">
            <div className="hc-status">
              <span className="hc-status-dot" />
              SYSTEM ONLINE
            </div>
            <button className="hc-btn-outline" style={{ border: 'none', fontSize: '16px' }}>🔔</button>
            <button className="hc-btn-outline" style={{ border: 'none', fontSize: '16px' }}>⚙</button>
          </div>
        </header>

        <div className="hc-content">
          {activeTab === 'dashboard' ? (
            <>
              <div>
                <h1 className="hc-page-title">Live Command Center</h1>
                <p className="hc-page-subtitle">Real-time telemetry & competition status.</p>
              </div>

              <div className="hc-grid-top">
                {/* Holographic Leaderboard */}
                <div className="hc-card">
                  <div className="hc-card-header">
                    <div className="hc-card-title">🏆 CÁC ĐỘI CỦA BẠN</div>
                    <button className="hc-btn-outline" onClick={() => setActiveTab('join_competition')}>+ THAM GIA MỚI</button>
                  </div>
                  <div className="hc-leaderboard-visual" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' }}>
                    {teams.length === 0 ? (
                      <p style={{ color: 'var(--hc-text-muted)' }}>Bạn chưa tham gia đội nào.</p>
                    ) : (
                      teams.map((t, index) => (
                        <div key={t._id} style={{
                          background: 'linear-gradient(145deg, rgba(16, 24, 39, 0.8), rgba(9, 13, 20, 0.9))',
                          border: '1px solid rgba(0, 240, 255, 0.2)',
                          borderRadius: '12px',
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          width: '100%',
                          maxWidth: '380px',
                          flex: '1 1 340px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          {/* Accent Line */}
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, transparent, var(--hc-cyan), transparent)' }} />
                          
                          {/* Header: Competition Info */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--hc-cyan)', boxShadow: '0 0 10px var(--hc-cyan)' }} />
                              <span style={{ fontSize: '12px', color: 'var(--hc-cyan)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                {t.competition?.title || 'Giải đấu chưa rõ'}
                              </span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#fff' }}>
                              {t.members?.length || 0} / {t.competition?.max_team_size || 5} Members
                            </div>
                          </div>

                          {/* Team Name */}
                          <div>
                            <h3 style={{ margin: '0', fontSize: '24px', color: '#fff', fontWeight: '800', letterSpacing: '0.5px' }}>
                              {t.team_name || '—'}
                            </h3>
                          </div>

                          {/* Member List */}
                          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px', flex: 1 }}>
                            {t.members?.map(m => (
                              <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: '#fff', fontWeight: '500' }}>{m.full_name}</span>
                                  {m.is_leader && <span title="Team Leader" style={{ fontSize: '14px' }}>👑</span>}
                                </div>
                                <span style={{ color: 'var(--hc-text-muted)', fontFamily: 'monospace', fontSize: '12px' }}>
                                  {m.github_username ? `@${m.github_username}` : 'No Github'}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
                            <button 
                              onClick={() => {
                                setSelectedCompId(t.competition?._id);
                                setActiveTab('competition_detail');
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                padding: '12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: '500'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.05)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.4)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                              }}
                            >
                              Truy cập Giải đấu ➔
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Lộ Trình Giải Đấu */}
                <div className="hc-card">
                  <div className="hc-card-header">
                    <div className="hc-card-title">🗺 LỘ TRÌNH GIẢI ĐẤU</div>
                  </div>
                  <div className="hc-timeline">
                    <div className="hc-timeline-item">
                      <div className="hc-timeline-dot" />
                      <div className="hc-timeline-time">08:00 - 15/10</div>
                      <div className="hc-timeline-title">Khai mạc & Briefing</div>
                    </div>
                    <div className="hc-timeline-item active">
                      <div className="hc-timeline-dot" />
                      <div className="hc-timeline-time">Current Phase</div>
                      <div className="hc-timeline-title">Hacking Phase (48H)</div>
                    </div>
                    <div className="hc-timeline-item">
                      <div className="hc-timeline-dot" />
                      <div className="hc-timeline-time">10:00 - 17/10</div>
                      <div className="hc-timeline-title">Chấm điểm (Judging)</div>
                    </div>
                    <div className="hc-timeline-item">
                      <div className="hc-timeline-dot" />
                      <div className="hc-timeline-time">18:00 - 17/10</div>
                      <div className="hc-timeline-title">Gala Trao Giải</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hc-grid-bottom">
                {/* Active Contests / Status */}
                <div className="hc-card">
                  <div className="hc-card-header">
                    <div className="hc-card-title">⚡ TRẠNG THÁI ONBOARDING</div>
                    <button className="hc-btn-outline">Filter: All</button>
                  </div>
                  
                  <div className="hc-contests-grid">
                    <div className="hc-contest-card">
                      <div className="hc-contest-header">
                        <span className="hc-contest-group">Bước 1</span>
                        <span className={`hc-contest-badge ${onboarding?.is_verified ? 'active' : 'pending'}`}>
                          {onboarding?.is_verified ? 'ĐÃ XONG' : 'CHỜ XỬ LÝ'}
                        </span>
                      </div>
                      <div className="hc-contest-title">Xác thực Email</div>
                      <div className="hc-contest-row">
                        <span className="hc-contest-team">{user?.email}</span>
                      </div>
                    </div>

                    <div className="hc-contest-card">
                      <div className="hc-contest-header">
                        <span className="hc-contest-group">Bước 2</span>
                        <span className={`hc-contest-badge ${onboarding?.has_team ? 'active' : 'pending'}`}>
                          {onboarding?.has_team ? 'ĐÃ XONG' : 'CHỜ XỬ LÝ'}
                        </span>
                      </div>
                      <div className="hc-contest-title">Tham gia Đội</div>
                      <div className="hc-contest-row">
                        <span className="hc-contest-team">{teams.length > 0 ? `Đang thi đấu ${teams.length} giải` : 'Chưa tham gia'}</span>
                      </div>
                    </div>

                    <div className="hc-contest-card">
                      <div className="hc-contest-header">
                        <span className="hc-contest-group">Bước 3</span>
                        <span className={`hc-contest-badge ${user?.github_username ? 'active' : 'pending'}`}>
                          {user?.github_username ? 'ĐÃ XONG' : 'CHỜ XỬ LÝ'}
                        </span>
                      </div>
                      <div className="hc-contest-title">Liên kết Github</div>
                      <div className="hc-contest-row">
                        <span className="hc-contest-team">{user?.github_username ? `@${user.github_username}` : 'Chưa liên kết'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'join_competition' ? (
            <>
              <div>
                <h1 className="hc-page-title">Tham Gia Giải</h1>
                <p className="hc-page-subtitle">Danh sách các cuộc thi hiện đang tổ chức và bạn đã tham gia.</p>
              </div>
              
              <div style={{ marginTop: '24px' }}>
                <div className="hc-card" style={{ marginBottom: '24px' }}>
                  <div className="hc-card-header">
                    <div className="hc-card-title">✅ CÁC GIẢI ĐÃ JOIN</div>
                  </div>
                  <div className="hc-contests-grid">
                    {teams.length === 0 ? (
                      <p style={{ color: 'var(--hc-text-muted)', fontSize: '14px' }}>Bạn chưa tham gia giải nào.</p>
                    ) : (
                      teams.map(t => (
                        <div key={t._id} className="hc-contest-card" style={{ border: '1px solid var(--hc-gold)' }}>
                          <div className="hc-contest-header">
                            <span className="hc-contest-group">ĐÃ THAM GIA</span>
                            <span className="hc-contest-badge active">ONLINE</span>
                          </div>
                          <div className="hc-contest-title">{t.competition?.title}</div>
                          <div className="hc-contest-row">
                            <span className="hc-contest-team">Đội: {t.team_name}</span>
                          </div>
                          <button className="hc-btn-primary" style={{ marginTop: '16px', padding: '8px', fontSize: '12px' }} onClick={() => window.location.href = '/contestant'}>
                            Vào Dashboard Giải
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="hc-card">
                  <div className="hc-card-header">
                    <div className="hc-card-title">🔥 CÁC GIẢI ĐANG TỔ CHỨC</div>
                  </div>
                  <div className="hc-contests-grid">
                    {activeCompetitions.filter(comp => !teams.find(t => t.competition?._id === comp._id)).length === 0 ? (
                      <p style={{ color: 'var(--hc-text-muted)', fontSize: '14px' }}>Hiện không có giải đấu mới nào đang mở đăng ký.</p>
                    ) : (
                      activeCompetitions
                        .filter(comp => !teams.find(t => t.competition?._id === comp._id))
                        .map(comp => (
                          <div key={comp._id} className="hc-contest-card">
                            <div className="hc-contest-header">
                              <span className="hc-contest-group">ĐANG MỞ ĐĂNG KÝ</span>
                              <span className="hc-contest-badge pending">JOIN NOW</span>
                            </div>
                            <div className="hc-contest-title">{comp.title}</div>
                            <div className="hc-contest-row">
                              <span className="hc-contest-team">Max team size: {comp.max_team_size}</span>
                            </div>
                            <button className="hc-btn-outline" style={{ marginTop: '16px', width: '100%' }} onClick={() => window.location.href = `/contestant?action=join_new&comp=${comp._id}`}>
                              Đăng ký ngay
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'submit_project' ? (
            <>
              <div>
                <h1 className="hc-page-title">Nộp Bài / Liên Kết Github</h1>
                <p className="hc-page-subtitle">Quản lý mã nguồn và nộp bài dự thi cho các giải đấu đang tham gia.</p>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div className="hc-card" style={{ flex: '1 1 400px' }}>
                  <div className="hc-card-header">
                    <div className="hc-card-title">🔗 LIÊN KẾT GITHUB CÁ NHÂN</div>
                  </div>
                  <div className="hc-card-body" style={{ padding: '20px' }}>
                    {user?.github_username ? (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                        <p style={{ color: 'var(--hc-cyan)', marginBottom: '8px' }}>✅ Đã liên kết</p>
                        <p style={{ color: '#fff' }}><strong>Username:</strong> @{user.github_username}</p>
                        {user.github_link && <p style={{ color: 'var(--hc-text-muted)' }}><strong>Link:</strong> <a href={user.github_link} target="_blank" rel="noreferrer" style={{ color: 'var(--hc-cyan)' }}>{user.github_link}</a></p>}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--hc-text-muted)' }}>Bạn chưa liên kết Github cá nhân. Thông tin này sẽ được cập nhật tự động khi bạn nộp bài dự thi lần đầu tiên.</p>
                    )}
                  </div>
                </div>

                <div className="hc-card" style={{ flex: '2 1 600px' }}>
                  <div className="hc-card-header">
                    <div className="hc-card-title">⭐ NỘP BÀI DỰ THI</div>
                  </div>
                  <div className="hc-card-body" style={{ padding: '20px' }}>
                    <form onSubmit={handleSubmitProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--hc-text-muted)', fontSize: '12px', fontWeight: 'bold' }}>CHỌN ĐỘI ĐỂ NỘP BÀI (Chỉ Leader mới có quyền)</label>
                        <select 
                          style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--hc-border)', color: '#fff', borderRadius: '4px', outline: 'none' }}
                          value={submitForm.team_id}
                          onChange={(e) => setSubmitForm({...submitForm, team_id: e.target.value})}
                          required
                        >
                          <option value="" style={{ color: '#000' }}>-- Chọn đội của bạn --</option>
                          {teams.filter(t => t.is_leader).map(t => (
                            <option key={t._id} value={t._id} style={{ color: '#000' }}>
                              {t.team_name} - Giải: {t.competition?.title}
                            </option>
                          ))}
                        </select>
                        {teams.filter(t => t.is_leader).length === 0 && (
                          <p style={{ color: '#ef4444', fontSize: '13px' }}>Bạn không phải là Leader của đội nào.</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--hc-text-muted)', fontSize: '12px', fontWeight: 'bold' }}>TÊN DỰ ÁN</label>
                        <input 
                          type="text" 
                          required 
                          value={submitForm.project_name}
                          onChange={(e) => setSubmitForm({...submitForm, project_name: e.target.value})}
                          style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--hc-border)', color: '#fff', borderRadius: '4px', outline: 'none' }} 
                          placeholder="Nhập tên dự án / sản phẩm" 
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--hc-text-muted)', fontSize: '12px', fontWeight: 'bold' }}>GITHUB REPOSITORY URL</label>
                        <input 
                          type="url" 
                          required 
                          value={submitForm.repo_url}
                          onChange={(e) => setSubmitForm({...submitForm, repo_url: e.target.value})}
                          style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--hc-border)', color: '#fff', borderRadius: '4px', outline: 'none' }} 
                          placeholder="https://github.com/..." 
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--hc-text-muted)', fontSize: '12px', fontWeight: 'bold' }}>MÔ TẢ NGẮN (Tùy chọn)</label>
                        <textarea 
                          rows="4"
                          value={submitForm.description}
                          onChange={(e) => setSubmitForm({...submitForm, description: e.target.value})}
                          style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--hc-border)', color: '#fff', borderRadius: '4px', outline: 'none', resize: 'vertical' }} 
                          placeholder="Dự án này làm gì? Công nghệ sử dụng là gì?" 
                        />
                      </div>

                      {submitMsg && (
                        <div style={{ padding: '12px', background: 'rgba(0, 240, 255, 0.1)', borderLeft: '4px solid var(--hc-cyan)', color: 'var(--hc-cyan)', fontSize: '14px' }}>
                          {submitMsg}
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className="hc-btn-primary" 
                        disabled={submitting || teams.filter(t => t.is_leader).length === 0}
                        style={{ marginTop: '16px', padding: '16px', fontSize: '16px', fontWeight: 'bold', width: '100%' }}
                      >
                        {submitting ? 'ĐANG GỬI DỮ LIỆU...' : '🚀 XÁC NHẬN NỘP BÀI'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'competition_detail' ? (
            <div className="hc-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <div className="hc-card-header" style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.2)', paddingBottom: '20px' }}>
                <button className="hc-btn-outline" onClick={() => setActiveTab('dashboard')} style={{ marginRight: '15px' }}>
                  ← Quay lại
                </button>
                <div className="hc-card-title">{compDetailData?.competition?.title || 'CHI TIẾT GIẢI ĐẤU'}</div>
              </div>
              <div className="hc-card-body" style={{ padding: '20px' }}>
                {compDetailLoading ? (
                  <h2 style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>Đang tải thông tin giải đấu...</h2>
                ) : compDetailData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    
                    {/* Check-in Banner / Status */}
                    {(() => {
                      const userTeam = teams.find(t => t.competition?._id === selectedCompId);
                      if (!userTeam) return null; // Not participating
                      
                      const compStart = new Date(compDetailData.competition.registration_start); // Assuming this is start time, you might want to use a specific start_time field
                      const now = new Date();
                      const timeDiffMs = compStart.getTime() - now.getTime();
                      const timeDiffMins = Math.floor(timeDiffMs / 60000);
                      
                      // Check if it's within 5 minutes of starting, or already started
                      const isCheckinOpen = timeDiffMins <= 5;
                      
                      return (
                        <div style={{ 
                          background: userTeam.is_checked_in ? 'rgba(0, 255, 170, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                          border: `1px solid ${userTeam.is_checked_in ? 'var(--hc-cyan)' : '#ef4444'}`,
                          borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                          <div>
                            <h3 style={{ color: '#fff', margin: '0 0 5px 0' }}>Trạng Thái Điểm Danh Đội: {userTeam.team_name}</h3>
                            {userTeam.is_checked_in ? (
                              <p style={{ color: 'var(--hc-cyan)', margin: 0 }}>✅ Bạn đã điểm danh thành công.</p>
                            ) : isCheckinOpen ? (
                              <p style={{ color: '#ef4444', margin: 0 }}>⚠️ Giải đấu sắp bắt đầu. Vui lòng điểm danh ngay!</p>
                            ) : (
                              <p style={{ color: 'var(--hc-text-muted)', margin: 0 }}>🔒 Cổng điểm danh sẽ mở trước khi giải đấu bắt đầu 5 phút.</p>
                            )}
                          </div>
                          {!userTeam.is_checked_in && isCheckinOpen && (
                            <button 
                              onClick={() => handleCheckIn(userTeam._id)}
                              className="hc-btn-primary" style={{ padding: '12px 24px', background: '#ef4444', border: 'none' }}>
                              🖐 XÁC NHẬN ĐIỂM DANH
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Timeline & Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ color: 'var(--hc-gold)', marginBottom: '15px' }}>THỜI GIAN</h3>
                        <p style={{ color: '#fff', marginBottom: '10px' }}><strong>Bắt đầu:</strong> {compDetailData.competition.registration_start ? new Date(compDetailData.competition.registration_start).toLocaleString('vi-VN') : 'N/A'}</p>
                        <p style={{ color: '#fff' }}><strong>Kết thúc:</strong> {compDetailData.competition.registration_end ? new Date(compDetailData.competition.registration_end).toLocaleString('vi-VN') : 'N/A'}</p>
                      </div>
                      
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ color: 'var(--hc-cyan)', marginBottom: '15px' }}>LỘ TRÌNH (TIMELINE)</h3>
                        <ul style={{ color: '#fff', paddingLeft: '20px', margin: 0 }}>
                          <li style={{ marginBottom: '8px' }}>Lễ Khai Mạc</li>
                          <li style={{ marginBottom: '8px' }}>Hacking Phase (48H)</li>
                          <li style={{ marginBottom: '8px' }}>Submit Code & Chấm Điểm</li>
                          <li>Gala Trao Giải</li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Mentors */}
                    <div>
                      <h3 style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px' }}>MENTOR ĐỒNG HÀNH</h3>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        {compDetailData.mentors && compDetailData.mentors.length > 0 ? (
                          compDetailData.mentors.map(m => (
                            <div key={m._id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', textAlign: 'center', width: '150px' }}>
                              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--hc-gold)', margin: '0 auto 10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '20px', fontWeight: 'bold' }}>
                                {m.full_name.charAt(0)}
                              </div>
                              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{m.full_name}</div>
                              <div style={{ color: 'var(--hc-cyan)', fontSize: '12px', marginTop: '5px' }}>{m.github_username ? `@${m.github_username}` : 'Mentor'}</div>
                            </div>
                          ))
                        ) : (
                          <p style={{ color: 'var(--hc-text-muted)' }}>Chưa có Mentor nào được phân công.</p>
                        )}
                      </div>
                    </div>

                    {/* Other Teams */}
                    <div>
                      <h3 style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px' }}>CÁC ĐỘI TRANH TÀI ({compDetailData.teams?.length || 0})</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {compDetailData.teams?.map(t => (
                          <div key={t._id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px', borderRadius: '8px' }}>
                            <div style={{ color: 'var(--hc-cyan)', fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>{t.team_name}</div>
                            <div style={{ color: 'var(--hc-text-muted)', fontSize: '13px', marginBottom: '10px' }}>{t.members?.length} thành viên</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {t.members?.map(m => (
                                <div key={m._id} style={{ color: '#fff', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{m.full_name} {m.is_leader ? '👑' : ''}</span>
                                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{m.is_checked_in ? '✅' : '⏳'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <p style={{ color: 'var(--hc-text-muted)', textAlign: 'center' }}>Không tìm thấy thông tin giải đấu.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
