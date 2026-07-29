import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Typography, message } from 'antd';
import { useSocket } from '../../hooks/useSocket';
import RefreshButton from '../../components/RefreshButton';
import LeaderboardTable from '../../components/LeaderboardTable';
import './LeaderboardPage.css';

const { Title } = Typography;
const API = import.meta.env.VITE_API_URL || '';

export default function LeaderboardPage() {
  const { contestId, roundId } = useParams();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updated, setUpdated]   = useState(false);
  const [activePoolTab, setActivePoolTab] = useState('');

  const token = localStorage.getItem('accessToken');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/contests/${contestId}/rounds/${roundId}/rankings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      setRankings(data?.data ?? data);
      setLoading(false);
    } catch {
      message.error('Không thể tải bảng xếp hạng');
      setLoading(false);
    }
  }, [contestId, roundId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSocket(contestId, roundId, ({ rankings: newRankings }) => {
    setRankings(newRankings);
    setUpdated(true);
    setTimeout(() => setUpdated(false), 3000);
  });

  const formattedRankings = rankings.map((r, i) => ({
    team_id: r._id,
    team_name: r.team_name,
    weighted_avg_score: r.final_score || 0,
    rank: r.rank_position || (i + 1),
    poolName: r.board_id ? r.board_id.pool_name : null,
    isFinalRound: r.is_final_round || false,
  }));

  useEffect(() => {
    if (formattedRankings.length > 0) {
      const isFinal = formattedRankings[0].isFinalRound;
      if (!isFinal) {
        const pools = Array.from(new Set(formattedRankings.map(item => item.poolName || "Chưa phân bảng")));
        if (pools.length > 0 && !pools.includes(activePoolTab)) {
          setActivePoolTab(pools[0]);
        }
      }
    }
  }, [rankings]);

  return (
    <div className="leaderboard" style={{ padding: '24px', animation: 'slideUp 0.3s ease-out' }}>
      <div className="leaderboard__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={3} style={{ margin: 0, textShadow: '0 0 10px rgba(0, 240, 255, 0.2)' }}>Bảng Xếp Hạng</Title>
          {updated && <Badge status="processing" text="Vừa cập nhật" style={{ marginTop: 4 }} />}
        </div>
        <RefreshButton onRefresh={fetchData} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#7f9bb3' }}>
          <p>Đang tải bảng xếp hạng...</p>
        </div>
      ) : formattedRankings.length > 0 ? (
        (() => {
          const isFinal = formattedRankings[0].isFinalRound;

          if (isFinal) {
            return (
              <LeaderboardTable groupName="Kết quả chung cuộc" teams={formattedRankings} />
            );
          }

          const grouped = {};
          formattedRankings.forEach(item => {
            const key = item.poolName || "Chưa phân bảng";
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
          });

          const pools = Object.keys(grouped);
          const currentPool = activePoolTab || pools[0] || "Chưa phân bảng";
          const teamsInPool = grouped[currentPool] || [];
          const sortedTeams = [...teamsInPool].sort((a, b) => b.weighted_avg_score - a.weighted_avg_score).map((t, idx) => ({
            ...t,
            rank: idx + 1
          }));

          return (
            <div style={{ marginBottom: 32 }}>
              {/* Horizontal Tabs */}
              <div className="pool-tabs" style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {pools.map(poolName => {
                  const isActive = poolName === currentPool;
                  return (
                    <button
                      key={poolName}
                      onClick={() => setActivePoolTab(poolName)}
                      style={{
                        background: isActive ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        color: isActive ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                        border: isActive ? '1px solid #00d4ff' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '20px',
                        padding: '6px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        outline: 'none'
                      }}
                    >
                      <span>📦</span>
                      <span>{poolName}</span>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: isActive ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        color: isActive ? '#00d4ff' : 'rgba(255, 255, 255, 0.4)',
                        fontWeight: 700
                      }}>
                        {grouped[poolName].length}
                      </span>
                    </button>
                  );
                })}
              </div>

              <LeaderboardTable groupName={currentPool} teams={sortedTeams} />
            </div>
          );
        })()
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          borderRadius: '8px',
          background: 'var(--bg-nest)',
          border: '1px dashed var(--border)'
        }}>
          Chưa có xếp hạng cho vòng thi này.
        </div>
      )}
    </div>
  );
}
