import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const USERS = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'];
const CLOCK = ['M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z','M12 6v6l4 2'];
const CAL   = ['M8 2v4','M16 2v4','M3 10h18','M21 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z'];

const MOCK_CONTESTS = [
  { _id: 'm1', title: 'AI Innovation Challenge 2026', status: 'open',       teams: 156, category: 'AI/ML',      end: '15/6/2026' },
  { _id: 'm2', title: 'Web3 DeFi Hackathon',          status: 'inprogress', teams: 89,  category: 'Blockchain', end: '8/6/2026'  },
  { _id: 'm3', title: 'Mobile App Sprint',             status: 'judging',    teams: 124, category: 'Mobile',     end: '1/6/2026'  },
];

const STATUS_MAP = {
  open:       { label: 'Registration Open', cls: 'badge--green'  },
  inprogress: { label: 'In Progress',       cls: 'badge--blue'   },
  judging:    { label: 'Judging',           cls: 'badge--purple' },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    fetch(`${API_URL}/api/contests`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success && d.data?.length) setContests(d.data); })
      .catch(() => {});
  }, []);

  const displayContests = contests.length > 0
    ? contests.map(c => {
        const now = new Date();
        const reg   = c.registration_deadline ? new Date(c.registration_deadline) : null;
        const end   = c.end_date   ? new Date(c.end_date)   : null;
        const start = c.start_date ? new Date(c.start_date) : null;
        let status = 'open';
        if (start && start < now && end && end > now) status = 'inprogress';
        else if (end && end < now) status = 'judging';
        return { ...c, _status: status, teams: c.max_teams_per_pool || '—', category: c.category || 'General', end: reg ? reg.toLocaleDateString('vi-VN') : '—' };
      })
    : MOCK_CONTESTS.map(c => ({ ...c, _status: c.status }));

  return (
    <div className="ad-main">
      {/* Hero */}
      <section className="ad-hero">
        <h1 className="ad-hero-title">SEAL Hackathon</h1>
        <p className="ad-hero-sub">Innovation Powered by AI • FPT University Competition Platform</p>
        <div className="ad-hero-btns">
          <button className="btn-primary" onClick={() => navigate('/admin/contest/create')}>
            Create Hackathon
          </button>
          <button className="btn-outline">View All Events</button>
        </div>
      </section>

      {/* Active Hackathons */}
      <section className="ad-panel">
        <h2 className="ad-panel-title">Active Hackathons</h2>
        <div className="ad-contest-list">
          {displayContests.map(c => {
            const st = STATUS_MAP[c._status] || STATUS_MAP.open;
            return (
              <div className="ad-contest-card" key={c._id}>
                <div className="ad-contest-info">
                  <div className="ad-contest-row1">
                    <span className="ad-contest-name">{c.title}</span>
                    <span className={`ad-badge ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="ad-contest-meta">
                    <span><Ico d={USERS} size={12} sw={2}/> {c.teams} teams</span>
                    <span><Ico d={CAL}   size={12} sw={2}/> {c.category}</span>
                    <span><Ico d={CLOCK} size={12} sw={2}/> Ends {c.end}</span>
                  </div>
                </div>
                <button className="btn-manage"
                  onClick={() => contests.length > 0 && navigate(`/admin/contests/${c._id}/dashboard`)}>
                  Manage
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
