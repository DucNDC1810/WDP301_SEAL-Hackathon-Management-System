import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';

const API_URL = import.meta.env.VITE_API_URL || '';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const USERS  = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'];
const TROPHY = ['M6 9H3.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h2.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M18 2H6v7a6 6 0 0 0 12 0V2z'];
const CLOCK  = ['M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z', 'M12 6v6l4 2'];
const ARROW  = 'M5 12h14M12 5l7 7-7 7';
const SEARCH = ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'];

const STATUS_MAP = {
  open:       { label: 'Registration Open', color: '#10b981' },
  inprogress: { label: 'In Progress',       color: '#00d4ff' },
  judging:    { label: 'Judging',           color: '#a855f7' },
  closed:     { label: 'Closed',            color: '#6b7280' },
};

function getStatus(c) {
  const now = new Date();
  const reg   = c.registration_deadline ? new Date(c.registration_deadline) : null;
  const end   = c.end_date   ? new Date(c.end_date)   : null;
  const start = c.start_date ? new Date(c.start_date) : null;
  if (end && end < now) return 'closed';
  if (start && start < now && end && end > now) return 'inprogress';
  if (reg && reg < now) return 'closed';
  return 'open';
}

export default function TeamRegistrationPage() {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    fetch(`${API_URL}/api/contests`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setContests(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = contests.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 min-h-screen bg-[#060b16] text-[#c9d6e8]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Team Registration</h1>
          <p className="text-white/50 text-sm">Quản lý đăng ký đội thi theo từng cuộc thi</p>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2">
          <Ico d={SEARCH} size={15} sw={2} />
          <input
            className="bg-transparent text-sm text-white/80 placeholder-white/25 outline-none w-44"
            placeholder="Tìm kiếm cuộc thi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-white/20 mb-4 flex justify-center"><Ico d={TROPHY} size={48} sw={1.2} /></div>
          <p className="text-white/50 mb-4">{search ? 'Không tìm thấy cuộc thi nào.' : 'Chưa có cuộc thi nào. Hãy tạo cuộc thi mới!'}</p>
          {!search && (
            <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black border-none cursor-pointer hover:opacity-90"
              onClick={() => navigate('/admin/contest/create')}>
              + Tạo cuộc thi
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => {
            const status = getStatus(c);
            const st = STATUS_MAP[status] || STATUS_MAP.open;
            const deadline = c.registration_deadline
              ? new Date(c.registration_deadline).toLocaleDateString('vi-VN') : '—';
            return (
              <div key={c._id} className="bg-white/[0.025] border border-white/7 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/15 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.08)] flex items-center justify-center text-[#00d4ff]">
                    <Ico d={TROPHY} size={20} sw={1.5} />
                  </div>
                  <span className="text-[0.68rem] font-bold px-2.5 py-1 rounded-full"
                    style={{ color: st.color, background: `${st.color}18`, border: `1px solid ${st.color}33` }}>
                    {st.label}
                  </span>
                </div>
                <h3 className="font-bold text-white text-[0.95rem]">{c.title}</h3>
                {c.description && (
                  <p className="text-xs text-white/40 leading-relaxed">
                    {c.description.slice(0, 80)}{c.description.length > 80 ? '…' : ''}
                  </p>
                )}
                <div className="flex flex-col gap-1.5 text-xs text-white/40">
                  <div className="flex items-center gap-1.5"><Ico d={USERS} size={12} sw={2} />{c.max_teams_per_pool ? `${c.max_teams_per_pool} teams/pool` : 'Không giới hạn'}</div>
                  <div className="flex items-center gap-1.5"><Ico d={CLOCK} size={12} sw={2} />Hạn: {deadline}</div>
                </div>
                <button
                  className="mt-auto flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black border-none cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => navigate(`/admin/contests/${c._id}/dashboard`)}
                >
                  Quản lý đội thi <Ico d={ARROW} size={13} sw={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
