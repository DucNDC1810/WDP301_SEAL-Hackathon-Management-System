import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPrizes } from '../../api/prize';

const RANK_MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const RANK_COLOR = {
  1: { glow: '#facc15', border: 'rgba(250,204,21,.35)', bg: 'rgba(250,204,21,.07)', text: '#facc15' },
  2: { glow: '#94a3b8', border: 'rgba(148,163,184,.35)', bg: 'rgba(148,163,184,.07)', text: '#94a3b8' },
  3: { glow: '#cd7f32', border: 'rgba(205,127,50,.35)',  bg: 'rgba(205,127,50,.07)',  text: '#cd7f32' },
};

export default function PrizePage() {
  const { contest_id } = useParams();
  const navigate = useNavigate();

  const [prizes,  setPrizes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Lấy team của user hiện tại từ localStorage (nếu có)
  const myTeamId = localStorage.getItem('teamId') || null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getPrizes(contest_id);
        setPrizes(res.data?.prizes || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Lỗi tải dữ liệu giải thưởng');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contest_id]);

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: 'var(--cyan)', letterSpacing: 1, fontFamily: 'var(--font-display)' }}>ĐANG TẢI...</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <span style={{ fontSize: '3rem' }}>⚠️</span>
      <p style={{ color: '#ef4444', marginTop: 12 }}>{error}</p>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.container}>

        <header style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 className="gradient-text glow-text" style={s.title}>GIẢI THƯỞNG</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '0.95rem' }}>
            Danh sách giải thưởng và đội nhận giải của cuộc thi
          </p>
        </header>

        {prizes.length === 0 ? (
          <div style={s.emptyCard}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🏆</span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Chưa có giải thưởng nào được công bố cho cuộc thi này.
            </p>
          </div>
        ) : (
          <div style={s.grid}>
            {prizes.map((prize) => {
              const rc = RANK_COLOR[prize.rank_required] || { glow: 'var(--cyan)', border: 'rgba(0,240,255,.25)', bg: 'rgba(0,240,255,.04)', text: 'var(--cyan)' };
              const medal = RANK_MEDAL[prize.rank_required] || '🏅';
              const isMyTeam = myTeamId && prize.awarded_team?.team_id?.toString() === myTeamId;

              return (
                <div key={prize.prize_id} style={{ ...s.card, borderColor: rc.border, background: rc.bg, boxShadow: `0 0 24px ${rc.glow}22` }}>
                  {/* Medal + rank */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: '2rem' }}>{medal}</span>
                    {prize.rank_required && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: rc.text, background: `${rc.glow}18`, border: `1px solid ${rc.border}`, padding: '2px 9px', borderRadius: 4 }}>
                        Hạng {prize.rank_required}
                      </span>
                    )}
                  </div>

                  {/* Prize name */}
                  <h2 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: rc.text, fontFamily: 'var(--font-display)' }}>
                    {prize.name}
                  </h2>

                  {/* Description */}
                  {prize.description && (
                    <p style={{ margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {prize.description}
                    </p>
                  )}

                  {/* Value */}
                  {prize.value && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,240,255,.06)', border: '1px solid rgba(0,240,255,.2)', borderRadius: 8, padding: '6px 14px', marginBottom: 16 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Giá trị:</span>
                      <span style={{ fontWeight: 700, color: 'var(--cyan)', fontSize: '0.95rem' }}>{prize.value}</span>
                    </div>
                  )}

                  {/* Awarded team */}
                  <div style={{ borderTop: `1px solid ${rc.border}`, paddingTop: 14, marginTop: 4 }}>
                    {prize.awarded_team ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <p style={{ margin: '0 0 3px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Đội nhận giải</p>
                          <p style={{ margin: 0, fontWeight: 700, color: rc.text, fontSize: '1rem' }}>
                            {prize.awarded_team.team_name}
                          </p>
                        </div>
                        {isMyTeam && (
                          <button
                            onClick={() => navigate(`/prize/${prize.prize_id}/claim/${myTeamId}`)}
                            style={s.claimBtn}
                          >
                            📋 Điền thông tin nhận thưởng
                          </button>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Chưa công bố đội nhận giải
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const s = {
  page:      { background: 'var(--bg-primary)', minHeight: '100vh', padding: '48px 24px', color: 'var(--text-primary)' },
  container: { maxWidth: 900, margin: '0 auto' },
  center:    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', gap: 12, textAlign: 'center' },
  title:     { fontSize: '2.2rem', fontWeight: 800, letterSpacing: 3, fontFamily: 'var(--font-display)', textTransform: 'uppercase', margin: 0 },
  spinner:   { width: 48, height: 48, border: '4px solid rgba(0,240,255,.1)', borderTop: '4px solid var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 },
  card:      { border: '1px solid', borderRadius: 16, padding: '24px 22px', backdropFilter: 'blur(10px)', transition: 'transform .15s', display: 'flex', flexDirection: 'column' },
  emptyCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '60px 40px', textAlign: 'center' },
  claimBtn:  { padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', background: 'var(--gradient-primary)', color: 'white', border: 'none', boxShadow: 'var(--shadow-cyan)', whiteSpace: 'nowrap' },
};
