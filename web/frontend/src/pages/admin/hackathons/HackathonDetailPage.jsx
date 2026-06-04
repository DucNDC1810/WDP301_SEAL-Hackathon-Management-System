import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './HackathonDetailPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const tok = () => localStorage.getItem('accessToken');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });
const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const Ico = ({ d, size = 16, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const PLUS   = ['M12 5v14','M5 12h14'];
const BACK   = ['M19 12H5','M12 5l-7 7 7 7'];
const TRASH  = ['M3 6h18','M8 6V4h8v2','M19 6l-1 14H6L5 6'];
const SAVE   = ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z','M17 21v-8H7v8','M7 3v5h8'];

const STATUS_CFG = { draft: { label:'Draft', cls:'hd-badge--gray' }, open: { label:'Open', cls:'hd-badge--green' }, closed: { label:'Closed', cls:'hd-badge--red' } };

const TABS = ['Tổng quan','Vòng thi & Tiêu chí','Bảng thi (Track)','Sự kiện'];

export default function HackathonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [pools, setPools]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(0);

  // Round form
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [roundForm, setRoundForm] = useState({ round_number:'', name:'', start_time:'', end_time:'' });
  const [savingRound, setSavingRound] = useState(false);

  // Criteria form
  const [criteriaRoundId, setCriteriaRoundId] = useState(null);
  const [criteriaForm, setCriteriaForm] = useState({ name:'', max_score:10, weight:1, description:'' });
  const [savingCriteria, setSavingCriteria] = useState(false);

  const fetchContest = async () => {
    const r = await fetch(`${API_URL}/api/contests/${id}`, { headers: hdrs() });
    const d = await r.json();
    if (d.success) setContest(d.data);
  };

  const fetchPools = async () => {
    const r = await fetch(`${API_URL}/api/pools/contests/${id}/pools`, { headers: hdrs() });
    const d = await r.json();
    if (d.success) setPools(d.data || []);
  };

  useEffect(() => {
    Promise.all([fetchContest(), fetchPools()]).finally(() => setLoading(false));
  }, [id]);

  const addRound = async e => {
    e.preventDefault();
    setSavingRound(true);
    try {
      const r = await fetch(`${API_URL}/api/contests/${id}/rounds`, { method:'POST', headers: hdrs(), body: JSON.stringify({ ...roundForm, round_number: Number(roundForm.round_number) }) });
      const d = await r.json();
      if (d.success) { await fetchContest(); setShowRoundForm(false); setRoundForm({ round_number:'', name:'', start_time:'', end_time:'' }); }
    } finally { setSavingRound(false); }
  };

  const addCriteria = async e => {
    e.preventDefault();
    setSavingCriteria(true);
    try {
      const r = await fetch(`${API_URL}/api/contests/${id}/rounds/${criteriaRoundId}/criteria`, { method:'POST', headers: hdrs(), body: JSON.stringify({ ...criteriaForm, max_score: Number(criteriaForm.max_score), weight: Number(criteriaForm.weight) }) });
      const d = await r.json();
      if (d.success) { await fetchContest(); setCriteriaRoundId(null); setCriteriaForm({ name:'', max_score:10, weight:1, description:'' }); }
    } finally { setSavingCriteria(false); }
  };

  if (loading) return <div className="hd-loading"><div className="hd-spinner"/><span>Đang tải...</span></div>;
  if (!contest) return <div className="hd-loading">Không tìm thấy cuộc thi.</div>;

  const st = STATUS_CFG[contest.status] || STATUS_CFG.draft;

  return (
    <div className="hd-page">
      {/* Header */}
      <div className="hd-header">
        <button className="hd-back-btn" onClick={() => navigate('/admin/hackathons')}><Ico d={BACK} size={16} sw={2}/></button>
        <div className="hd-header-info">
          <div className="hd-header-title-row">
            <h1 className="hd-title">{contest.title}</h1>
            <span className={`hd-badge ${st.cls}`}>{st.label}</span>
          </div>
          <p className="hd-subtitle">{contest.description || 'Không có mô tả'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="hd-tabs">
        {TABS.map((t, i) => (
          <button key={i} className={`hd-tab ${tab===i?'hd-tab--active':''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* ── Tab 0: Overview ── */}
      {tab === 0 && (
        <div className="hd-section">
          <div className="hd-overview-grid">
            {[['Hạn đăng ký', fmt(contest.registration_deadline)],['Ngày bắt đầu', fmt(contest.start_date)],['Ngày kết thúc', fmt(contest.end_date)],['Số đội/bảng', contest.max_teams_per_pool || '—'],['Số vòng thi', contest.rounds?.length || 0],['Số bảng thi', pools.length]].map(([k,v]) => (
              <div key={k} className="hd-overview-card">
                <span className="hd-ov-label">{k}</span>
                <span className="hd-ov-value">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 1: Rounds & Criteria ── */}
      {tab === 1 && (
        <div className="hd-section">
          <div className="hd-section-header">
            <h2 className="hd-section-title">Vòng thi</h2>
            <button className="hd-btn-add" onClick={() => setShowRoundForm(v => !v)}><Ico d={PLUS} size={14} sw={2.5}/> Thêm vòng</button>
          </div>

          {showRoundForm && (
            <form className="hd-form" onSubmit={addRound}>
              <div className="hd-form-grid">
                <div className="hd-field"><label>Số thứ tự *</label><input type="number" required value={roundForm.round_number} onChange={e => setRoundForm(f=>({...f,round_number:e.target.value}))} /></div>
                <div className="hd-field"><label>Tên vòng *</label><input required value={roundForm.name} onChange={e => setRoundForm(f=>({...f,name:e.target.value}))} placeholder="Vòng Sơ Khảo..." /></div>
                <div className="hd-field"><label>Bắt đầu</label><input type="datetime-local" value={roundForm.start_time} onChange={e => setRoundForm(f=>({...f,start_time:e.target.value}))} /></div>
                <div className="hd-field"><label>Kết thúc</label><input type="datetime-local" value={roundForm.end_time} onChange={e => setRoundForm(f=>({...f,end_time:e.target.value}))} /></div>
              </div>
              <div className="hd-form-actions">
                <button type="submit" className="hd-btn-save" disabled={savingRound}><Ico d={SAVE} size={14}/> {savingRound?'Đang lưu...':'Lưu vòng thi'}</button>
                <button type="button" className="hd-btn-cancel" onClick={() => setShowRoundForm(false)}>Hủy</button>
              </div>
            </form>
          )}

          {contest.rounds?.length === 0 && <p className="hd-empty-hint">Chưa có vòng thi nào.</p>}

          {contest.rounds?.map(round => (
            <div key={round._id} className="hd-round-card">
              <div className="hd-round-header">
                <div>
                  <span className="hd-round-number">Vòng {round.round_number}</span>
                  <span className="hd-round-name">{round.name}</span>
                  <span className="hd-round-dates">{fmt(round.start_time)} → {fmt(round.end_time)}</span>
                </div>
                <button className="hd-btn-add-sm" onClick={() => setCriteriaRoundId(criteriaRoundId===round._id?null:round._id)}>
                  <Ico d={PLUS} size={13} sw={2.5}/> Thêm tiêu chí
                </button>
              </div>

              {criteriaRoundId === round._id && (
                <form className="hd-form hd-form--criteria" onSubmit={addCriteria}>
                  <div className="hd-form-grid">
                    <div className="hd-field"><label>Tên tiêu chí *</label><input required value={criteriaForm.name} onChange={e => setCriteriaForm(f=>({...f,name:e.target.value}))} placeholder="Tính sáng tạo..." /></div>
                    <div className="hd-field"><label>Điểm tối đa *</label><input type="number" required value={criteriaForm.max_score} onChange={e => setCriteriaForm(f=>({...f,max_score:e.target.value}))} /></div>
                    <div className="hd-field"><label>Hệ số</label><input type="number" step="0.1" value={criteriaForm.weight} onChange={e => setCriteriaForm(f=>({...f,weight:e.target.value}))} /></div>
                    <div className="hd-field"><label>Mô tả</label><input value={criteriaForm.description} onChange={e => setCriteriaForm(f=>({...f,description:e.target.value}))} /></div>
                  </div>
                  <div className="hd-form-actions">
                    <button type="submit" className="hd-btn-save" disabled={savingCriteria}>{savingCriteria?'Đang lưu...':'Lưu tiêu chí'}</button>
                    <button type="button" className="hd-btn-cancel" onClick={() => setCriteriaRoundId(null)}>Hủy</button>
                  </div>
                </form>
              )}

              {round.score_criteria?.length > 0 ? (
                <table className="hd-criteria-table">
                  <thead><tr><th>Tiêu chí</th><th>Điểm tối đa</th><th>Hệ số</th><th>Mô tả</th></tr></thead>
                  <tbody>
                    {round.score_criteria.map((c,i) => (
                      <tr key={i}><td className="hd-crit-name">{c.name}</td><td>{c.max_score}</td><td>{c.weight ?? 1}</td><td className="hd-crit-desc">{c.description || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="hd-empty-hint">Chưa có tiêu chí chấm điểm.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 2: Tracks / Pools ── */}
      {tab === 2 && (
        <div className="hd-section">
          <div className="hd-section-header">
            <h2 className="hd-section-title">Bảng thi ({pools.length})</h2>
            <button className="hd-btn-add" onClick={() => navigate(`/admin/contests/${id}/dashboard`)}> Quản lý bảng thi</button>
          </div>
          {pools.length === 0 ? (
            <p className="hd-empty-hint">Chưa chia bảng. Vào "Quản lý bảng thi" để chia bảng tự động.</p>
          ) : (
            <div className="hd-pools-grid">
              {pools.map(p => (
                <div key={p._id} className="hd-pool-card">
                  <div className="hd-pool-header">
                    <span className="hd-pool-name">{p.pool_name}</span>
                    <span className="hd-pool-count">{p.teams?.length || 0} đội</span>
                  </div>
                  {p.topic_id && <div className="hd-pool-topic">📌 {p.topic_id.title}</div>}
                  <ul className="hd-pool-teams">
                    {(p.teams || []).slice(0,5).map(t => <li key={t._id}>{t.team_name}</li>)}
                    {p.teams?.length > 5 && <li className="hd-pool-more">+{p.teams.length-5} đội khác</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Events ── */}
      {tab === 3 && (
        <div className="hd-section">
          <h2 className="hd-section-title">Timeline sự kiện</h2>
          <div className="hd-timeline">
            {[
              { label:'Hạn đăng ký',   date: contest.registration_deadline, color:'#00d4ff' },
              { label:'Bắt đầu thi',   date: contest.start_date,            color:'#22c55e' },
              { label:'Kết thúc thi',  date: contest.end_date,              color:'#f87171' },
              ...( contest.rounds || []).map(r => ({ label:`${r.name} bắt đầu`, date: r.start_time, color:'#a78bfa' })),
              ...( contest.rounds || []).map(r => ({ label:`${r.name} kết thúc`, date: r.end_time, color:'#f59e0b' })),
            ]
              .filter(e => e.date)
              .sort((a,b) => new Date(a.date) - new Date(b.date))
              .map((ev,i) => (
                <div key={i} className="hd-timeline-item">
                  <div className="hd-tl-dot" style={{ background: ev.color }} />
                  <div className="hd-tl-body">
                    <span className="hd-tl-label">{ev.label}</span>
                    <span className="hd-tl-date">{fmt(ev.date)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
