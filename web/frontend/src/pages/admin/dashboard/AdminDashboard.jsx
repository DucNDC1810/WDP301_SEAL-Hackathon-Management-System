import { useState, useEffect } from 'react';
import './AdminDashboard.css';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

// Icons
const TROPHY = ['M6 9H3.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h2.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M18 2H6v7a6 6 0 0 0 12 0V2z'];
const USERS = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'];
const TEAM = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'];
const CHECK = 'M22 11.08V12a10 10 0 1 1-5.93-9.14';
const ZETA = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';
const BELL = 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0';
const ALERT = 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z';
const INFO = 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01';

export default function AdminDashboard() {
  const [hackathons, setHackathons] = useState([]);
  const [metrics, setMetrics] = useState({
    activeHackathons: 12,
    totalParticipants: 1247,
    teamsRegistered: 342,
    aiTasksCompleted: 856
  });
  const [feedItems, setFeedItems] = useState([
    { id: 1, type: 'success', text: 'AI analyzed 5 new submissions', time: '2 min ago' },
    { id: 2, type: 'success', text: 'Deadline reminder emails sent to 12 teams', time: '15 min ago' },
    { id: 3, type: 'info', text: 'Interview questions generated for Team Alpha', time: '1 hour ago' },
    { id: 4, type: 'warning', text: 'Missing submission alert triggered', time: '2 hours ago' }
  ]);
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'Final Round Starts Tomorrow', time: '3 hours ago' },
    { id: 2, title: 'Mentor Office Hours Extended', time: '1 day ago' },
    { id: 3, title: 'New Judging Criteria Published', time: '2 days ago' }
  ]);

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastRole, setBroadcastRole] = useState('all');
  const [broadcastType, setBroadcastType] = useState('general');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';
  const hdrs = () => ({
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  });

  const getUsersForBroadcast = async (role) => {
    let url = `${API_URL}/api/users?limit=10000`;
    if (role && role !== 'all') {
      url = `${API_URL}/api/users?role=${role}&limit=10000`;
    }
    const res = await fetch(url, { headers: hdrs() });
    if (!res.ok) throw new Error("Không thể tải danh sách người dùng");
    const json = await res.json();
    return json.data || [];
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      alert("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
      return;
    }
    setSendingBroadcast(true);
    try {
      const users = await getUsersForBroadcast(broadcastRole);
      const userIds = users.map(u => u._id);
      if (userIds.length === 0) {
        alert("Không tìm thấy người dùng nào thuộc nhóm đã chọn.");
        return;
      }
      
      const payload = {
        user_ids: userIds,
        type: broadcastType,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim()
      };
      
      const response = await fetch(`${API_URL}/api/notifications/broadcast`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.message || "Gửi thông báo thất bại");
      }
      
      alert(`Đã gửi thông báo thành công tới ${userIds.length} người dùng!`);
      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err) {
      console.error(err);
      alert(err.message || "Lỗi xảy ra khi gửi thông báo.");
    } finally {
      setSendingBroadcast(false);
    }
  };

  useEffect(() => {
    // Fetch data from API
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data - replace with actual API calls
      setHackathons([
        {
          id: 1,
          name: 'AI Innovation Challenge 2026',
          status: 'Registration Open',
          teams: 156,
          startDate: 'AI/ML',
          endDate: 'Ends 15/6/2026',
          icon: '🤖'
        },
        {
          id: 2,
          name: 'Web3 DeFi Hackathon',
          status: 'In Progress',
          teams: 89,
          startDate: 'Blockchain',
          endDate: 'Ends 8/6/2026',
          icon: '⛓️'
        },
        {
          id: 3,
          name: 'Mobile App Sprint',
          status: 'Judging',
          teams: 124,
          startDate: 'Mobile',
          endDate: 'Ends 1/6/2026',
          icon: '📱'
        }
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Registration Open':
        return '#00d4ff';
      case 'In Progress':
        return '#00d4ff';
      case 'Judging':
        return '#a855f7';
      default:
        return '#00d4ff';
    }
  };

  return (
    <div className="dashboard-main">
      {/* ── Header ── */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>SEAL Hackathon</h1>
          <p>Innovation Powered by AI • FPT University Competition Platform</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-primary" onClick={() => setShowBroadcastModal(true)}>📢 Gửi thông báo</button>
          <button className="btn-secondary">Create Hackathon</button>
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Active Hackathons</span>
            <span className="metric-icon"><Ico d={TROPHY} size={20} sw={1.8} /></span>
          </div>
          <div className="metric-value">{metrics.activeHackathons}</div>
          <div className="metric-change">↑ 12%</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Participants</span>
            <span className="metric-icon"><Ico d={USERS} size={20} sw={1.8} /></span>
          </div>
          <div className="metric-value">{metrics.totalParticipants.toLocaleString()}</div>
          <div className="metric-change">↑ 8%</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Teams Registered</span>
            <span className="metric-icon"><Ico d={TEAM} size={20} sw={1.8} /></span>
          </div>
          <div className="metric-value">{metrics.teamsRegistered}</div>
          <div className="metric-change">↑ 12%</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">AI Tasks Completed</span>
            <span className="metric-icon"><Ico d={CHECK} size={20} sw={1.8} /></span>
          </div>
          <div className="metric-value">{metrics.aiTasksCompleted}</div>
          <div className="metric-change">↑ 23%</div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="dashboard-grid">
        {/* Left: Active Hackathons */}
        <div className="dashboard-section">
          <h2 className="section-title">Active Hackathons</h2>
          <div className="hackathons-list">
            {hackathons.map((h) => (
              <div key={h.id} className="hackathon-card">
                <div className="hackathon-header">
                  <div className="hackathon-title">
                    <div className="hackathon-icon">{h.icon}</div>
                    <div>
                      <h3>{h.name}</h3>
                      <div className="hackathon-meta">
                        <span><Ico d={TEAM} size={14} sw={1.5} /> {h.teams} teams</span>
                        <span><Ico d={ZETA} size={14} sw={1.5} /> {h.startDate}</span>
                        <span><Ico d={BELL} size={14} sw={1.5} /> {h.endDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hackathon-status">
                    <span className="status-badge" style={{ borderLeftColor: getStatusColor(h.status) }}>
                      {h.status}
                    </span>
                  </div>
                </div>
                <button className="btn-manage">Manage</button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="dashboard-sidebar">
          {/* Next Deadline */}
          <div className="sidebar-card next-deadline">
            <div className="card-header">
              <span className="card-icon"><Ico d={BELL} size={16} sw={1.8} /></span>
              <h3>Next Deadline</h3>
            </div>
            <div className="countdown">
              <div className="countdown-item">
                <div className="countdown-value">11</div>
                <div className="countdown-label">DAYS</div>
              </div>
              <div className="countdown-item">
                <div className="countdown-value">20</div>
                <div className="countdown-label">HOURS</div>
              </div>
              <div className="countdown-item">
                <div className="countdown-value">07</div>
                <div className="countdown-label">MINUTES</div>
              </div>
              <div className="countdown-item">
                <div className="countdown-value">35</div>
                <div className="countdown-label">SECONDS</div>
              </div>
            </div>
          </div>

          {/* AI Activity Feed */}
          <div className="sidebar-card activity-feed">
            <div className="card-header">
              <span className="card-icon"><Ico d={ZETA} size={16} sw={1.8} /></span>
              <h3>AI Activity Feed</h3>
              <span className="card-badge">Active</span>
            </div>
            <div className="feed-items">
              {feedItems.map((item) => (
                <div key={item.id} className={`feed-item feed-${item.type}`}>
                  <span className="feed-dot"></span>
                  <div className="feed-content">
                    <p>{item.text}</p>
                    <span className="feed-time">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="sidebar-card announcements">
            <div className="card-header">
              <span className="card-icon"><Ico d={INFO} size={16} sw={1.8} /></span>
              <h3>Recent Announcements</h3>
            </div>
            <div className="announcements-list">
              {announcements.map((item) => (
                <div key={item.id} className="announcement-item">
                  <div className="announcement-icon"><Ico d={INFO} size={14} sw={1.5} /></div>
                  <div className="announcement-content">
                    <p>{item.title}</p>
                    <span className="announcement-time">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showBroadcastModal && (
        <div className="broadcast-modal-overlay">
          <div className="broadcast-modal">
            <div className="broadcast-modal__header">
              <h2>📢 Gửi thông báo hệ thống</h2>
              <button className="broadcast-modal__close" onClick={() => setShowBroadcastModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSendBroadcast} className="broadcast-modal__form">
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#a0aec0' }}>Đối tượng nhận:</label>
                <select 
                  value={broadcastRole} 
                  onChange={(e) => setBroadcastRole(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="all">Toàn bộ người dùng</option>
                  <option value="student">Thí sinh (Student)</option>
                  <option value="judge">Giám khảo (Judge)</option>
                  <option value="mentor">Cố vấn (Mentor)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#a0aec0' }}>Loại thông báo:</label>
                <select 
                  value={broadcastType} 
                  onChange={(e) => setBroadcastType(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="general">Thông báo chung</option>
                  <option value="finalist_announcement">Chung kết</option>
                  <option value="deadline_reminder">Nhắc nhở deadline</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#a0aec0' }}>Tiêu đề:</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề thông báo..."
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#a0aec0' }}>Nội dung:</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Nhập nội dung thông báo chi tiết..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px', color: '#fff', resize: 'vertical' }}
                />
              </div>

              <div className="broadcast-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowBroadcastModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={sendingBroadcast}>
                  {sendingBroadcast ? 'Đang gửi...' : 'Gửi thông báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
