import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Users tab state
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  // Competitions tab state
  const [competitionsList, setCompetitionsList] = useState([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [competitionsError, setCompetitionsError] = useState('');
  
  // Create Competition Modal state
  const [showCompModal, setShowCompModal] = useState(false);
  const [compForm, setCompForm] = useState({ title: '', description: '', max_team_size: 5 });
  const [compSubmitting, setCompSubmitting] = useState(false);
  const [compSubmitError, setCompSubmitError] = useState('');

  // Manage Competition state
  const [selectedCompId, setSelectedCompId] = useState(null);
  const [compDetails, setCompDetails] = useState(null);
  const [compTeams, setCompTeams] = useState([]);
  const [managingCompLoading, setManagingCompLoading] = useState(false);

  const token = localStorage.getItem('accessToken');

  const fetchAdminData = useCallback(async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    // In a real app, you would fetch actual stats from an admin endpoint
    // For now, we simulate fetching admin data
    setTimeout(() => {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser) {
        // Verify if user is admin based on roles
        const isAdmin = storedUser.roles?.some(r => r.role_name === 'admin');
        if (!isAdmin) {
          // If not admin, redirect to contestant or home
          // navigate('/contestant');
          // For demo, we just set the user anyway
          setUser(storedUser);
        } else {
          setUser(storedUser);
        }
      } else {
        // Mock user if none found for testing UI
        setUser({
          full_name: 'System Admin',
          email: 'admin@seal.com',
          roles: [{ role_name: 'admin' }]
        });
      }
      setLoading(false);
    }, 500);
  }, [token, navigate]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Fetch users when on users tab
  useEffect(() => {
    if (activeTab === 'users' && usersList.length === 0) {
      const fetchUsers = async () => {
        setUsersLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success) {
            setUsersList(data.data);
          } else {
            setUsersError(data.message || 'Lỗi tải danh sách người dùng');
          }
        } catch (error) {
          setUsersError('Không thể kết nối đến server');
        } finally {
          setUsersLoading(false);
        }
      };
      fetchUsers();
    }
  }, [activeTab, token, usersList.length]);

  // Fetch competitions when on competitions tab
  useEffect(() => {
    if (activeTab === 'competitions' && competitionsList.length === 0) {
      const fetchCompetitions = async () => {
        setCompetitionsLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/competitions`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success) {
            setCompetitionsList(data.data);
          } else {
            setCompetitionsError(data.message || 'Lỗi tải danh sách cuộc thi');
          }
        } catch (error) {
          setCompetitionsError('Không thể kết nối đến server');
        } finally {
          setCompetitionsLoading(false);
        }
      };
      fetchCompetitions();
    }
  }, [activeTab, token, competitionsList.length]);

  // Fetch details when managing a specific competition
  useEffect(() => {
    if (activeTab === 'manage_competition' && selectedCompId) {
      const fetchManageData = async () => {
        setManagingCompLoading(true);
        try {
          // Find competition details from list
          const comp = competitionsList.find(c => c._id === selectedCompId);
          if (comp) setCompDetails(comp);
          
          const teamsRes = await fetch(`${API_URL}/api/competitions/${selectedCompId}/teams`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const teamsData = await teamsRes.json();
          if (teamsData.success) {
            setCompTeams(teamsData.data);
          }
        } catch (err) {
          // silent
        } finally {
          setManagingCompLoading(false);
        }
      };
      fetchManageData();
    }
  }, [activeTab, selectedCompId, token, competitionsList]);

  const handleCreateCompetition = async (e) => {
    e.preventDefault();
    setCompSubmitting(true);
    setCompSubmitError('');
    try {
      const res = await fetch(`${API_URL}/api/competitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ ...compForm, status: 'registration' })
      });
      const data = await res.json();
      if (data.success) {
        setShowCompModal(false);
        setCompForm({ title: '', description: '', max_team_size: 5 });
        // Refresh list
        setCompetitionsList([...competitionsList, data.data]);
      } else {
        setCompSubmitError(data.message || 'Lỗi tạo cuộc thi');
      }
    } catch (error) {
      setCompSubmitError('Không thể kết nối đến server');
    } finally {
      setCompSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/signout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // silent
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page__loader">
          <div className="admin-page__spinner" />
          <p>Tải hệ thống quản trị...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page" id="admin-dashboard">
      <div className="admin-page__bg">
        <div className="admin-page__grid" />
        <div className="admin-page__glow" />
      </div>

      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <span className="admin-sidebar__logo-icon">⬡</span>
          <span className="admin-sidebar__logo-text">SEAL ADMIN</span>
        </div>
        
        <nav className="admin-sidebar__nav">
          <button 
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="9"/>
              <rect x="14" y="3" width="7" height="5"/>
              <rect x="14" y="12" width="7" height="9"/>
              <rect x="3" y="16" width="7" height="5"/>
            </svg>
            Tổng Quan
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Quản Lý User
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'competitions' ? 'active' : ''}`}
            onClick={() => setActiveTab('competitions')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            Cuộc Thi
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z"/>
              <path d="M12 22v-6.5"/>
              <path d="M22 8.5l-10 7-10-7"/>
              <path d="M2 15.5l10-7 10 7"/>
            </svg>
            Danh Sách Đội
          </button>
        </nav>

        <div className="admin-sidebar__bottom">
          <button className="admin-nav-item logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Đăng Xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header__title">
            {activeTab === 'overview' && 'Bảng Điều Khiển'}
            {activeTab === 'users' && 'Quản Lý Người Dùng'}
            {activeTab === 'competitions' && 'Quản Lý Cuộc Thi'}
            {activeTab === 'teams' && 'Quản Lý Đội Thi'}
          </h1>
          <div className="admin-header__user">
            <div className="admin-header__info">
              <span className="admin-header__name">{user?.full_name}</span>
              <span className="admin-header__role">Administrator</span>
            </div>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Admin" className="admin-header__avatar" />
            ) : (
              <div className="admin-header__avatar-placeholder">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
            )}
          </div>
        </header>

        <div className="admin-content">
          {activeTab === 'overview' && (
            <div className="admin-overview">
              {/* Stats Cards */}
              <div className="admin-stats">
                <div className="admin-stat-card">
                  <div className="admin-stat-card__icon text-cyan">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="admin-stat-card__info">
                    <h3>1,204</h3>
                    <p>Tổng Thí Sinh</p>
                  </div>
                  <div className="admin-stat-card__trend positive">+12%</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-card__icon text-magenta">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </div>
                  <div className="admin-stat-card__info">
                    <h3>3</h3>
                    <p>Cuộc Thi Đang Mở</p>
                  </div>
                  <div className="admin-stat-card__trend neutral">-</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-card__icon text-yellow">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z"/>
                    </svg>
                  </div>
                  <div className="admin-stat-card__info">
                    <h3>156</h3>
                    <p>Đội Đã Đăng Ký</p>
                  </div>
                  <div className="admin-stat-card__trend positive">+24</div>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="admin-panel">
                <div className="admin-panel__header">
                  <h2>Cuộc Thi Gần Đây</h2>
                  <button className="admin-btn-primary">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Tạo Mới
                  </button>
                </div>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Tên Cuộc Thi</th>
                        <th>Trạng Thái</th>
                        <th>Đội Tham Gia</th>
                        <th>Bắt Đầu</th>
                        <th>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>CyberSec Hackathon 2026</strong></td>
                        <td><span className="badge badge--active">Đang diễn ra</span></td>
                        <td>45 / 100</td>
                        <td>15/06/2026</td>
                        <td>
                          <button className="action-btn">Chi tiết</button>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>AI Innovation Challenge</strong></td>
                        <td><span className="badge badge--upcoming">Sắp tới</span></td>
                        <td>89 / 200</td>
                        <td>01/07/2026</td>
                        <td>
                          <button className="action-btn">Chi tiết</button>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Web3 DevMinds</strong></td>
                        <td><span className="badge badge--ended">Đã kết thúc</span></td>
                        <td>22 / 50</td>
                        <td>20/05/2026</td>
                        <td>
                          <button className="action-btn">Báo cáo</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="admin-panel">
              <div className="admin-panel__header">
                <h2>Quản Lý Người Dùng</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="admin-btn-primary" onClick={() => {
                    setUsersList([]);
                    setUsersError('');
                  }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M2.13 15.57a10 10 0 1 0 1.25-10.45l4.35 4.35"/>
                    </svg>
                    Làm Mới
                  </button>
                  <button className="admin-btn-primary">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Thêm User
                  </button>
                </div>
              </div>

              {usersLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <span className="admin-page__spinner" style={{ display: 'inline-block', width: '30px', height: '30px' }} />
                  <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</p>
                </div>
              ) : usersError ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--danger)' }}>
                  <p>⚠ {usersError}</p>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Họ Tên</th>
                        <th>Email</th>
                        <th>Trạng Thái</th>
                        <th>Vai Trò</th>
                        <th>Ngày Tham Gia</th>
                        <th>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => {
                        const roleNames = u.roles?.map(r => r.role_name).join(', ') || 'user';
                        return (
                          <tr key={u._id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--cyan)' }} />
                                ) : (
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 243, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)', fontWeight: 'bold' }}>
                                    {u.full_name?.charAt(0) || 'U'}
                                  </div>
                                )}
                                <strong>{u.full_name}</strong>
                              </div>
                            </td>
                            <td>{u.email}</td>
                            <td>
                              {u.is_verified ? (
                                <span className="badge badge--active">Đã xác thực</span>
                              ) : (
                                <span className="badge badge--ended">Chưa xác thực</span>
                              )}
                            </td>
                            <td>
                              <span style={{ color: roleNames.includes('admin') ? 'var(--magenta)' : 'var(--cyan)' }}>
                                {roleNames}
                              </span>
                            </td>
                            <td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                            <td>
                              <button className="action-btn">Sửa</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {usersList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      Không có người dùng nào.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'competitions' && (
            <div className="admin-panel">
              <div className="admin-panel__header">
                <h2>Quản Lý Cuộc Thi</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="admin-btn-primary" onClick={() => {
                    setCompetitionsList([]);
                    setCompetitionsError('');
                  }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M2.13 15.57a10 10 0 1 0 1.25-10.45l4.35 4.35"/>
                    </svg>
                    Làm Mới
                  </button>
                  <button className="admin-btn-primary" onClick={() => setShowCompModal(true)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Tạo Cuộc Thi
                  </button>
                </div>
              </div>

              {competitionsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <span className="admin-page__spinner" style={{ display: 'inline-block', width: '30px', height: '30px' }} />
                  <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Đang tải dữ liệu cuộc thi...</p>
                </div>
              ) : competitionsError ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--danger)' }}>
                  <p>⚠ {competitionsError}</p>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Tên Cuộc Thi</th>
                        <th>Trạng Thái</th>
                        <th>Mở Đăng Ký</th>
                        <th>Đóng Đăng Ký</th>
                        <th>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitionsList.map((comp) => {
                        let badgeClass = 'badge--ended';
                        let statusText = 'Lưu Nháp';
                        if (comp.status === 'registration') {
                          badgeClass = 'badge--active';
                          statusText = 'Mở Đăng Ký';
                        } else if (comp.status === 'in_progress' || comp.status === 'judging') {
                          badgeClass = 'badge--upcoming';
                          statusText = 'Đang Diễn Ra';
                        } else if (comp.status === 'completed') {
                          badgeClass = 'badge--ended';
                          statusText = 'Đã Kết Thúc';
                        }

                        return (
                          <tr key={comp._id}>
                            <td><strong>{comp.title}</strong></td>
                            <td>
                              <span className={`badge ${badgeClass}`}>{statusText}</span>
                            </td>
                            <td>{comp.registration_start ? new Date(comp.registration_start).toLocaleDateString('vi-VN') : 'N/A'}</td>
                            <td>{comp.registration_end ? new Date(comp.registration_end).toLocaleDateString('vi-VN') : 'N/A'}</td>
                            <td>
                              <button className="action-btn" onClick={() => {
                                setSelectedCompId(comp._id);
                                setActiveTab('manage_competition');
                              }}>Quản Lý</button>
                              <button className="action-btn" style={{ marginLeft: '8px' }}>Sửa</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {competitionsList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      Chưa có cuộc thi nào.
                    </div>
                  )}
                </div>
              )}

              {/* Create Competition Modal */}
              {showCompModal && (
                <div className="admin-modal-overlay">
                  <div className="admin-modal">
                    <div className="admin-modal__header">
                      <h3>Tạo Cuộc Thi Mới</h3>
                      <button className="admin-modal__close" onClick={() => setShowCompModal(false)}>×</button>
                    </div>
                    <form onSubmit={handleCreateCompetition} className="admin-modal__body">
                      {compSubmitError && <div className="admin-error-msg" style={{color: 'var(--danger)', marginBottom: '15px'}}>{compSubmitError}</div>}
                      
                      <div className="admin-form-group">
                        <label>Tên cuộc thi</label>
                        <input 
                          type="text" 
                          required 
                          value={compForm.title} 
                          onChange={(e) => setCompForm({...compForm, title: e.target.value})} 
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginTop: '5px' }}
                        />
                      </div>
                      
                      <div className="admin-form-group" style={{ marginTop: '15px' }}>
                        <label>Mô tả (tùy chọn)</label>
                        <textarea 
                          value={compForm.description} 
                          onChange={(e) => setCompForm({...compForm, description: e.target.value})} 
                          rows="3"
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginTop: '5px' }}
                        ></textarea>
                      </div>

                      <div className="admin-form-group" style={{ marginTop: '15px' }}>
                        <label>Số thành viên tối đa / đội</label>
                        <input 
                          type="number" 
                          min="1" max="20"
                          value={compForm.max_team_size} 
                          onChange={(e) => setCompForm({...compForm, max_team_size: parseInt(e.target.value)})} 
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginTop: '5px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" className="admin-btn-secondary" onClick={() => setShowCompModal(false)}>Hủy</button>
                        <button type="submit" className="admin-btn-primary" disabled={compSubmitting}>
                          {compSubmitting ? 'Đang tạo...' : 'Tạo Cuộc Thi'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manage_competition' && (
            <div className="admin-panel">
              <div className="admin-panel__header">
                <h2>Quản Lý Giải: {compDetails?.title || 'Đang tải...'}</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="admin-btn-secondary" onClick={() => setActiveTab('competitions')}>
                    ← Quay lại
                  </button>
                  <button className="admin-btn-primary" style={{ background: 'var(--hc-gold)', color: '#000' }} onClick={() => {
                    alert('Đang khởi tạo Github...');
                    // Add Github logic later
                  }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    Chốt Danh Sách & Tạo Github
                  </button>
                </div>
              </div>

              {managingCompLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <span className="admin-page__spinner" style={{ display: 'inline-block', width: '30px', height: '30px' }} />
                  <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Đang tải chi tiết...</p>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Tên Đội</th>
                        <th>Trưởng Đội</th>
                        <th>Số Lượng Thành Viên</th>
                        <th>Trạng Thái Điểm Danh</th>
                        <th>Github Repo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compTeams.map((team) => {
                        const checkedInCount = team.members?.filter(m => m.is_checked_in).length || 0;
                        const totalMembers = team.members?.length || 0;
                        const allCheckedIn = checkedInCount === totalMembers && totalMembers > 0;
                        
                        return (
                          <tr key={team._id}>
                            <td><strong>{team.team_name}</strong></td>
                            <td>{team.members?.find(m => m.is_leader)?.user_id?.full_name || 'N/A'}</td>
                            <td>{checkedInCount} / {totalMembers}</td>
                            <td>
                              {allCheckedIn ? (
                                <span className="badge badge--active">Đã chốt</span>
                              ) : (
                                <span className="badge badge--upcoming">Đang chờ ({checkedInCount}/{totalMembers})</span>
                              )}
                            </td>
                            <td>
                              {team.github_repo_url ? (
                                <a href={team.github_repo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>Xem Repo</a>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>Chưa có</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {compTeams.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      Chưa có đội nào đăng ký giải này.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'users' && activeTab !== 'competitions' && activeTab !== 'manage_competition' && (
            <div className="admin-panel admin-panel--empty">
              <div className="empty-state">
                <div className="empty-state__icon">🚧</div>
                <h3>Tính năng đang phát triển</h3>
                <p>Mô-đun {activeTab} sẽ sớm được cập nhật trong phiên bản tiếp theo.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
