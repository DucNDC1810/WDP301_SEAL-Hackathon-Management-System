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
          <button className="btn-primary">Create Hackathon</button>
          <button className="btn-secondary">View All Events</button>
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
    </div>
  );
}
