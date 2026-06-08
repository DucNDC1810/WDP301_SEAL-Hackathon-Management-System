import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Spin, Tooltip, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function JudgeHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [groups, setGroups] = useState([]); // [{contest, round, pool, assignment}]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignRes, contestRes] = await Promise.all([
          request('/api/judge-assignments/me'),
          request('/api/contests'),
        ]);

        const assignments = Array.isArray(assignRes) ? assignRes : (assignRes?.data ?? []);
        const allContests = Array.isArray(contestRes) ? contestRes : (contestRes?.data ?? []);
        const contestMap = Object.fromEntries(allContests.map(c => [c._id?.toString(), c]));

        const built = assignments
          .filter(a => a.invitation_status !== 'pending_invite') // bỏ chờ xác nhận
          .map(a => {
            const cid = (a.contest_id?._id || a.contest_id)?.toString();
            const contest = contestMap[cid] || {};
            const round = (contest.rounds || []).find(
              r => r._id?.toString() === (a.round_id?._id || a.round_id)?.toString()
            ) || {};

            const pool = a.pool_id || {};
            const teams = Array.isArray(pool.teams) ? pool.teams : [];

            const roundEnded = !round.is_active;

            return {
              key: a._id,
              contestId: cid,
              contestName: contest.title || '—',
              contestStart: contest.start_date,
              contestEnd: contest.end_date,
              roundId: round._id?.toString(),
              roundName: round.name || '—',
              roundActive: round.is_active,
              roundEnded,
              poolId: (pool._id || a.pool_id)?.toString(),
              poolName: pool.pool_name || '—',
              teamCount: teams.length,
              assignmentType: a.judge_type,
            };
          });

        setGroups(built);
      } catch {
        messageApi.error('Không thể tải dữ liệu phân công');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Group by contest for display
  const byContest = groups.reduce((acc, g) => {
    if (!acc[g.contestId]) acc[g.contestId] = { ...g, rounds: [] };
    acc[g.contestId].rounds.push(g);
    return acc;
  }, {});

  const totalPools = groups.length;
  const readyPools = groups.filter(g => g.roundEnded).length;
  const totalTeams = groups.reduce((s, g) => s + g.teamCount, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {contextHolder}

      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 56,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#00d4ff', letterSpacing: 1 }}>SEAL</span>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Judge Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg,#00d4ff22,#00d4ff44)',
              border: '1px solid rgba(0,212,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#00d4ff', fontSize: '0.85rem',
            }}>
              {(user?.full_name || 'J')[0]}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{user?.full_name}</div>
              <div style={{ fontSize: '0.65rem', color: '#00d4ff' }}>⚖ Giám khảo</div>
            </div>
          </div>
          <button onClick={logout} style={{
            padding: '4px 12px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: '0.8rem',
          }}>
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '32px 24px 16px', maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>
          Xin chào, <span style={{ color: '#00d4ff' }}>{user?.full_name?.split(' ').pop()}</span> 👋
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: 6, marginBottom: 0 }}>
          Bạn chấm điểm theo bảng. Mỗi bảng bao gồm tất cả đội trong đó.
        </p>

        {!loading && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Bảng được phân công', value: totalPools,  color: '#00d4ff' },
              { label: 'Đội cần chấm',         value: totalTeams,  color: '#a855f7' },
              { label: 'Bảng sẵn sàng chấm',   value: readyPools, color: '#10b981' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '12px 20px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', minWidth: 130,
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div style={{ padding: '8px 24px 48px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Bảng chấm điểm của tôi
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>}

        {!loading && groups.length === 0 && (
          <div style={{
            padding: 48, textAlign: 'center', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚖</div>
            <div style={{ fontWeight: 600 }}>Chưa được phân công bảng chấm nào</div>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Liên hệ Admin để được phân công</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.values(byContest).map(c => (
            <div key={c.contestId} style={{
              borderRadius: 12, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              {/* Contest header */}
              <div style={{
                padding: '14px 20px',
                background: 'linear-gradient(135deg,rgba(0,212,255,0.06),rgba(168,85,247,0.06))',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{c.contestName}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                  {fmtDate(c.contestStart)} → {fmtDate(c.contestEnd)}
                </div>
              </div>

              {/* Assignments */}
              {c.rounds.map((g, idx) => {
                const canScore = g.roundEnded;
                return (
                  <div key={g.key} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 20px', flexWrap: 'wrap',
                    borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    {/* Status dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: canScore ? '#10b981' : '#f59e0b',
                      boxShadow: canScore ? '0 0 6px #10b981' : 'none',
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                          {g.roundName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>·</span>
                        <span style={{ fontSize: '0.85rem', color: '#a855f7', fontWeight: 600 }}>
                          {g.poolName}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                        {g.teamCount} đội trong bảng · chấm tất cả
                      </div>
                    </div>

                    <Tag
                      color={canScore ? 'green' : 'orange'}
                      style={{ fontSize: '0.65rem' }}
                    >
                      {canScore ? 'Sẵn sàng chấm' : 'Đang diễn ra'}
                    </Tag>

                    <Tooltip title={!canScore ? 'Vòng thi chưa kết thúc — chưa thể chấm điểm' : 'Chấm điểm bảng này'}>
                      <button
                        disabled={!canScore}
                        onClick={() => navigate(`/judge/scoring/${g.contestId}/rounds/${g.roundId}/pools/${g.poolId}`)}
                        style={{
                          padding: '6px 16px', borderRadius: 6,
                          fontSize: '0.8rem', fontWeight: 600,
                          cursor: canScore ? 'pointer' : 'not-allowed',
                          border: `1px solid ${canScore ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          background: canScore ? 'rgba(0,212,255,0.1)' : 'transparent',
                          color: canScore ? '#00d4ff' : 'rgba(255,255,255,0.25)',
                          transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                      >
                        {canScore ? '⚖ Chấm điểm' : '🔒 Chờ kết thúc'}
                      </button>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
