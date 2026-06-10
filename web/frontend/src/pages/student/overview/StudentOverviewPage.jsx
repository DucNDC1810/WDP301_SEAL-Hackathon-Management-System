import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, Tag } from 'antd';
import { OrderedListOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth }  from '../../../context/AuthContext';
import { useApi }   from '../../../hooks/useApi';
import '../student.css';

// ── SVG icon helper ────────────────────────────────────────────────────────
const Ico = ({ d, size = 16, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const NEWS_D   = ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'];
const TROPHY_D = ['M6 9H2v1a4 4 0 0 0 4 4', 'M22 9h-4v1a4 4 0 0 0 4 4', 'M8 21h8', 'M12 21v-4', 'M17 3H7l-1 6a5 5 0 0 0 10 0l-1-6z'];
const BAR_D    = ['M18 20V10', 'M12 20V4', 'M6 20v-6'];
const CLOCK_D  = ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M12 6v6l4 2'];

// ── Mock news ──────────────────────────────────────────────────────────────
const MOCK_NEWS = [
  {
    id: 1,
    tag: 'Thông báo',
    accent: '#00d4ff',
    bg: '#00d4ff0d',
    title: 'Hạn nộp bài vòng 1 được gia hạn thêm 3 ngày',
    body: 'Ban tổ chức quyết định gia hạn do phản hồi từ các đội thi. Hạn mới: 20/06/2026.',
    time: '2 giờ trước',
  },
  {
    id: 2,
    tag: 'Kết quả',
    accent: '#22c55e',
    bg: '#22c55e0d',
    title: 'Danh sách đội thi vào vòng 2 đã được công bố',
    body: '32 đội xuất sắc từ vòng 1 đã được chọn để tham gia vòng 2 Hackathon SEAL 2026.',
    time: '1 ngày trước',
  },
  {
    id: 3,
    tag: 'Workshop',
    accent: '#a78bfa',
    bg: '#a78bfa0d',
    title: 'Workshop "Thiết kế API RESTful" — Thứ 6 tuần này',
    body: 'Mentor Nguyễn Văn A sẽ hướng dẫn thiết kế API chuẩn REST. Đăng ký trước 18/06.',
    time: '2 ngày trước',
  },
];

// ── Mock ranking (top 5 in pool) ───────────────────────────────────────────
const MOCK_RANKING = [
  { rank: 1, team: 'Alpha Strike', score: 980, change: +12 },
  { rank: 2, team: 'Code Ninjas',  score: 945, change: +8  },
  { rank: 3, team: 'DevStorm',     score: 921, change: +5  },
  { rank: 4, team: 'ByteForce',    score: 890, change:  0  },
  { rank: 5, team: 'NightOwls',    score: 872, change: -3  },
];

const RANK_COLOR = { 1: '#f5c80b', 2: '#94a3b8', 3: '#cd7f32' };

export const StudentOverviewPage = () => {
  const { user }    = useAuth();
  const { request } = useApi();
  const navigate    = useNavigate();

  const [contests,   setContests]   = useState([]);
  const [myTeam,     setMyTeam]     = useState(null);
  const [contest,    setContest]    = useState(null);
  const [submission, setSubmission] = useState(null);
  const [rank,       setRank]       = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [contestsRes, teamsRes] = await Promise.all([
          request('/api/contests?status=open'),
          request('/api/teams/me'),
        ]);
        const openContests = Array.isArray(contestsRes) ? contestsRes : contestsRes?.data ?? [];
        const teams        = Array.isArray(teamsRes)    ? teamsRes    : teamsRes?.data    ?? [];
        setContests(openContests);

        if (!teams.length) { setLoading(false); return; }

        const team = teams.find((t) =>
          openContests.some((c) => (c._id ?? c) === (t.contest_id?._id ?? t.contest_id))
        ) ?? teams[0];
        setMyTeam(team);

        const contestId = team.contest_id?._id ?? team.contest_id;
        const found     = openContests.find((c) => (c._id ?? c) === contestId);
        setContest(found ?? null);

        if (team.status !== 'confirmed' || !found) { setLoading(false); return; }

        const activeRound = found.rounds?.find((r) => r.is_active);
        if (!activeRound) { setLoading(false); return; }

        await Promise.allSettled([
          request(`/api/submissions?round_id=${activeRound._id}`).then((res) => {
            const subs = Array.isArray(res) ? res : res?.data ?? [];
            setSubmission(subs.find((s) => (s.team_id?._id ?? s.team_id) === team._id) ?? null);
          }),
          request(`/api/contests/${contestId}/rounds/${activeRound._id}/rankings`).then((res) => {
            const list = Array.isArray(res) ? res : res?.data ?? [];
            setRank(list.find((r) => (r.team_id?._id ?? r.team_id) === team._id) ?? null);
          }),
        ]);
      } catch (_) {
        // show empty states
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="sp-loading">
        <div className="sp-spinner" />
      </div>
    );
  }

  // ── No team ───────────────────────────────────────────────────────────────
  if (!myTeam) {
    return (
      <div className="sp-page">
        <h2 className="sp-page-title">Các cuộc thi đang mở</h2>

        {contests.length === 0 ? (
          <Empty description="Hiện chưa có cuộc thi nào đang mở đăng ký." />
        ) : (
          <div className="sp-contest-grid">
            {contests.map((c) => {
              const reg  = c.registration_deadline ? new Date(c.registration_deadline) : null;
              const days = reg ? Math.max(0, Math.ceil((reg - Date.now()) / 86_400_000)) : null;
              return (
                <div className="sp-card sp-card--hover" key={c._id}>
                  <span className="sp-strong" style={{ display: 'block', fontSize: 15, marginBottom: 6 }}>
                    {c.title}
                  </span>
                  {days !== null && (
                    <span
                      className={days <= 3 ? 'sp-warning' : 'sp-accent'}
                      style={{ fontSize: 12, display: 'block', marginBottom: 10 }}
                    >
                      Đăng ký còn {days} ngày
                    </span>
                  )}
                  <button
                    className="sp-btn sp-btn--sm"
                    onClick={() => navigate('/dashboard/team')}
                  >
                    <TeamOutlined />
                    Tham gia
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Pending ───────────────────────────────────────────────────────────────
  if (myTeam.status === 'pending') {
    return (
      <div className="sp-page">
        <h2 className="sp-page-title">Tổng quan</h2>
        <div className="sp-card sp-card--warning">
          <span className="sp-warning">
            Đội <strong>{myTeam.team_name}</strong> đang chờ admin phê duyệt.
            Các tính năng sẽ mở sau khi được xác nhận.
          </span>
        </div>
      </div>
    );
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  const activeRound = contest?.rounds?.find((r) => r.is_active);
  const deadline    = activeRound?.submission_deadline ? new Date(activeRound.submission_deadline) : null;
  const daysLeft    = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 86_400_000)) : null;
  const roundStart  = activeRound?.start_time ? new Date(activeRound.start_time).getTime() : null;
  const roundEnd    = activeRound?.end_time   ? new Date(activeRound.end_time).getTime()   : null;
  const progressPct = (roundStart && roundEnd && roundEnd > roundStart)
    ? Math.min(100, Math.round(((Date.now() - roundStart) / (roundEnd - roundStart)) * 100))
    : null;

  const contestId = contest?._id;

  // Mock member contributions (seeded from member index for determinism)
  const memberContribs = (myTeam.members ?? []).map((m, i) => {
    const seeds   = [72, 58, 45, 31, 20];
    const commits = seeds[i % seeds.length];
    const tasks   = [8, 6, 5, 3, 2][i % 5];
    const reviews = [3, 2, 4, 1, 2][i % 5];
    return { member: m, commits, tasks, reviews, score: commits + tasks * 2 + reviews };
  });
  const maxScore = Math.max(...memberContribs.map((c) => c.score), 1);

  // Ranking: inject the team's real position if rank data exists
  const rankingRows = rank
    ? MOCK_RANKING.map((r) =>
        r.rank === rank.rank
          ? { ...r, team: myTeam.team_name, score: rank.score ?? r.score, isMine: true }
          : r
      )
    : MOCK_RANKING.map((r, i) =>
        i === 2 ? { ...r, team: myTeam.team_name, isMine: true } : r
      );

  return (
    <div className="sp-page">
      {/* Header row */}
      <div className="sp-flex--between">
        <h2 className="sp-page-title" style={{ margin: 0 }}>Tổng quan</h2>
        {activeRound && contestId && (
          <button
            className="sp-btn sp-btn--sm"
            onClick={() => navigate(`/leaderboard/${contestId}/${activeRound._id}`)}
          >
            <OrderedListOutlined />
            Leaderboard
          </button>
        )}
      </div>

      {/* Phase bar */}
      {activeRound && (
        <div className="sp-card">
          <div className="sp-flex--between">
            <div>
              <span className="sp-strong">{contest?.title}</span>
              <span className="sp-muted" style={{ marginLeft: 8 }}>{activeRound.name}</span>
            </div>
            {daysLeft !== null && (
              <Tag color={daysLeft <= 1 ? 'red' : daysLeft <= 3 ? 'orange' : 'cyan'}>
                Còn {daysLeft} ngày nộp bài
              </Tag>
            )}
          </div>
          {progressPct !== null && (
            <div className="sp-progress-wrap">
              <div className="sp-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          )}
        </div>
      )}

      {/* 2×2 stat grid */}
      <div className="sp-stat-grid">
        <div className="sp-stat-card sp-stat-card--cyan">
          <span className="sp-stat-label">ĐỘI</span>
          <span className="sp-stat-value">{myTeam.team_name}</span>
          <span className="sp-stat-sub">{myTeam.members?.length ?? 1} thành viên</span>
        </div>

        <div className="sp-stat-card sp-stat-card--purple">
          <span className="sp-stat-label">ĐỀ TÀI</span>
          <span className="sp-stat-value" style={{ fontSize: '0.88rem' }}>
            {myTeam.topic_id?.title ?? 'Chưa có'}
          </span>
          {myTeam.topic_id && (
            <Tag color={myTeam.topic_id.status === 'approved' ? 'green' : 'orange'} style={{ marginTop: 4, fontSize: 11 }}>
              {myTeam.topic_id.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
            </Tag>
          )}
        </div>

        <div className="sp-stat-card sp-stat-card--amber">
          <span className="sp-stat-label">NỘP BÀI</span>
          <span className="sp-stat-value">
            <Tag color={submission ? 'green' : 'orange'}>
              {submission ? 'Đã nộp' : 'Chưa nộp'}
            </Tag>
          </span>
        </div>

        <div className="sp-stat-card sp-stat-card--pink">
          <span className="sp-stat-label">XẾP HẠNG</span>
          <span className="sp-stat-value">{rank ? `#${rank.rank}` : '#3'}</span>
          <span className="sp-stat-sub" style={{ color: '#8899aa' }}>
            {myTeam.pool_id?.pool_name ?? 'Pool A'}
          </span>
        </div>
      </div>

      {/* News strip */}
      <div>
        <div className="sp-flex sp-gap-2" style={{ marginBottom: 10 }}>
          <Ico d={NEWS_D} size={15} />
          <span className="sp-label" style={{ margin: 0 }}>Tin tức & Thông báo</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {MOCK_NEWS.map((n) => (
            <div
              key={n.id}
              className="sp-card sp-card--hover"
              style={{
                borderTopWidth: 2,
                borderTopColor: n.accent,
                padding: '14px 16px',
                cursor: 'pointer',
              }}
            >
              <div className="sp-flex--between" style={{ marginBottom: 8 }}>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '.4px', color: n.accent,
                  background: n.bg, padding: '2px 8px', borderRadius: 4,
                }}>
                  {n.tag}
                </span>
                <span className="sp-flex sp-gap-2" style={{ color: 'var(--pg-muted, #4a6080)', fontSize: '0.72rem' }}>
                  <Ico d={CLOCK_D} size={11} />
                  {n.time}
                </span>
              </div>
              <div className="sp-strong" style={{ fontSize: '0.83rem', marginBottom: 6, lineHeight: 1.4 }}>
                {n.title}
              </div>
              <div className="sp-muted" style={{ fontSize: '0.76rem', lineHeight: 1.5 }}>
                {n.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: ranking + contributions */}
      <div className="sp-row" style={{ alignItems: 'flex-start' }}>

        {/* Mini ranking board */}
        <div>
          <div className="sp-flex sp-gap-2" style={{ marginBottom: 10 }}>
            <Ico d={TROPHY_D} size={15} />
            <span className="sp-label" style={{ margin: 0 }}>
              Bảng xếp hạng — {myTeam.pool_id?.pool_name ?? 'Pool A'}
            </span>
          </div>
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Đội thi</th>
                  <th style={{ width: 70, textAlign: 'right' }}>Điểm</th>
                  <th style={{ width: 60, textAlign: 'right' }}>+/-</th>
                </tr>
              </thead>
              <tbody>
                {rankingRows.map((r) => (
                  <tr key={r.rank} style={r.isMine ? { background: '#00d4ff08' } : {}}>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: RANK_COLOR[r.rank] ?? 'var(--pg-muted, #4a6080)',
                        fontSize: r.rank <= 3 ? '0.9rem' : '0.83rem',
                      }}>
                        {r.rank}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        color: r.isMine ? 'var(--pg-accent, #00d4ff)' : 'var(--pg-text2, #c9d6e8)',
                        fontWeight: r.isMine ? 600 : 400,
                      }}>
                        {r.team}
                      </span>
                      {r.isMine && (
                        <span style={{
                          marginLeft: 6, fontSize: '0.65rem', color: 'var(--pg-accent, #00d4ff)',
                          border: '1px solid var(--pg-accent-bd, #00d4ff40)',
                          padding: '0px 5px', borderRadius: 3,
                        }}>
                          Đội bạn
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--pg-text2, #c9d6e8)' }}>
                      {r.score}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.76rem',
                      color: r.change > 0 ? 'var(--pg-green, #22c55e)'
                           : r.change < 0 ? 'var(--pg-red, #f87171)'
                           : 'var(--pg-muted, #4a6080)',
                    }}>
                      {r.change > 0 ? `+${r.change}` : r.change === 0 ? '—' : r.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Member contributions */}
        <div>
          <div className="sp-flex sp-gap-2" style={{ marginBottom: 10 }}>
            <Ico d={BAR_D} size={15} />
            <span className="sp-label" style={{ margin: 0 }}>Đóng góp thành viên</span>
          </div>
          <div className="sp-card" style={{ padding: '16px 20px' }}>
            {memberContribs.length === 0 ? (
              <span className="sp-muted">Chưa có dữ liệu.</span>
            ) : (
              <div className="sp-stack" style={{ gap: 14 }}>
                {memberContribs.map(({ member, commits, tasks, reviews, score }) => {
                  const pct = Math.round((score / maxScore) * 100);
                  return (
                    <div key={member.email}>
                      <div className="sp-flex--between" style={{ marginBottom: 5 }}>
                        <div className="sp-flex sp-gap-3">
                          <div className="sp-av sp-av--sm">
                            {(member.full_name?.[0] ?? member.email?.[0] ?? 'U').toUpperCase()}
                          </div>
                          <div>
                            <div className="sp-strong" style={{ fontSize: '0.83rem' }}>
                              {member.full_name || member.email?.split('@')[0]}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--pg-muted, #4a6080)' }}>
                              {commits} commits · {tasks} tasks · {reviews} reviews
                            </div>
                          </div>
                        </div>
                        <span className="sp-accent" style={{ fontWeight: 700, fontSize: '0.83rem' }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={{
                        height: 5, borderRadius: 3,
                        background: 'var(--pg-thead, #0a1220)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, var(--pg-accent, #00d4ff), #7c3aed)`,
                          transition: 'width .5s',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="sp-flex sp-gap-4" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--pg-border, #162036)' }}>
              {[
                { label: 'Commits', color: 'var(--pg-accent, #00d4ff)' },
                { label: 'Tasks ×2', color: '#7c3aed' },
                { label: 'Reviews', color: 'var(--pg-green, #22c55e)' },
              ].map((item) => (
                <div key={item.label} className="sp-flex sp-gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--pg-muted, #4a6080)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
