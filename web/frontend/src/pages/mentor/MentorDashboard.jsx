import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../admin/AdminDashboard.css'; // Reuse some admin styles for layout

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function MentorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assignments');
  const [user, setUser] = useState(null);
  
  // Dummy data for visual presentation since API isn't built yet
  const [assignments, setAssignments] = useState([
    {
      _id: '1',
      team: { team_name: 'Cyber Punx' },
      project: { project_name: 'AI Scanner', repo_url: '#', demo_url: '#' },
      status: 'pending'
    },
    {
      _id: '2',
      team: { team_name: 'Neon Runners' },
      project: { project_name: 'Neon API', repo_url: '#', demo_url: '#' },
      status: 'scored'
    }
  ]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    else navigate('/login');
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <span>⬡</span> SEAL Mentor
        </div>
        <nav className="admin-nav">
          <button
            className={`admin-nav__item ${activeTab === 'assignments' ? 'admin-nav__item--active' : ''}`}
            onClick={() => { setActiveTab('assignments'); setSelectedAssignment(null); }}
          >
            📋 Chấm Thi
          </button>
          <button
            className={`admin-nav__item ${activeTab === 'history' ? 'admin-nav__item--active' : ''}`}
            onClick={() => { setActiveTab('history'); setSelectedAssignment(null); }}
          >
            🕒 Lịch Sử
          </button>
        </nav>
        <div className="admin-sidebar__footer">
          <div className="admin-user-info">
            <span className="admin-user-info__name">{user?.full_name || 'Mentor'}</span>
            <span className="badge badge--active">Mentor</span>
          </div>
          <button onClick={handleLogout} className="admin-logout-btn">Đăng xuất</button>
        </div>
      </aside>

      <main className="admin-content">
        <header className="admin-header">
          <h1>{activeTab === 'assignments' ? 'Danh sách Bài thi cần chấm' : 'Lịch sử chấm thi'}</h1>
        </header>

        <div className="admin-panel">
          {!selectedAssignment ? (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Đội Thi</th>
                    <th>Dự Án</th>
                    <th>Tài Liệu</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a._id}>
                      <td><strong>{a.team.team_name}</strong></td>
                      <td>{a.project.project_name}</td>
                      <td>
                        <a href={a.project.repo_url} style={{ marginRight: '10px', color: 'var(--primary)' }}>[Code]</a>
                        <a href={a.project.demo_url} style={{ color: 'var(--secondary)' }}>[Demo]</a>
                      </td>
                      <td>
                        <span className={`badge ${a.status === 'scored' ? 'badge--active' : 'badge--upcoming'}`}>
                          {a.status === 'scored' ? 'Đã chấm' : 'Chưa chấm'}
                        </span>
                      </td>
                      <td>
                        <button className="action-btn" onClick={() => setSelectedAssignment(a)}>
                          {a.status === 'scored' ? 'Xem điểm' : 'Chấm điểm'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rubric-form" style={{ padding: '20px' }}>
              <h2>Chấm điểm: {selectedAssignment.team.team_name}</h2>
              <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Điểm Code / Kiến trúc (Max: 10)</label>
                  <input type="number" min="0" max="10" className="cd-form__input" style={{ width: '100px' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Ý tưởng sáng tạo (Max: 10)</label>
                  <input type="number" min="0" max="10" className="cd-form__input" style={{ width: '100px' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Nhận xét (Feedback)</label>
                  <textarea className="cd-form__input" rows="4"></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="admin-btn-primary" onClick={() => setSelectedAssignment(null)}>Lưu Điểm</button>
                  <button className="action-btn" onClick={() => setSelectedAssignment(null)}>Quay Lại</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default MentorDashboard;
