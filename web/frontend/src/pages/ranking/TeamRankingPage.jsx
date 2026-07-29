import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeamRanking } from '../../api/ranking';
import RefreshButton from '../../components/RefreshButton';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

const MEDAL_COLOR = {
  1: { bg: 'rgba(250, 204, 21, 0.12)', border: 'rgba(250, 204, 21, 0.4)', text: '#facc15' },
  2: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.4)', text: '#94a3b8' },
  3: { bg: 'rgba(205, 127, 50, 0.12)', border: 'rgba(205, 127, 50, 0.4)', text: '#cd7f32' },
};

export default function TeamRankingPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unpublished, setUnpublished] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback((mountedRef) => {
    setLoading(true);
    setUnpublished(false);
    setError(null);

    getTeamRanking(round_id)
      .then((res) => {
        if (!mountedRef || mountedRef.current) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mountedRef && !mountedRef.current) return;
        if (err.response?.status === 403) {
          setUnpublished(true);
        } else {
          setError(err.response?.data?.message || 'Đã xảy ra lỗi khi tải bảng xếp hạng.');
        }
        setLoading(false);
      });
  }, [round_id]);

  useEffect(() => {
    const mountedRef = { current: true };
    fetchData(mountedRef);
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>
          ĐANG TẢI BẢNG XẾP HẠNG...
        </p>
        <SpinnerKeyframes />
      </div>
    );
  }

  if (unpublished) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🔒</span>
          <h2 style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '1.5rem' }}>
            KẾT QUẢ CHƯA ĐƯỢC CÔNG BỐ
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
            Vòng thi này chưa kết thúc chấm điểm. Vui lòng quay lại sau khi ban tổ chức công bố kết quả.
          </p>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <div style={{ ...styles.card, borderColor: 'var(--red)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>⚠️</span>
          <h2 style={{ color: 'var(--red)', fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '1.5rem' }}>
            LỖI TRUY CẬP
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>{error}</p>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            Quay lại trang trước
          </button>
        </div>
      </div>
    );
  }

  const teams = data?.teams || [];

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1
            className="gradient-text glow-text"
            style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              letterSpacing: '2px',
              marginBottom: '12px',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
            }}
          >
            BẢNG XẾP HẠNG TEAM
          </h1>

          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            {data?.round_name || 'Vòng thi'}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
            <RefreshButton onRefresh={() => fetchData()} />
          </div>

          {data?.contest_name && (
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem' }}>
              {data.contest_name}
            </p>
          )}
        </header>

        {/* Table */}
        {teams.length === 0 ? (
          <div style={styles.emptyCard}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🏆</span>
            <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '8px' }}>
              Chưa có kết quả thi đấu
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Chưa có đội nào được chấm điểm hoàn tất trong vòng này.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Hạng', 'Tên đội', 'Chapter', 'Điểm TB'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => {
                  const medal = MEDAL[team.rank];
                  const color = MEDAL_COLOR[team.rank];
                  return (
                    <tr
                      key={team.team_id}
                      style={{
                        background: color ? color.bg : 'transparent',
                        borderBottom: '1px solid rgba(0,240,255,0.07)',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ ...styles.td, width: '80px', textAlign: 'center' }}>
                        {medal ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            border: `1px solid ${color.border}`,
                            color: color.text,
                            fontWeight: '700',
                            fontSize: '1rem',
                          }}>
                            {medal} {team.rank}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                            #{team.rank}
                          </span>
                        )}
                      </td>
                      <td style={{ ...styles.td, fontWeight: medal ? '700' : '500', color: color?.text || 'var(--text-primary)' }}>
                        {team.team_name}
                      </td>
                      <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                        {team.chapter || '—'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700', color: color?.text || 'var(--cyan)', fontSize: '1.05rem' }}>
                        {team.weighted_avg_score.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Note */}
        <p style={styles.note}>
          * Kết quả kỳ này — không cộng dồn từ các kỳ trước
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        tr:hover td { background: rgba(0,240,255,0.04); }
      ` }} />
    </div>
  );
}

function SpinnerKeyframes() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    ` }} />
  );
}

const styles = {
  page: {
    background: 'var(--bg-primary)',
    minHeight: '100vh',
    padding: '40px 24px',
    color: 'var(--text-primary)',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    padding: '24px',
    textAlign: 'center',
  },
  card: {
    background: 'rgba(0,240,255,0.05)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '40px 32px',
    maxWidth: '480px',
    backdropFilter: 'blur(12px)',
    boxShadow: 'var(--shadow-cyan)',
    width: '100%',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(0,240,255,0.1)',
    borderTop: '4px solid var(--cyan)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
    boxShadow: 'var(--shadow-cyan)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0,240,255,0.07)',
    border: '1px solid var(--border)',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '0.95rem',
    fontWeight: '500',
    color: 'var(--cyan)',
    boxShadow: '0 0 15px rgba(0,240,255,0.05)',
  },
  badgeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--green)',
    boxShadow: '0 0 8px var(--green)',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid rgba(0,240,255,0.12)',
    boxShadow: 'var(--shadow-cyan)',
    backdropFilter: 'blur(12px)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'rgba(17,24,39,0.7)',
  },
  th: {
    padding: '14px 20px',
    textAlign: 'left',
    fontFamily: 'var(--font-display)',
    fontSize: '0.8rem',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: 'var(--cyan)',
    borderBottom: '1px solid rgba(0,240,255,0.15)',
    background: 'rgba(0,240,255,0.04)',
  },
  td: {
    padding: '14px 20px',
    fontSize: '0.95rem',
  },
  emptyCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '60px 40px',
    textAlign: 'center',
    boxShadow: 'var(--shadow-cyan)',
    backdropFilter: 'blur(12px)',
  },
  backBtn: {
    background: 'var(--gradient-primary)',
    color: 'white',
    padding: '10px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-cyan)',
  },
  note: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
};
