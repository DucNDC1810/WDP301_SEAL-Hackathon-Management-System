import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Spin, Tooltip, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

const STATUS_CFG = {
  active:   { label: 'Đang diễn ra', color: '#f59e0b', dot: '#f59e0b' },
  ended:    { label: 'Đã kết thúc',  color: '#10b981', dot: '#10b981' },
  upcoming: { label: 'Chưa bắt đầu', color: '#60a5fa', dot: '#60a5fa' },
};

function mapRoundStatus(r) {
  if (r.is_active) return 'active';
  if (r.scoring_locked || !r.is_active) return 'ended';
  return 'upcoming';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function JudgeHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get my judge assignments
        const [assignmentsRes, contestsRes] = await Promise.all([
          request('/api/judge-assignments/me'),
          request('/api/contests'),
        ]);

        const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes?.data ?? []);
        const allContests = Array.isArray(contestsRes) ? contestsRes : (contestsRes?.data ?? []);

        // Group assignments by contest → round
        const assignMap = {}; // contestId → { roundId → teamCount }
        assignments.forEach(a => {
          const cid = (a.contest_id?._id || a.contest_id)?.toString();
          const rid = (a.round_id?._id || a.round_id)?.toString();
          if (!cid || !rid) return;
          if (!assignMap[cid]) assignMap[cid] = {};
          assignMap[cid][rid] = (assignMap[cid][rid] || 0) + 1;
        });

        // Only show contests where judge has assignments
        const assignedContestIds = Object.keys(assignMap);
        const filtered = allContests.filter(c => assignedContestIds.includes(c._id?.toString()));

        setContests(filtered.map(c => {
          const cid = c._id?.toString();
          const roundAssigns = assignMap[cid] || {};
          return {
            id: c._id,
            name: c.title,
            startDate: c.start_date,
            endDate: c.end_date,
            status: c.status,
            rounds: (c.rounds || [])
              .filter(r => roundAssigns[r._id?.toString()])
              .map(r => ({
                id: r._id,
                name: r.name,
                status: mapRoundStatus(r),
                is_active: r.is_active,
                scoring_locked: r.scoring_locked,
                teamCount: roundAssigns[r._id?.toString()] || 0,
              })),
          };
        }));
      } catch {
        messageApi.error('Không thể tải dữ liệu phân công');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalRounds = contests.reduce((s, c) => s + c.rounds.length, 0);
  const readyRounds = contests.reduce((s, c) => s + c.rounds.filter(r => r.status === 'ended').length, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {contextHolder}

      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 56, borderBottom: '1px solid rgba(255,255,255,0.08)',
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
              background: 'linear-gradient(135deg, #00d4ff22, #00d4ff44)',
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
            padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem',
          }}>
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '32px 24px 16px', maxWidth: 880, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0 }}>
          Xin chào, <span style={{ color: '#00d4ff' }}>{user?.full_name?.split(' ').pop()}</span> 👋
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: 6, marginBottom: 0 }}>
          Bạn được phân công chấm điểm. Chỉ có thể chấm sau khi vòng thi kết thúc.
        </p>

        {/* Stats */}
        {!loading && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Cuộc thi',             value: contests.length,  color: '#00d4ff' },
              { label: 'Vòng được phân công',  value: totalRounds,      color: '#a855f7' },
              { label: 'Vòng sẵn sàng chấm',  value: readyRounds,      color: '#10b981' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '12px 20px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                minWidth: 120,
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '8px 24px 48px', maxWidth: 880, margin: '0 auto' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Cuộc thi được phân công
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        )}

        {!loading && contests.length === 0 && (
          <div style={{
            padding: 48, textAlign: 'center', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚖</div>
            <div style={{ fontWeight: 600 }}>Chưa được phân công chấm cuộc thi nào</div>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Liên hệ Admin để được phân công</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {contests.map(contest => (
            <div key={contest.id} style={{
              borderRadius: 12, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              {/* Contest header */}
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(168,85,247,0.06))',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{contest.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  {fmtDate(contest.startDate)} → {fmtDate(contest.endDate)}
                </div>
              </div>

              {/* Rounds */}
              <div style={{ padding: '8px 0' }}>
                {contest.rounds.length === 0 && (
                  <div style={{ padding: '12px 20px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                    Chưa có vòng được phân công
                  </div>
                )}
                {contest.rounds.map((round, idx) => {
                  const sc = STATUS_CFG[round.status];
                  const canScore = round.status === 'ended';
                  return (
                    <div key={round.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 20px', flexWrap: 'wrap',
                      borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      {/* Status dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: sc.dot, flexShrink: 0,
                        boxShadow: canScore ? `0 0 6px ${sc.dot}` : 'none',
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                          {round.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                          {round.teamCount} đội cần chấm
                        </div>
                      </div>

                      <Tag color={sc.dot === '#f59e0b' ? 'orange' : sc.dot === '#10b981' ? 'green' : 'blue'}
                        style={{ fontSize: '0.65rem' }}>
                        {sc.label}
                      </Tag>

                      <Tooltip title={!canScore ? 'Vòng thi chưa kết thúc — không thể chấm điểm' : 'Bắt đầu chấm điểm'}>
                        <button
                          disabled={!canScore}
                          onClick={() => navigate(`/judge/scoring/${contest.id}/rounds/${round.id}`)}
                          style={{
                            padding: '6px 14px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
                            cursor: canScore ? 'pointer' : 'not-allowed',
                            border: `1px solid ${canScore ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            background: canScore ? 'rgba(0,212,255,0.1)' : 'transparent',
                            color: canScore ? '#00d4ff' : 'rgba(255,255,255,0.25)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {canScore ? '⚖ Chấm điểm' : '🔒 Chờ kết thúc'}
                        </button>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
