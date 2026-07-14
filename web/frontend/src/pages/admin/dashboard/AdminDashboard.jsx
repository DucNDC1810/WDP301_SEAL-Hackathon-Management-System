import { useState, useEffect } from 'react';
import './AdminDashboard.css';
import { notification } from 'antd';

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
const INFO = 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01';

const STATUS_LABEL = { draft: 'Nháp', open: 'Mở đăng ký', closed: 'Đã đóng' };
const STATUS_COLOR = { draft: '#a0aec0', open: '#00d4ff', closed: '#a855f7' };

const ACTION_LABEL = {
  CREATE: 'đã tạo mới',
  UPDATE: 'đã cập nhật',
  DELETE: 'đã xóa',
  APPROVE: 'đã duyệt',
  REJECT: 'đã từ chối',
  ASSIGN_ROLE: 'đã gán vai trò cho',
  REMOVE_ROLE: 'đã gỡ vai trò của',
  DISQUALIFY: 'đã loại',
};

const RESOURCE_LABEL = {
  USER: 'người dùng', TEAM: 'đội thi', CONTEST: 'cuộc thi', POOL: 'bảng thi',
  TOPIC: 'đề tài', SCORE: 'điểm số', RANKING: 'bảng xếp hạng', INVITATION: 'lời mời',
  MENTOR_ASSIGNMENT: 'phân công mentor', APPEAL: 'khiếu nại', NOTIFICATION: 'thông báo',
  SUBMISSION: 'bài nộp', ROUND: 'vòng thi',
};

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  return `${day} ngày trước`;
};

export default function AdminDashboard() {
  const [hackathons, setHackathons] = useState([]);
  const [metrics, setMetrics] = useState({
    activeHackathons: 0,
    totalParticipants: 0,
    teamsRegistered: 0,
    pendingApprovals: 0,
  });
  const [feedItems, setFeedItems] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [nextDeadline, setNextDeadline] = useState(null); // { label, date }
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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
      notification.warning({
        message: 'Thiếu thông tin',
        description: 'Vui lòng nhập đầy đủ tiêu đề và nội dung.',
      });
      return;
    }
    setSendingBroadcast(true);
    try {
      const users = await getUsersForBroadcast(broadcastRole);
      const userIds = users.map(u => u._id);
      if (userIds.length === 0) {
        notification.warning({
          message: 'Không tìm thấy người dùng',
          description: 'Không tìm thấy người dùng nào thuộc nhóm đã chọn.',
        });
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
      
      notification.success({
        message: 'Thành công',
        description: `Đã gửi thông báo thành công tới ${userIds.length} người dùng!`,
      });
      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Lỗi',
        description: err.message || "Lỗi xảy ra khi gửi thông báo.",
      });
    } finally {
      setSendingBroadcast(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [contestsRes, studentsRes, pendingTeamsRes, auditRes] = await Promise.all([
        fetch(`${API_URL}/api/contests`, { headers: hdrs() }).then(r => r.json()),
        fetch(`${API_URL}/api/users?role=contestant&limit=1`, { headers: hdrs() }).then(r => r.json()),
        fetch(`${API_URL}/api/teams/all-pending`, { headers: hdrs() }).then(r => r.json()),
        fetch(`${API_URL}/api/audit-logs?limit=10`, { headers: hdrs() }).then(r => r.json()),
      ]);

      const contests = contestsRes.data || [];

      // Số đội đăng ký ở từng cuộc thi (chỉ gọi cho các cuộc thi chưa đóng để giảm số request)
      const teamCounts = await Promise.all(
        contests.map(async (c) => {
          try {
            const res = await fetch(`${API_URL}/api/teams/contests/${c._id}/all`, { headers: hdrs() });
            if (!res.ok) return 0;
            const json = await res.json();
            return json.count ?? (json.data ? json.data.length : 0);
          } catch {
            return 0;
          }
        })
      );
      const teamsRegistered = teamCounts.reduce((sum, n) => sum + n, 0);

      setMetrics({
        activeHackathons: contests.filter((c) => c.status === 'open').length,
        totalParticipants: studentsRes.total ?? 0,
        teamsRegistered,
        pendingApprovals: pendingTeamsRes.count ?? (pendingTeamsRes.data || []).length,
      });

      // Danh sách cuộc thi hiển thị: ưu tiên đang mở đăng ký/diễn ra, mới nhất trước
      const displayList = contests
        .filter((c) => c.status !== 'closed')
        .slice(0, 5)
        .map((c, idx) => {
          const activeRound = (c.rounds || []).find((r) => r.is_active);
          return {
            id: c._id,
            name: c.title,
            status: STATUS_LABEL[c.status] || c.status,
            statusColor: STATUS_COLOR[c.status] || '#00d4ff',
            teams: teamCounts[idx] || 0,
            roundInfo: activeRound ? activeRound.name : 'Chưa kích hoạt vòng thi',
            deadlineText: c.registration_deadline
              ? `Hạn đăng ký: ${new Date(c.registration_deadline).toLocaleDateString('vi-VN')}`
              : (c.end_date ? `Kết thúc: ${new Date(c.end_date).toLocaleDateString('vi-VN')}` : 'Chưa đặt lịch'),
          };
        });
      setHackathons(displayList);

      // Deadline gần nhất trong tương lai (đăng ký hoặc nộp bài của vòng đang chạy)
      const now = Date.now();
      const candidates = [];
      contests.forEach((c) => {
        if (c.registration_deadline && new Date(c.registration_deadline).getTime() > now) {
          candidates.push({ label: `Hạn đăng ký — ${c.title}`, date: c.registration_deadline });
        }
        (c.rounds || []).forEach((r) => {
          if (r.submission_deadline && new Date(r.submission_deadline).getTime() > now) {
            candidates.push({ label: `Hạn nộp bài — ${c.title} (${r.name})`, date: r.submission_deadline });
          }
        });
      });
      candidates.sort((a, b) => new Date(a.date) - new Date(b.date));
      setNextDeadline(candidates[0] || null);

      // Hoạt động gần đây từ Audit Log thật của hệ thống
      const logs = auditRes.data || [];
      setFeedItems(
        logs.slice(0, 4).map((log) => ({
          id: log._id,
          type: log.status === 'failure' ? 'warning' : (log.action?.includes('DELETE') || log.action?.includes('REJECT') ? 'warning' : 'success'),
          text: `${log.actor_email || 'Hệ thống'} ${ACTION_LABEL[log.action] || log.action.toLowerCase()} ${RESOURCE_LABEL[log.resource] || log.resource.toLowerCase()}`,
          time: timeAgo(log.created_at),
        }))
      );
      setAnnouncements(
        logs.slice(0, 3).map((log) => ({
          id: log._id,
          title: `${RESOURCE_LABEL[log.resource] || log.resource}: ${ACTION_LABEL[log.action] || log.action}`,
          time: timeAgo(log.created_at),
        }))
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đếm ngược tới deadline gần nhất, cập nhật mỗi giây
  useEffect(() => {
    if (!nextDeadline) return;
    const tick = () => {
      const ms = Math.max(0, new Date(nextDeadline.date).getTime() - Date.now());
      const totalSeconds = Math.floor(ms / 1000);
      setCountdown({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };
    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [nextDeadline]);

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
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Participants</span>
            <span className="metric-icon"><Ico d={USERS} size={20} sw={1.8} /></span>
          </div>
          <div className="metric-value">{metrics.totalParticipants.toLocaleString()}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Teams Registered</span>
            <span className="metric-icon"><Ico d={TEAM} size={20} sw={1.8} /></span>
          </div>
          <div className="metric-value">{metrics.teamsRegistered}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Pending Team Approvals</span>
            <span className="metric-icon"><Ico d={CHECK} size={20} sw={1.8} /></span>
          </div>
          <div className="metric-value">{metrics.pendingApprovals}</div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="dashboard-grid">
        {/* Left: Active Hackathons */}
        <div className="dashboard-section">
          <h2 className="section-title">Active Hackathons</h2>
          <div className="hackathons-list">
            {hackathons.length === 0 && (
              <p style={{ color: '#a0aec0' }}>Chưa có cuộc thi nào đang mở.</p>
            )}
            {hackathons.map((h) => (
              <div key={h.id} className="hackathon-card">
                <div className="hackathon-header">
                  <div className="hackathon-title">
                    <div className="hackathon-icon"><Ico d={TROPHY} size={20} sw={1.8} /></div>
                    <div>
                      <h3>{h.name}</h3>
                      <div className="hackathon-meta">
                        <span><Ico d={TEAM} size={14} sw={1.5} /> {h.teams} teams</span>
                        <span><Ico d={ZETA} size={14} sw={1.5} /> {h.roundInfo}</span>
                        <span><Ico d={BELL} size={14} sw={1.5} /> {h.deadlineText}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hackathon-status">
                    <span className="status-badge" style={{ borderLeftColor: h.statusColor }}>
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
            {nextDeadline ? (
              <>
                <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: '0 0 8px' }}>{nextDeadline.label}</p>
                <div className="countdown">
                  <div className="countdown-item">
                    <div className="countdown-value">{countdown.days}</div>
                    <div className="countdown-label">DAYS</div>
                  </div>
                  <div className="countdown-item">
                    <div className="countdown-value">{String(countdown.hours).padStart(2, '0')}</div>
                    <div className="countdown-label">HOURS</div>
                  </div>
                  <div className="countdown-item">
                    <div className="countdown-value">{String(countdown.minutes).padStart(2, '0')}</div>
                    <div className="countdown-label">MINUTES</div>
                  </div>
                  <div className="countdown-item">
                    <div className="countdown-value">{String(countdown.seconds).padStart(2, '0')}</div>
                    <div className="countdown-label">SECONDS</div>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ color: '#a0aec0' }}>Không có deadline sắp tới.</p>
            )}
          </div>

          {/* Activity Feed — nguồn từ Audit Log thật của hệ thống */}
          <div className="sidebar-card activity-feed">
            <div className="card-header">
              <span className="card-icon"><Ico d={ZETA} size={16} sw={1.8} /></span>
              <h3>Recent Activity</h3>
              <span className="card-badge">Live</span>
            </div>
            <div className="feed-items">
              {feedItems.length === 0 && (
                <p style={{ color: '#a0aec0', fontSize: '0.85rem' }}>Chưa có hoạt động nào được ghi nhận.</p>
              )}
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

          {/* Recent Admin Actions — nguồn từ Audit Log thật của hệ thống */}
          <div className="sidebar-card announcements">
            <div className="card-header">
              <span className="card-icon"><Ico d={INFO} size={16} sw={1.8} /></span>
              <h3>Recent Admin Actions</h3>
            </div>
            <div className="announcements-list">
              {announcements.length === 0 && (
                <p style={{ color: '#a0aec0', fontSize: '0.85rem' }}>Chưa có hoạt động nào được ghi nhận.</p>
              )}
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
