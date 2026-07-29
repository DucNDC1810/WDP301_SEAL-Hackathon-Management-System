import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIndividualRanking } from '../../api/ranking';
import FeatureGate from '../../components/FeatureGate';
import RefreshButton from '../../components/RefreshButton';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_COLOR = {
  1: { bg: 'rgba(250,204,21,.10)', border: 'rgba(250,204,21,.4)', text: '#facc15' },
  2: { bg: 'rgba(148,163,184,.10)', border: 'rgba(148,163,184,.4)', text: '#94a3b8' },
  3: { bg: 'rgba(205,127,50,.10)', border: 'rgba(205,127,50,.4)', text: '#cd7f32' },
};

export default function IndividualRankingPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
      try {
        const res = await getIndividualRanking(round_id);
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 403) {
          setError('unpublished');
        } else {
          setError(err.response?.data?.message || 'Lỗi tải dữ liệu');
        }
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchData();
  }, [round_id]);

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display)', letterSpacing: 1 }}>ĐANG TẢI...</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Feature disabled — ẩn hoàn toàn, không hint
  if (!data?.enabled) return null;

  if (error === 'unpublished') return (
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

  if (error) return (
    <div style={s.center}>
      <div style={{ ...s.card, borderColor: 'rgba(239,68,68,.4)' }}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>⚠️</span>
        <h2 style={{ color: '#ef4444', fontFamily: 'var(--font-display)', marginBottom: 12, fontSize: '1.4rem' }}>LỖI</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
        <button style={s.backBtn} onClick={() => navigate(-1)}>Quay lại</button>
      </div>
    </div>
  );

  const individuals = data?.individuals || [];

  return (
    <FeatureGate enabled={data?.enabled}>
      <div style={s.page}>
        <div style={s.container}>

          {/* Header */}
          <header style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 className="gradient-text glow-text" style={s.title}>
              BẢNG XẾP HẠNG CÁ NHÂN
            </h1>
            <div style={s.badge}>
              <span style={s.dot} />
              {data?.round_name || 'Vòng thi'}
            </div>
            {data?.season_name && (
              <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
                Xếp hạng cá nhân — {data.season_name}
              </p>
            )}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
              <RefreshButton onRefresh={fetchData} />
            </div>
          </header>

          {/* Table */}
          {individuals.length === 0 ? (
            <div style={s.emptyCard}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>👤</span>
              <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 8 }}>
                Chưa có dữ liệu cá nhân
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Chưa có điểm cá nhân nào được ghi nhận trong vòng này.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid rgba(0,240,255,.12)', boxShadow: 'var(--shadow-cyan)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(17,24,39,.75)' }}>
                <thead>
                  <tr>
                    {['Hạng', 'Họ tên', 'Chapter', 'Điểm kỳ này', 'Điểm tích lũy'].map((h, i) => (
                      <th key={h} style={{
                        padding: '13px 18px',
                        textAlign: i === 0 || i >= 3 ? 'center' : 'left',
                        fontFamily: 'var(--font-display)', fontSize: '0.75rem',
                        letterSpacing: '1px', textTransform: 'uppercase',
                        color: 'var(--cyan)', borderBottom: '1px solid rgba(0,240,255,.15)',
                        background: 'rgba(0,240,255,.04)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {individuals.map((person) => {
                    const medal = MEDAL[person.rank];
                    const mc    = MEDAL_COLOR[person.rank];
                    return (
                      <tr key={person.user_id} style={{ background: mc?.bg || 'transparent', borderBottom: '1px solid rgba(0,240,255,.06)' }}>
                        <td style={{ padding: '13px 18px', textAlign: 'center', width: 80 }}>
                          {medal ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, border: `1px solid ${mc.border}`, color: mc.text, fontWeight: 700 }}>
                              {medal} {person.rank}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>#{person.rank}</span>
                          )}
                        </td>
                        <td style={{ padding: '13px 18px', fontWeight: mc ? 700 : 500, color: mc?.text || 'var(--text-primary)', fontSize: '0.93rem' }}>
                          {person.full_name}
                        </td>
                        <td style={{ padding: '13px 18px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                          {person.chapter || '—'}
                        </td>
                        <td style={{ padding: '13px 18px', textAlign: 'center', fontWeight: 700, color: mc?.text || 'var(--cyan)', fontSize: '1rem' }}>
                          {person.score_this_hackathon.toFixed(2)}
                        </td>
                        <td style={{ padding: '13px 18px', textAlign: 'center', fontWeight: 700, color: mc?.text || 'var(--text-primary)', fontSize: '1rem' }}>
                          {person.cumulative_score > 0
                            ? person.cumulative_score.toFixed(2)
                            : <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', padding: '2px 8px', borderRadius: 4 }}>Pending</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p style={s.note}>
            * Điểm kỳ này do ban tổ chức nhập. Điểm tích lũy cộng dồn qua các mùa.
          </p>
        </div>

        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </FeatureGate>
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
  emptyCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '60px 40px', textAlign: 'center', boxShadow: 'var(--shadow-cyan)' },
  backBtn: { background: 'var(--gradient-primary)', color: 'white', padding: '10px 24px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-cyan)' },
  note: { marginTop: 18, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' },
};
