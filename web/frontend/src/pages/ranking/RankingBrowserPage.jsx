import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getRankingContests, getTeamRanking, getChapterRanking } from '../../api/ranking';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_COLOR = {
  1: { bg: 'rgba(250,204,21,.10)', border: 'rgba(250,204,21,.4)', text: '#facc15' },
  2: { bg: 'rgba(148,163,184,.10)', border: 'rgba(148,163,184,.4)', text: '#94a3b8' },
  3: { bg: 'rgba(205,127,50,.10)', border: 'rgba(205,127,50,.4)', text: '#cd7f32' },
};

const STATUS_LABEL = { open: { label: 'Đang diễn ra', color: '#22c55e', bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.3)' }, closed: { label: 'Đã kết thúc', color: '#94a3b8', bg: 'rgba(148,163,184,.08)', border: 'rgba(148,163,184,.25)' }, draft: { label: 'Nháp', color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)' } };

export default function RankingBrowserPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [contests, setContests]     = useState([]);
  const [selectedContest, setSelectedContest] = useState(null);
  const [selectedRound,   setSelectedRound]   = useState(null);
  const [activeTab,       setActiveTab]       = useState('team'); // 'team' | 'chapter'
  const [ranking,         setRanking]         = useState(null);
  const [loadingContests, setLoadingContests] = useState(true);
  const [loadingRanking,  setLoadingRanking]  = useState(false);
  const [rankingError,    setRankingError]    = useState(null);

  // Load contests on mount
  useEffect(() => {
    getRankingContests()
      .then((res) => {
        const list = res.data?.data || [];
        setContests(list);

        // Restore từ URL params: hỗ trợ cả ?contest=&round= và chỉ ?round=
        const cId = searchParams.get('contest');
        const rId = searchParams.get('round');

        let targetContest = cId ? list.find((x) => x._id === cId) : null;

        // Nếu chỉ có round_id (từ ResultsPage redirect), tìm contest chứa round đó
        if (!targetContest && rId) {
          targetContest = list.find((c) => c.rounds?.some((r) => r._id === rId));
        }

        // Auto-select contest đang open nếu không có param
        if (!targetContest) {
          targetContest = list.find((c) => c.status === 'open') ?? list[0] ?? null;
        }

        if (targetContest) {
          setSelectedContest(targetContest);
          // Chỉ auto-select round khi có round_id explicit trong URL
          if (rId) {
            const targetRound = targetContest.rounds?.find((r) => r._id === rId);
            if (targetRound) setSelectedRound(targetRound);
          }
          // Không auto-select round active — để user tự chọn tránh 403 gây bối rối
        }
      })
      .catch(() => {})
      .finally(() => setLoadingContests(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch ranking when round or tab changes
  useEffect(() => {
    if (!selectedRound) { setRanking(null); setRankingError(null); return; }
    setLoadingRanking(true);
    setRanking(null);
    setRankingError(null);
    const fetcher = activeTab === 'chapter'
      ? getChapterRanking(selectedRound._id)
      : getTeamRanking(selectedRound._id);
    fetcher
      .then((res) => setRanking(res.data))
      .catch((err) => {
        if (err.response?.status === 403) setRankingError('unpublished');
        else setRankingError(err.response?.data?.message || 'Lỗi tải dữ liệu');
      })
      .finally(() => setLoadingRanking(false));
  }, [selectedRound, activeTab]);

  const pickContest = useCallback((c) => {
    setSelectedContest(c);
    setSelectedRound(null);
    setRanking(null);
    setRankingError(null);
    setSearchParams({ contest: c._id });
  }, [setSearchParams]);

  const pickRound = useCallback((r) => {
    setSelectedRound(r);
    setSearchParams({ contest: selectedContest._id, round: r._id });
  }, [selectedContest, setSearchParams]);

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* ── Page title ── */}
        <header style={{ marginBottom: 32 }}>
          <h1 className="gradient-text glow-text" style={s.title}>BẢNG XẾP HẠNG</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.95rem' }}>
            Xem kết quả xếp hạng team theo từng vòng của các cuộc thi
          </p>
        </header>

        <div style={s.layout}>

          {/* ── LEFT: Contest + Round picker ── */}
          <aside style={s.sidebar}>

            {/* Contest list */}
            <div style={s.sideSection}>
              <p style={s.sideLabel}>Cuộc thi</p>
              {loadingContests ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '12px 0' }}>Đang tải...</div>
              ) : contests.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0', lineHeight: 1.6 }}>
                  Bạn chưa tham gia cuộc thi nào có kết quả được công bố.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {contests.map((c) => {
                    const st = STATUS_LABEL[c.status] || STATUS_LABEL.draft;
                    const isActive = selectedContest?._id === c._id;
                    return (
                      <button
                        key={c._id}
                        onClick={() => pickContest(c)}
                        style={{
                          ...s.contestBtn,
                          background: isActive ? 'rgba(0,240,255,.08)' : 'rgba(17,24,39,.5)',
                          border: `1px solid ${isActive ? 'rgba(0,240,255,.35)' : 'var(--border)'}`,
                          color: isActive ? 'var(--cyan)' : 'var(--text-primary)',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', textAlign: 'left', lineHeight: 1.3 }}>{c.title}</span>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700,
                          color: st.color, background: st.bg,
                          border: `1px solid ${st.border}`,
                          padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
                        }}>{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Round list */}
            {selectedContest && (
              <div style={s.sideSection}>
                <p style={s.sideLabel}>Vòng thi</p>
                {(selectedContest.rounds || []).length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chưa có vòng thi.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedContest.rounds.map((r) => {
                      const isActive = selectedRound?._id === r._id;
                      const locked = r.scoring_locked;
                      return (
                        <button
                          key={r._id}
                          onClick={() => pickRound(r)}
                          style={{
                            ...s.roundBtn,
                            background: isActive ? 'rgba(0,240,255,.08)' : 'transparent',
                            border: `1px solid ${isActive ? 'rgba(0,240,255,.35)' : 'var(--border)'}`,
                            color: isActive ? 'var(--cyan)' : 'var(--text-primary)',
                          }}
                        >
                          <span style={{ fontSize: '0.88rem', fontWeight: isActive ? 600 : 400 }}>{r.name}</span>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700,
                            color: locked ? '#22c55e' : '#f59e0b',
                            background: locked ? 'rgba(34,197,94,.08)' : 'rgba(245,158,11,.08)',
                            border: `1px solid ${locked ? 'rgba(34,197,94,.25)' : 'rgba(245,158,11,.25)'}`,
                            padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                          }}>
                            {locked ? 'Đã khóa' : 'Đang mở'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* ── RIGHT: Ranking table ── */}
          <main style={s.main}>
            {/* Tab switcher — luôn hiển thị */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[{ key: 'team', label: '👥 Team' }, { key: 'chapter', label: '🏫 Chapter' }].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '7px 18px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all .15s',
                    background: activeTab === tab.key ? 'var(--gradient-primary)' : 'rgba(17,24,39,.5)',
                    color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                    border: activeTab === tab.key ? '1px solid transparent' : '1px solid var(--border)',
                    boxShadow: activeTab === tab.key ? 'var(--shadow-cyan)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {!selectedContest && (
              <EmptyHint icon={activeTab === 'chapter' ? '🏫' : '🏆'} text="Chọn một cuộc thi để xem bảng xếp hạng" />
            )}
            {selectedContest && !selectedRound && (
              <EmptyHint
                icon="📋"
                text={activeTab === 'chapter' ? 'Chọn vòng thi để xem bảng xếp hạng chapter' : 'Chọn vòng thi để xem kết quả'}
              />
            )}
            {selectedRound && loadingRanking && <Spinner />}
            {selectedRound && !loadingRanking && rankingError === 'unpublished' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 12, textAlign: 'center' }}>
                <span style={{ fontSize: '2.5rem' }}>🔒</span>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  Kết quả chưa được công bố
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.6 }}>
                  Vòng <strong>{selectedRound.name}</strong> chưa kết thúc chấm điểm.
                  Vui lòng chọn vòng khác hoặc quay lại sau khi ban tổ chức công bố.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                  {selectedContest?.rounds?.filter((r) => r.scoring_locked).map((r) => (
                    <button key={r._id} onClick={() => pickRound(r)}
                      style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(34,197,94,.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,.3)' }}>
                      {r.name}
                    </button>
                  ))}
                  {selectedContest?.rounds?.filter((r) => r.scoring_locked).length === 0 && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Chưa có vòng nào có kết quả trong cuộc thi này.</p>
                  )}
                </div>
              </div>
            )}
            {selectedRound && !loadingRanking && rankingError && rankingError !== 'unpublished' && (
              <EmptyHint icon="⚠️" text={rankingError} />
            )}
            {selectedRound && !loadingRanking && !rankingError && ranking && activeTab === 'team' && (
              <RankingTable
                roundName={ranking.round_name}
                contestName={ranking.contest_name}
                teams={ranking.teams || []}
              />
            )}
            {selectedRound && !loadingRanking && !rankingError && ranking && activeTab === 'chapter' && (
              <ChapterTable data={ranking} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function RankingTable({ roundName, contestName, teams }) {
  return (
    <div>
      {/* Sub-header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{roundName}</h2>
          {contestName && <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{contestName}</p>}
        </div>
        <span style={{
          fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic',
        }}>* Kết quả kỳ này — không cộng dồn</span>
      </div>

      {teams.length === 0 ? (
        <EmptyHint icon="📭" text="Chưa có điểm final nào trong vòng này" />
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(0,240,255,.12)', boxShadow: 'var(--shadow-cyan)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(17,24,39,.7)' }}>
            <thead>
              <tr>
                {['Hạng', 'Tên đội', 'Chapter', 'Điểm TB'].map((h, i) => (
                  <th key={h} style={{
                    padding: '13px 18px',
                    textAlign: i === 0 || i === 3 ? 'center' : 'left',
                    fontFamily: 'var(--font-display)', fontSize: '0.75rem',
                    letterSpacing: '1px', textTransform: 'uppercase',
                    color: 'var(--cyan)', borderBottom: '1px solid rgba(0,240,255,.15)',
                    background: 'rgba(0,240,255,.04)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const medal = MEDAL[team.rank];
                const mc    = MEDAL_COLOR[team.rank];
                return (
                  <tr key={team.team_id} style={{ background: mc?.bg || 'transparent', borderBottom: '1px solid rgba(0,240,255,.06)' }}>
                    <td style={{ padding: '13px 18px', textAlign: 'center', width: 80 }}>
                      {medal ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, border: `1px solid ${mc.border}`, color: mc.text, fontWeight: 700, fontSize: '0.9rem' }}>
                          {medal} {team.rank}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>#{team.rank}</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 18px', fontWeight: mc ? 700 : 500, color: mc?.text || 'var(--text-primary)', fontSize: '0.93rem' }}>
                      {team.team_name}
                    </td>
                    <td style={{ padding: '13px 18px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      {team.chapter || '—'}
                    </td>
                    <td style={{ padding: '13px 18px', textAlign: 'center', fontWeight: 700, color: mc?.text || 'var(--cyan)', fontSize: '1rem' }}>
                      {team.weighted_avg_score.toFixed(2)}
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

function ChapterTable({ data }) {
  const [tooltip, setTooltip] = useState(false);
  const chapters = data?.chapters || [];
  return (
    <div>
      {/* Sub-header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {data?.round_name} — Chapter
          </h2>
          {data?.season_name && (
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{data.season_name}</p>
          )}
        </div>
      </div>

      {/* Pending formula banner */}
      {data && !data.formula_defined && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
          <div>
            <strong style={{ color: '#f59e0b', display: 'block', marginBottom: 2, fontSize: '0.85rem' }}>
              Pending BTC #5 — Chưa có định nghĩa chính thức
            </strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              Điểm tích lũy hiển thị bên dưới chỉ mang tính tham khảo, chưa được ban tổ chức xác nhận.
            </span>
          </div>
        </div>
      )}

      {chapters.length === 0 ? (
        <EmptyHint icon="🏫" text="Chưa có team nào thuộc chapter có điểm final trong vòng này" />
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(0,240,255,.12)', boxShadow: 'var(--shadow-cyan)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(17,24,39,.7)' }}>
            <thead>
              <tr>
                {['Hạng', 'Chapter', 'Điểm tốt nhất kỳ này'].map((h, i) => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: i === 0 || i === 2 ? 'center' : 'left', fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--cyan)', borderBottom: '1px solid rgba(0,240,255,.15)', background: 'rgba(0,240,255,.04)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
                {/* Cumulative col with tooltip */}
                <th style={{ padding: '13px 18px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--cyan)', borderBottom: '1px solid rgba(0,240,255,.15)', background: 'rgba(0,240,255,.04)', whiteSpace: 'nowrap', position: 'relative' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'help' }}
                    onMouseEnter={() => setTooltip(true)}
                    onMouseLeave={() => setTooltip(false)}
                  >
                    Điểm tích lũy
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, borderRadius: '50%', border: '1px solid rgba(0,240,255,.4)', fontSize: '0.6rem', color: 'var(--cyan)', fontWeight: 700 }}>?</span>
                  </span>
                  {tooltip && (
                    <div style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', background: '#1a2332', border: '1px solid rgba(0,240,255,.2)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, width: 240, textAlign: 'left', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.4)', whiteSpace: 'normal' }}>
                      <strong style={{ color: '#f59e0b', display: 'block', marginBottom: 4 }}>Pending BTC #5</strong>
                      Công thức tính điểm tích lũy xuyên mùa đang chờ ban tổ chức xác nhận.
                    </div>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {chapters.map((ch) => {
                const medal = MEDAL[ch.rank];
                const mc    = MEDAL_COLOR[ch.rank];
                return (
                  <tr key={ch.chapter_id || ch.chapter_name} style={{ background: mc?.bg || 'transparent', borderBottom: '1px solid rgba(0,240,255,.06)' }}>
                    <td style={{ padding: '13px 18px', textAlign: 'center', width: 80 }}>
                      {medal ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, border: `1px solid ${mc.border}`, color: mc.text, fontWeight: 700, fontSize: '0.9rem' }}>
                          {medal} {ch.rank}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>#{ch.rank}</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 18px', fontWeight: mc ? 700 : 500, color: mc?.text || 'var(--text-primary)', fontSize: '0.93rem' }}>
                      {ch.chapter_name}
                    </td>
                    <td style={{ padding: '13px 18px', textAlign: 'center', fontWeight: 700, color: mc?.text || 'var(--cyan)', fontSize: '1rem' }}>
                      {ch.best_team_score_this_season.toFixed(2)}
                    </td>
                    <td style={{ padding: '13px 18px', textAlign: 'center' }}>
                      {ch.cumulative_score > 0 ? (
                        <span style={{ fontWeight: 700, color: mc?.text || 'var(--text-primary)', fontSize: '1rem' }}>
                          {ch.cumulative_score.toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', padding: '2px 8px', borderRadius: 4 }}>
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ marginTop: 14, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        * Điểm tốt nhất kỳ này = max(điểm TB) của tất cả team thuộc chapter trong vòng này
      </p>
    </div>
  );
}

function EmptyHint({ icon, text, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, color: 'var(--text-secondary)', textAlign: 'center', gap: 10 }}>
      <span style={{ fontSize: '2.8rem' }}>{icon}</span>
      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{text}</p>
      {sub && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 14 }}>
      <div style={{ width: 44, height: 44, border: '4px solid rgba(0,240,255,.1)', borderTop: '4px solid var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--cyan)', fontSize: '0.85rem', letterSpacing: 1 }}>Đang tải...</p>
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

const s = {
  page: { background: 'var(--bg-primary)', minHeight: '100vh', padding: '40px 24px', color: 'var(--text-primary)' },
  container: { maxWidth: 1100, margin: '0 auto' },
  title: { fontSize: '2rem', fontWeight: 800, letterSpacing: 2, fontFamily: 'var(--font-display)', textTransform: 'uppercase', margin: 0 },
  layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 20 },
  sideSection: { background: 'rgba(17,24,39,.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 14px', backdropFilter: 'blur(10px)' },
  sideLabel: { margin: '0 0 10px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--cyan)' },
  contestBtn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all .15s', width: '100%', textAlign: 'left' },
  roundBtn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all .15s', width: '100%' },
  main: { background: 'rgba(17,24,39,.5)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, backdropFilter: 'blur(10px)', minHeight: 340 },
};
