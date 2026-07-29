import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChapterRanking } from '../../api/ranking';
import RefreshButton from '../../components/RefreshButton';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_COLOR = {
  1: { bg: 'rgba(250,204,21,.10)', border: 'rgba(250,204,21,.4)', text: '#facc15' },
  2: { bg: 'rgba(148,163,184,.10)', border: 'rgba(148,163,184,.4)', text: '#94a3b8' },
  3: { bg: 'rgba(205,127,50,.10)', border: 'rgba(205,127,50,.4)', text: '#cd7f32' },
};

export default function ChapterRankingPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unpublished, setUnpublished] = useState(false);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState(false);

  const fetchData = useCallback((mountedRef) => {
    setLoading(true);
    setUnpublished(false);
    setError(null);

    getChapterRanking(round_id)
      .then((res) => { if (!mountedRef || mountedRef.current) { setData(res.data); setLoading(false); } })
      .catch((err) => {
        if (mountedRef && !mountedRef.current) return;
        if (err.response?.status === 403) setUnpublished(true);
        else setError(err.response?.data?.message || 'Lỗi tải dữ liệu');
        setLoading(false);
      });
  }, [round_id]);

  useEffect(() => {
    const mountedRef = { current: true };
    fetchData(mountedRef);
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  /* ── Loading ── */
  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display)', letterSpacing: 1 }}>
        ĐANG TẢI...
      </p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Unpublished ── */
  if (unpublished) return (
    <div style={s.center}>
      <div style={s.card}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🔒</span>
        <h2 style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display)', marginBottom: 12, fontSize: '1.4rem' }}>
          KẾT QUẢ CHƯA ĐƯỢC CÔNG BỐ
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          Vòng thi này chưa kết thúc chấm điểm. Vui lòng quay lại sau.
        </p>
        <button style={s.backBtn} onClick={() => navigate(-1)}>Quay lại</button>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={s.center}>
      <div style={{ ...s.card, borderColor: 'var(--red)' }}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>⚠️</span>
        <h2 style={{ color: 'var(--red)', fontFamily: 'var(--font-display)', marginBottom: 12, fontSize: '1.4rem' }}>LỖI</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
        <button style={s.backBtn} onClick={() => navigate(-1)}>Quay lại</button>
      </div>
    </div>
  );

  const chapters = data?.chapters || [];

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 className="gradient-text glow-text" style={s.title}>
            BẢNG XẾP HẠNG CHAPTER
          </h1>
          <div style={s.badge}>
            <span style={s.dot} />
            {data?.round_name || 'Vòng thi'}
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            <RefreshButton onRefresh={() => fetchData()} />
          </div>
          {data?.season_name && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
              {data.season_name}
            </p>
          )}
        </header>

        {/* Pending formula banner */}
        {data && !data.formula_defined && (
          <div style={s.banner}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
            <div>
              <strong style={{ color: '#f59e0b', display: 'block', marginBottom: 2 }}>
                Pending BTC #5 — Chưa có định nghĩa chính thức
              </strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                {data.formula_note} — Điểm tích lũy hiển thị bên dưới chỉ mang tính tham khảo,
                chưa được ban tổ chức xác nhận.
              </span>
            </div>
          </div>
        )}

        {/* Table */}
        {chapters.length === 0 ? (
          <div style={s.emptyCard}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🏫</span>
            <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 8 }}>
              Chưa có dữ liệu chapter
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Chưa có team nào thuộc chapter nào có điểm final trong vòng này.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid rgba(0,240,255,.12)', boxShadow: 'var(--shadow-cyan)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(17,24,39,.75)' }}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: 80, textAlign: 'center' }}>Hạng</th>
                  <th style={s.th}>Chapter</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Điểm tốt nhất kỳ này</th>
                  {/* Cumulative column with tooltip */}
                  <th style={{ ...s.th, textAlign: 'center', position: 'relative' }}>
                    <span
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'help' }}
                      onMouseEnter={() => setTooltip(true)}
                      onMouseLeave={() => setTooltip(false)}
                    >
                      Điểm tích lũy
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 16, height: 16, borderRadius: '50%',
                        border: '1px solid rgba(0,240,255,.4)', fontSize: '0.65rem',
                        color: 'var(--cyan)', fontWeight: 700, lineHeight: 1,
                      }}>?</span>
                    </span>
                    {tooltip && (
                      <div style={s.tooltip}>
                        <strong style={{ color: '#f59e0b', display: 'block', marginBottom: 4 }}>
                          Pending BTC #5
                        </strong>
                        Công thức tính điểm tích lũy xuyên mùa đang chờ ban tổ chức xác nhận.
                        Giá trị hiện tại lấy từ dữ liệu Chapter document trong hệ thống.
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((ch) => {
                  const medal = MEDAL[ch.rank];
                  const mc = MEDAL_COLOR[ch.rank];
                  return (
                    <tr
                      key={ch.chapter_id || ch.chapter_name}
                      style={{ background: mc?.bg || 'transparent', borderBottom: '1px solid rgba(0,240,255,.06)' }}
                    >
                      {/* Rank */}
                      <td style={{ ...s.td, textAlign: 'center', width: 80 }}>
                        {medal ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20,
                            border: `1px solid ${mc.border}`, color: mc.text, fontWeight: 700,
                          }}>
                            {medal} {ch.rank}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>#{ch.rank}</span>
                        )}
                      </td>

                      {/* Chapter name */}
                      <td style={{ ...s.td, fontWeight: mc ? 700 : 500, color: mc?.text || 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {ch.chapter_name}
                      </td>

                      {/* Best score this season */}
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 600, color: mc?.text || 'var(--cyan)', fontSize: '1rem' }}>
                        {ch.best_team_score_this_season.toFixed(2)}
                      </td>

                      {/* Cumulative */}
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        {ch.cumulative_score > 0 ? (
                          <span style={{ fontWeight: 700, color: mc?.text || 'var(--text-primary)', fontSize: '1rem' }}>
                            {ch.cumulative_score.toFixed(2)}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.75rem', color: '#f59e0b',
                            background: 'rgba(245,158,11,.08)',
                            border: '1px solid rgba(245,158,11,.25)',
                            padding: '2px 8px', borderRadius: 4,
                          }}>
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

        {/* Footer note */}
        <p style={s.note}>
          * Điểm tốt nhất kỳ này = max(điểm TB) của tất cả team thuộc chapter trong vòng này
        </p>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const s = {
  page: { background: 'var(--bg-primary)', minHeight: '100vh', padding: '40px 24px', color: 'var(--text-primary)' },
  container: { maxWidth: 900, margin: '0 auto' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', padding: 24, textAlign: 'center' },
  card: { background: 'rgba(0,240,255,.05)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 32px', maxWidth: 480, backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-cyan)', width: '100%' },
  spinner: { width: 48, height: 48, border: '4px solid rgba(0,240,255,.1)', borderTop: '4px solid var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 },
  title: { fontSize: '2rem', fontWeight: 800, letterSpacing: 2, fontFamily: 'var(--font-display)', textTransform: 'uppercase', margin: 0 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,240,255,.07)', border: '1px solid var(--border)', padding: '6px 16px', borderRadius: 20, fontSize: '0.92rem', fontWeight: 500, color: 'var(--cyan)', marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', flexShrink: 0 },
  banner: { display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, backdropFilter: 'blur(8px)' },
  th: { padding: '13px 18px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--cyan)', borderBottom: '1px solid rgba(0,240,255,.15)', background: 'rgba(0,240,255,.04)', whiteSpace: 'nowrap' },
  td: { padding: '13px 18px', fontSize: '0.93rem' },
  tooltip: { position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', background: '#1a2332', border: '1px solid rgba(0,240,255,.2)', borderRadius: 8, padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, width: 260, textAlign: 'left', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.4)' },
  emptyCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '60px 40px', textAlign: 'center', boxShadow: 'var(--shadow-cyan)' },
  backBtn: { background: 'var(--gradient-primary)', color: 'white', padding: '10px 24px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-cyan)' },
  note: { marginTop: 18, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' },
};
