import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HackathonListPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const PLUS   = ['M12 5v14','M5 12h14'];
const SEARCH = ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z','M21 21l-4.35-4.35'];
const EDIT   = ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'];
const TRASH  = ['M3 6h18','M8 6V4h8v2','M19 6l-1 14H6L5 6'];
const EYE    = ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'];
const CAL    = ['M8 2v4','M16 2v4','M3 10h18','M21 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z'];

const STATUS_CFG = {
  draft:  { label: 'Draft',  cls: 'hl-badge--gray'   },
  open:   { label: 'Ongoing',cls: 'hl-badge--green'  },
  closed: { label: 'Closed', cls: 'hl-badge--red'    },
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export default function HackathonListPage() {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const token = () => localStorage.getItem('accessToken');

  const fetchContests = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/contests`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json();
      if (d.success) setContests(d.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchContests(); }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Xóa cuộc thi "${title}"?`)) return;
    setDeleting(id);
    try {
      const r = await fetch(`${API_URL}/api/contests/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json();
      if (d.success) setContests(prev => prev.filter(c => c._id !== id));
    } finally { setDeleting(null); }
  };

  // Helper to load customized config (banner, season, year) for each contest
  const getCustomConfig = (contestId) => {
    const saved = localStorage.getItem(`hackathon_config_${contestId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  };

  const filtered = contests.filter(c => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="hl-page">
      <div className="hl-header">
        <div>
          <h1 className="hl-title">Hackathons</h1>
          <p className="hl-subtitle">Quản lý tất cả cuộc thi</p>
        </div>
        <button className="hl-btn-create" onClick={() => navigate('/admin/contest/create')}>
          <Ico d={PLUS} size={16} sw={2.5} /> Tạo cuộc thi
        </button>
      </div>

      <div className="hl-toolbar">
        <div className="hl-search-wrap">
          <Ico d={SEARCH} size={15} sw={2} />
          <input className="hl-search" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="hl-filters">
          {['all','draft','open','closed'].map(s => (
            <button key={s} className={`hl-filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s === 'all' ? 'Tất cả' : STATUS_CFG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="hl-loading"><div className="hl-spinner" /><span>Đang tải...</span></div>
      ) : filtered.length === 0 ? (
        <div className="hl-empty">Không có cuộc thi nào.</div>
      ) : (
        <div className="hl-grid">
          {filtered.map(c => {
            const st = STATUS_CFG[c.status] || STATUS_CFG.draft;
            const custom = getCustomConfig(c._id);
            const bannerUrl = custom?.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
            const season = custom?.season || 'Summer';
            const year = custom?.year || 2026;
            const roundsCount = custom?.tracks?.reduce((sum, t) => sum + (t.rounds?.length || 0), 0) || c.rounds?.length || 0;

            return (
              <div key={c._id} className="hl-card">
                {/* Banner image wrapper */}
                <div className="hl-card-banner-wrap">
                  <img 
                    src={bannerUrl} 
                    alt={c.title} 
                    className="hl-card-banner"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600'; }}
                  />
                  <div className="hl-card-badge-overlay">
                    <span className={`hl-badge ${st.cls}`}>{st.label}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="hl-card-body">
                  <div className="hl-card-meta-row">
                    <span className="hl-card-season">{season} {year}</span>
                    <span className="hl-card-rounds-count">🛡️ {roundsCount} Vòng thi</span>
                  </div>
                  <h3 className="hl-card-title">{c.title}</h3>
                  <p className="hl-card-desc">
                    {c.description ? c.description : 'Không có mô tả cho cuộc thi này.'}
                  </p>

                  <div className="hl-card-dates">
                    <div className="hl-card-date-item">
                      <span className="hl-date-label">Hạn đăng ký:</span>
                      <span className="hl-date-val"><Ico d={CAL} size={11} /> {fmt(c.registration_deadline)}</span>
                    </div>
                    <div className="hl-card-date-item">
                      <span className="hl-date-label">Thi đấu chính thức:</span>
                      <span className="hl-date-val"><Ico d={CAL} size={11} /> {fmt(c.start_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="hl-card-footer">
                  <div className="hl-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <button className="hl-act-btn hl-act-btn--view" title="Cấu hình & Chi tiết" onClick={() => navigate(`/admin/hackathons/${c._id}`)}>
                      <Ico d={EYE} size={14} sw={2}/> <span>Cấu hình</span>
                    </button>
                    <button className="hl-act-btn hl-act-btn--del" title="Xóa" disabled={deleting===c._id} onClick={() => handleDelete(c._id, c.title)}>
                      <Ico d={TRASH} size={14} sw={2}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
