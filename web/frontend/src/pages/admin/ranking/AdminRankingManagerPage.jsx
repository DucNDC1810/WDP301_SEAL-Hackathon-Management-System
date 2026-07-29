import { useEffect, useState, useCallback } from 'react';
import {
  adminGetContests, adminToggleIndividual,
  adminGetIndividuals, adminUpsertIndividual,
} from '../../../api/adminRanking';
import RefreshButton from '../../../components/RefreshButton';

const TABS = [
  { key: 'individual', label: '👤 Điểm cá nhân' },
  { key: 'settings',  label: '⚙️ Cài đặt' },
];

const STATUS_COLOR = {
  open:   { color: '#22c55e', bg: 'rgba(34,197,94,.1)',   border: 'rgba(34,197,94,.3)',   label: 'Đang mở' },
  closed: { color: '#94a3b8', bg: 'rgba(148,163,184,.08)', border: 'rgba(148,163,184,.25)', label: 'Đã đóng' },
  draft:  { color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)', label: 'Nháp' },
};

export default function AdminRankingManagerPage() {
  const [activeTab, setActiveTab] = useState('individual');
  const [contests,  setContests]  = useState([]);
  const [selectedContest, setSelectedContest] = useState(null);
  const [loadingContests, setLoadingContests] = useState(true);
  const [contestsError, setContestsError] = useState(null);

  useEffect(() => {
    adminGetContests()
      .then((res) => {
        const list = res.data?.data || [];
        setContests(list);
        if (list.length > 0) setSelectedContest(list[0]);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || 'Lỗi tải danh sách cuộc thi';
        const status = err.response?.status;
        setContestsError(`${status ? `[${status}] ` : ''}${msg}`);
      })
      .finally(() => setLoadingContests(false));
  }, []);

  return (
    <div style={s.page}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={s.title}>Quản lý Ranking</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.9rem' }}>
          Nhập điểm cá nhân, cập nhật điểm tích lũy chapter, và cấu hình tính năng xếp hạng.
        </p>
      </header>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '9px 20px', borderRadius: '8px 8px 0 0', fontSize: '0.88rem', fontWeight: 600,
            cursor: 'pointer', border: '1px solid',
            borderBottom: activeTab === tab.key ? '1px solid var(--bg-card)' : '1px solid var(--border)',
            background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
            color: activeTab === tab.key ? 'var(--cyan)' : 'var(--text-secondary)',
            borderColor: activeTab === tab.key ? 'var(--border)' : 'transparent',
            marginBottom: -1,
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contest picker (dùng cho tab individual) */}
      {(activeTab === 'individual') && (
        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>Cuộc thi</label>
          {loadingContests ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Đang tải...</p>
          ) : contestsError ? (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.85rem' }}>
              ✗ {contestsError}
            </div>
          ) : contests.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Không có cuộc thi nào.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {contests.map((c) => {
                const st = STATUS_COLOR[c.status] || STATUS_COLOR.draft;
                const active = selectedContest?._id === c._id;
                return (
                  <button key={c._id} onClick={() => setSelectedContest(c)} style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    background: active ? 'rgba(0,240,255,.08)' : 'var(--bg-card)',
                    border: `1px solid ${active ? 'rgba(0,240,255,.35)' : 'var(--border)'}`,
                    color: active ? 'var(--cyan)' : 'var(--text-primary)',
                  }}>
                    {c.title}
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: '1px 6px', borderRadius: 4 }}>
                      {st.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab content */}

      {activeTab === 'individual' && selectedContest && (
        <IndividualTab contestId={selectedContest._id} contestTitle={selectedContest.title} />
      )}
      {activeTab === 'settings' && (
        <SettingsTab contests={contests} setContests={setContests} loadingContests={loadingContests} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB 1: Điểm cá nhân
───────────────────────────────────────────── */
function IndividualTab({ contestId, contestTitle }) {
  const [individuals, setIndividuals] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState(null); // { user_id, score_this_hackathon, cumulative_score }
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState(null);
  const [search, setSearch]           = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminGetIndividuals(contestId)
      .then((res) => setIndividuals(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contestId]);

  useEffect(() => { load(); setEditing(null); setMsg(null); setSearch(''); }, [load]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setMsg(null);
    try {
      await adminUpsertIndividual(contestId, editing.user_id, {
        score_this_hackathon: editing.score_this_hackathon,
        cumulative_score:     editing.cumulative_score,
      });
      setMsg({ type: 'ok', text: 'Lưu thành công' });
      setEditing(null);
      load();
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'Lỗi lưu dữ liệu' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = individuals.filter((p) =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          {individuals.length} thành viên trong <strong style={{ color: 'var(--text-primary)' }}>{contestTitle}</strong>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RefreshButton onRefresh={load} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên / email..."
            style={s.searchInput}
          />
        </div>
      </div>

      {msg && (
        <div style={{ ...s.msg, background: msg.type === 'ok' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)', borderColor: msg.type === 'ok' ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)', color: msg.type === 'ok' ? '#22c55e' : '#ef4444' }}>
          {msg.type === 'ok' ? '✓' : '✗'} {msg.text}
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty text="Không tìm thấy thành viên nào" />
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card)' }}>
            <thead>
              <tr>
                {['Họ tên', 'Email', 'Điểm kỳ này', 'Điểm tích lũy', ''].map((h, i) => (
                  <th key={i} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((person) => {
                const isEditing = editing?.user_id === person.user_id;
                return (
                  <tr key={person.user_id} style={{ borderBottom: '1px solid rgba(0,240,255,.05)', background: isEditing ? 'rgba(0,240,255,.04)' : 'transparent' }}>
                    <td style={s.td}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{person.full_name}</span>
                    </td>
                    <td style={{ ...s.td, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{person.email}</td>
                    <td style={s.td}>
                      {isEditing ? (
                        <input type="number" min={0} step={0.01}
                          value={editing.score_this_hackathon}
                          onChange={(e) => setEditing({ ...editing, score_this_hackathon: e.target.value })}
                          style={s.numInput}
                        />
                      ) : (
                        <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>
                          {person.score_this_hackathon.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td style={s.td}>
                      {isEditing ? (
                        <input type="number" min={0} step={0.01}
                          value={editing.cumulative_score}
                          onChange={(e) => setEditing({ ...editing, cumulative_score: e.target.value })}
                          style={s.numInput}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {person.cumulative_score > 0 ? person.cumulative_score.toFixed(2) : (
                            <span style={s.pending}>Pending</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={handleSave} disabled={saving} style={s.btnSave}>
                            {saving ? '...' : 'Lưu'}
                          </button>
                          <button onClick={() => setEditing(null)} style={s.btnCancel}>Huỷ</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditing({ user_id: person.user_id, score_this_hackathon: person.score_this_hackathon, cumulative_score: person.cumulative_score })} style={s.btnEdit}>
                          Sửa
                        </button>
                      )}
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

/* ─────────────────────────────────────────────
   TAB 2: Cài đặt (bật/tắt individual ranking)
───────────────────────────────────────────── */
function SettingsTab({ contests, setContests, loadingContests }) {
  const [toggling, setToggling] = useState(null);
  const [msg, setMsg] = useState(null);

  const handleToggle = async (contest) => {
    setToggling(contest._id); setMsg(null);
    try {
      const res = await adminToggleIndividual(contest._id);
      setContests((prev) => prev.map((c) =>
        c._id === contest._id ? { ...c, individual_ranking_enabled: res.data.individual_ranking_enabled } : c
      ));
      setMsg({ type: 'ok', text: `${contest.title}: BXH cá nhân ${res.data.individual_ranking_enabled ? 'đã BẬT' : 'đã TẮT'}` });
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'Lỗi' });
    } finally { setToggling(null); }
  };

  if (loadingContests) return <Loader />;

  return (
    <div>
      <p style={{ marginBottom: 16, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
        Bật/tắt tính năng <strong style={{ color: 'var(--text-primary)' }}>Bảng XH Cá nhân</strong> cho từng cuộc thi.
        Khi tắt, tab "👤 Cá nhân" sẽ ẩn hoàn toàn với người dùng.
      </p>

      {msg && (
        <div style={{ ...s.msg, background: msg.type === 'ok' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)', borderColor: msg.type === 'ok' ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)', color: msg.type === 'ok' ? '#22c55e' : '#ef4444', marginBottom: 16 }}>
          {msg.type === 'ok' ? '✓' : '✗'} {msg.text}
        </div>
      )}

      {contests.length === 0 ? (
        <Empty text="Chưa có cuộc thi nào" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contests.map((c) => {
            const st = STATUS_COLOR[c.status] || STATUS_COLOR.draft;
            const enabled = c.individual_ranking_enabled;
            const isToggling = toggling === c._id;
            return (
              <div key={c._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, border: `1px solid ${enabled ? 'rgba(0,240,255,.2)' : 'var(--border)'}`, background: enabled ? 'rgba(0,240,255,.04)' : 'var(--bg-card)', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.93rem' }}>{c.title}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: '1px 7px', borderRadius: 4 }}>{st.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.82rem', color: enabled ? '#22c55e' : 'var(--text-muted)', fontWeight: 600 }}>
                    {enabled ? '● BẬT' : '○ TẮT'}
                  </span>
                  <button
                    onClick={() => handleToggle(c)}
                    disabled={isToggling}
                    style={{
                      padding: '6px 16px', borderRadius: 7, fontSize: '0.82rem', fontWeight: 700,
                      cursor: isToggling ? 'wait' : 'pointer', border: 'none',
                      background: enabled ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.15)',
                      color: enabled ? '#ef4444' : '#22c55e',
                      outline: `1px solid ${enabled ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.3)'}`,
                    }}
                  >
                    {isToggling ? '...' : enabled ? 'Tắt' : 'Bật'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Shared helpers ── */
function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '40px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
      <div style={{ width: 18, height: 18, border: '2px solid rgba(0,240,255,.2)', borderTop: '2px solid var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      Đang tải...
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Empty({ text }) {
  return <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '32px 0', textAlign: 'center' }}>{text}</p>;
}

const s = {
  page: { padding: '32px 28px', color: 'var(--text-primary)', maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: '1.5rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', letterSpacing: 1 },
  label: { display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--cyan)', marginBottom: 10 },
  th: { padding: '11px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--cyan)', borderBottom: '1px solid rgba(0,240,255,.12)', background: 'rgba(0,240,255,.03)', whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', fontSize: '0.9rem' },
  numInput: { padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(0,240,255,.3)', background: 'rgba(0,240,255,.04)', color: 'var(--text-primary)', fontSize: '0.9rem', width: 120, outline: 'none' },
  searchInput: { padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', width: 220, outline: 'none' },
  btnEdit: { padding: '5px 14px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,240,255,.08)', color: 'var(--cyan)', border: '1px solid rgba(0,240,255,.25)' },
  btnSave: { padding: '5px 14px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(34,197,94,.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,.3)' },
  btnCancel: { padding: '5px 14px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(148,163,184,.08)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  msg: { padding: '10px 16px', borderRadius: 8, border: '1px solid', marginBottom: 14, fontSize: '0.85rem', fontWeight: 600 },
  pending: { fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', padding: '2px 8px', borderRadius: 4 },
};
