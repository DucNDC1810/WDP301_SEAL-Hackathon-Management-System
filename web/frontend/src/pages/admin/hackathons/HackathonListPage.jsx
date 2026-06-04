import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HackathonListPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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
  open:   { label: 'Open',   cls: 'hl-badge--green'  },
  closed: { label: 'Closed', cls: 'hl-badge--red'    },
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN');
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
        <div className="hl-table-wrap">
          <table className="hl-table">
            <thead>
              <tr>
                <th>Tên cuộc thi</th>
                <th>Trạng thái</th>
                <th>Hạn đăng ký</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Vòng thi</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const st = STATUS_CFG[c.status] || STATUS_CFG.draft;
                return (
                  <tr key={c._id} className="hl-row">
                    <td className="hl-col-name">
                      <span className="hl-contest-name">{c.title}</span>
                      {c.description && <span className="hl-contest-desc">{c.description.slice(0,60)}{c.description.length>60?'…':''}</span>}
                    </td>
                    <td><span className={`hl-badge ${st.cls}`}>{st.label}</span></td>
                    <td className="hl-col-date"><Ico d={CAL} size={12} sw={2}/> {fmt(c.registration_deadline)}</td>
                    <td className="hl-col-date">{fmt(c.start_date)}</td>
                    <td className="hl-col-date">{fmt(c.end_date)}</td>
                    <td className="hl-col-center">{c.rounds?.length || 0}</td>
                    <td>
                      <div className="hl-actions">
                        <button className="hl-act-btn hl-act-btn--view"  title="Chi tiết" onClick={() => navigate(`/admin/hackathons/${c._id}`)}><Ico d={EYE}   size={14} sw={2}/></button>
                        <button className="hl-act-btn hl-act-btn--edit"  title="Chỉnh sửa" onClick={() => navigate(`/admin/hackathons/${c._id}/edit`)}><Ico d={EDIT}  size={14} sw={2}/></button>
                        <button className="hl-act-btn hl-act-btn--del"   title="Xóa" disabled={deleting===c._id} onClick={() => handleDelete(c._id, c.title)}><Ico d={TRASH} size={14} sw={2}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
