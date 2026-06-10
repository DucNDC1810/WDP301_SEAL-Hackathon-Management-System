import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, Tag } from 'antd';
import { OrderedListOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth }  from '../../../context/AuthContext';
import { useApi }   from '../../../hooks/useApi';

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

const MOCK_NEWS = [
  { id: 1, tag: 'Thông báo', accent: '#00d4ff', bg: '#00d4ff0d', title: 'Hạn nộp bài vòng 1 được gia hạn thêm 3 ngày', body: 'Ban tổ chức quyết định gia hạn do phản hồi từ các đội thi. Hạn mới: 20/06/2026.', time: '2 giờ trước' },
  { id: 2, tag: 'Kết quả',  accent: '#22c55e', bg: '#22c55e0d', title: 'Danh sách đội thi vào vòng 2 đã được công bố', body: '32 đội xuất sắc từ vòng 1 đã được chọn để tham gia vòng 2 Hackathon SEAL 2026.', time: '1 ngày trước' },
  { id: 3, tag: 'Workshop', accent: '#a78bfa', bg: '#a78bfa0d', title: 'Workshop "Thiết kế API RESTful" — Thứ 6 tuần này', body: 'Mentor Nguyễn Văn A sẽ hướng dẫn thiết kế API chuẩn REST. Đăng ký trước 18/06.', time: '2 ngày trước' },
];

const MOCK_RANKING = [
  { rank: 1, team: 'Alpha Strike', score: 980, change: +12 },
  { rank: 2, team: 'Code Ninjas',  score: 945, change: +8  },
  { rank: 3, team: 'DevStorm',     score: 921, change: +5  },
  { rank: 4, team: 'ByteForce',    score: 890, change:  0  },
  { rank: 5, team: 'NightOwls',    score: 872, change: -3  },
];
const RANK_COLOR = { 1: '#f5c80b', 2: '#94a3b8', 3: '#cd7f32' };

const MOCK_ROUNDS = [
  { _id: 'mr0', name: 'Đăng ký',           is_active: false, end_time: '2026-06-10T23:59:00Z' },
  { _id: 'mr1', name: 'Vòng 1 — Sơ loại', is_active: true,  end_time: '2026-06-20T23:59:00Z' },
  { _id: 'mr2', name: 'Vòng 2 — Bán kết', is_active: false, end_time: '2026-06-28T23:59:00Z' },
  { _id: 'mr3', name: 'Chung kết',         is_active: false, end_time: '2026-07-05T23:59:00Z' },
];

// Shared style helpers
const card = { background: '#0c1524', border: '1px solid #162036', borderRadius: 12, padding: '20px 24px' };
const label = { fontSize: '0.72rem', fontWeight: 700, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 };
const gradTitle = { background: 'linear-gradient(90deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' };
const btn = { display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:6, border:'1px solid #00d4ff40', background:'transparent', color:'#00d4ff', fontSize:'0.78rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit' };

export const StudentOverviewPage = () => {
  const { user }    = useAuth();
  const { request } = useApi();
  const navigate    = useNavigate();

  const [contests,   setContests]   = useState([]);
  const [myTeam,     setMyTeam]     = useState(null);
  const [contest,    setContest]    = useState(null);
  const [submission, setSubmission] = useState(null);
  const [rank,       setRank]       = useState(null);
  const [poolName,   setPoolName]   = useState(null);
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

        const team = teams.find((t) => openContests.some((c) => (c._id ?? c) === (t.contest_id?._id ?? t.contest_id))) ?? teams[0];
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
          team.pool_id && request(`/api/pools/contests/${contestId}/pools`).then((res) => {
            const list = Array.isArray(res) ? res : res?.data ?? [];
            const pid  = team.pool_id?._id ?? team.pool_id;
            const pool = list.find((p) => (p._id ?? p) === pid);
            if (pool) setPoolName(pool.pool_name);
          }),
        ]);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-7">
        <div className="w-8 h-8 rounded-full border-2 border-[#162036] border-t-[#00d4ff] animate-spin" />
      </div>
    );
  }

  // No team
  if (!myTeam) {
    return (
      <div className="flex flex-col gap-5 p-7 bg-[#060b16] min-h-full">
        <h2 className="text-2xl font-extrabold m-0" style={gradTitle}>Các cuộc thi đang mở</h2>
        {contests.length === 0 ? (
          <Empty description="Hiện chưa có cuộc thi nào đang mở đăng ký." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
            {contests.map((c) => {
              const reg  = c.registration_deadline ? new Date(c.registration_deadline) : null;
              const days = reg ? Math.max(0, Math.ceil((reg - Date.now()) / 86_400_000)) : null;
              return (
                <div style={{ ...card, transition: 'border-color .25s, box-shadow .25s', cursor: 'default' }} key={c._id}>
                  <span style={{ display: 'block', color: '#c9d6e8', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{c.title}</span>
                  {days !== null && (
                    <span style={{ fontSize: 12, display: 'block', marginBottom: 10, color: days <= 3 ? '#f59e0b' : '#00d4ff' }}>
                      Đăng ký còn {days} ngày
                    </span>
                  )}
                  <button style={btn} onClick={() => navigate('/dashboard/team')}>
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

  // Pending
  if (myTeam.status === 'pending') {
    return (
      <div className="flex flex-col gap-5 p-7 bg-[#060b16] min-h-full">
        <h2 className="text-2xl font-extrabold m-0" style={gradTitle}>Tổng quan</h2>
        <div style={{ ...card, borderColor: 'rgba(245,158,11,0.4)' }}>
          <span style={{ color: '#f59e0b' }}>
            Đội <strong>{myTeam.team_name}</strong> đang chờ admin phê duyệt. Các tính năng sẽ mở sau khi được xác nhận.
          </span>
        </div>
      </div>
    );
  }

  // Confirmed
  const activeRound = contest?.rounds?.find((r) => r.is_active);
  const deadline    = activeRound?.submission_deadline ? new Date(activeRound.submission_deadline) : null;
  const daysLeft    = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 86_400_000)) : null;
  const roundStart  = activeRound?.start_time ? new Date(activeRound.start_time).getTime() : null;
  const roundEnd    = activeRound?.end_time   ? new Date(activeRound.end_time).getTime()   : null;
  const progressPct = (roundStart && roundEnd && roundEnd > roundStart)
    ? Math.min(100, Math.round(((Date.now() - roundStart) / (roundEnd - roundStart)) * 100))
    : null;

  const contestId = contest?._id;
  const timelineRounds = contest?.rounds?.length ? contest.rounds : MOCK_ROUNDS;
  const activeIdx      = timelineRounds.findIndex((r) => r.is_active);

  const memberContribs = (myTeam.members ?? []).map((m, i) => {
    const seeds   = [72, 58, 45, 31, 20];
    const commits = seeds[i % seeds.length];
    const tasks   = [8, 6, 5, 3, 2][i % 5];
    const reviews = [3, 2, 4, 1, 2][i % 5];
    return { member: m, commits, tasks, reviews, score: commits + tasks * 2 + reviews };
  });
  const maxScore = Math.max(...memberContribs.map((c) => c.score), 1);

  const rankingRows = rank
    ? MOCK_RANKING.map((r) => r.rank === rank.rank ? { ...r, team: myTeam.team_name, score: rank.score ?? r.score, isMine: true } : r)
    : MOCK_RANKING.map((r, i) => i === 2 ? { ...r, team: myTeam.team_name, isMine: true } : r);

  return (
    <div className="flex flex-col gap-5 p-7 bg-[#060b16] min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold m-0" style={gradTitle}>Tổng quan</h2>
        {activeRound && contestId && (
          <button style={btn} onClick={() => navigate(`/leaderboard/${contestId}/${activeRound._id}`)}>
            <OrderedListOutlined />
            Leaderboard
          </button>
        )}
      </div>

      {/* Phase bar */}
      {activeRound && (
        <div style={card}>
          <div className="flex items-center justify-between">
            <div>
              <span style={{ color: '#c9d6e8', fontWeight: 600 }}>{contest?.title}</span>
              <span style={{ color: '#4a6080', marginLeft: 8 }}>{activeRound.name}</span>
            </div>
            {daysLeft !== null && (
              <Tag color={daysLeft <= 1 ? 'red' : daysLeft <= 3 ? 'orange' : 'cyan'}>
                Còn {daysLeft} ngày nộp bài
              </Tag>
            )}
          </div>
          {progressPct !== null && (
            <div style={{ height: 6, background: '#0a1220', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${progressPct}%`, background: 'linear-gradient(90deg,#00d4ff,#7c3aed)', transition: 'width .5s' }} />
            </div>
          )}
        </div>
      )}

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {/* Đội */}
        <div style={{ ...card, padding: '14px 16px', borderTopWidth: 2, borderTopColor: '#00d4ff' }}>
          <span style={label}>ĐỘI</span>
          <span style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#c9d6e8', margin: '4px 0 2px' }}>{myTeam.team_name}</span>
          <span style={{ display: 'block', fontSize: '0.72rem', color: '#00d4ff' }}>{myTeam.members?.length ?? 1} thành viên</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {poolName && (
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#00d4ff', background: '#00d4ff14', border: '1px solid #00d4ff40', padding: '2px 8px', borderRadius: 4 }}>
                {poolName}
              </span>
            )}
            {myTeam.topic_id?.title && (
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#a78bfa', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)', padding: '2px 8px', borderRadius: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {myTeam.topic_id.title}
              </span>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ ...card, padding: '14px 16px', borderTopWidth: 2, borderTopColor: '#f59e0b' }}>
          <span style={{ ...label, margin: 0, marginBottom: 8 }}>TIẾN TRÌNH CUỘC THI</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8, position: 'relative' }}>
            {timelineRounds.map((r, i) => {
              const isPast   = activeIdx >= 0 && i < activeIdx;
              const isActive = r.is_active;
              const endDate  = r.end_time ? new Date(r.end_time) : null;
              const dateStr  = endDate ? endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : null;
              return (
                <div key={r._id ?? i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 10, position: 'relative' }}>
                  {i < timelineRounds.length - 1 && (
                    <div style={{ position: 'absolute', left: 5, top: 14, bottom: 0, width: 1, background: isPast ? 'rgba(34,197,94,.3)' : 'rgba(22,32,54,.8)' }} />
                  )}
                  <div style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0, marginTop: 2, zIndex: 1, background: isPast ? '#22c55e' : isActive ? '#00d4ff' : '#162036', border: isActive ? '2px solid #00d4ff60' : isPast ? '2px solid #22c55e60' : '2px solid #1e3050', boxShadow: isActive ? '0 0 6px #00d4ff60' : 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.76rem', lineHeight: 1.3, color: isActive ? '#dce8f5' : isPast ? '#4a6080' : '#2a4060', fontWeight: isActive ? 600 : 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      {dateStr && <span style={{ fontSize: '0.65rem', color: isActive ? '#4a8090' : '#1e3050', flexShrink: 0 }}>{dateStr}</span>}
                    </div>
                    {isActive && (
                      <div style={{ marginTop: 3 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: submission ? '#22c55e' : '#f59e0b', background: submission ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)', border: `1px solid ${submission ? 'rgba(34,197,94,.2)' : 'rgba(245,158,11,.2)'}`, padding: '1px 6px', borderRadius: 3 }}>
                          {submission ? 'Đã nộp bài' : 'Chưa nộp'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* News */}
      <div>
        <div className="flex items-center gap-2 mb-[10px]">
          <Ico d={NEWS_D} size={15} />
          <span style={label}>Tin tức &amp; Thông báo</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {MOCK_NEWS.map((n) => (
            <div key={n.id} style={{ ...card, borderTopWidth: 2, borderTopColor: n.accent, padding: '14px 16px', cursor: 'pointer' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: n.accent, background: n.bg, padding: '2px 8px', borderRadius: 4 }}>{n.tag}</span>
                <span className="flex items-center gap-1" style={{ color: '#4a6080', fontSize: '0.72rem' }}><Ico d={CLOCK_D} size={11} />{n.time}</span>
              </div>
              <div style={{ color: '#c9d6e8', fontWeight: 600, fontSize: '0.83rem', marginBottom: 6, lineHeight: 1.4 }}>{n.title}</div>
              <div style={{ color: '#4a6080', fontSize: '0.76rem', lineHeight: 1.5 }}>{n.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex gap-4 items-start">
        {/* Ranking */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-[10px]">
            <Ico d={TROPHY_D} size={15} />
            <span style={label}>Bảng xếp hạng — {myTeam.pool_id?.pool_name ?? 'Pool A'}</span>
          </div>
          <div style={{ background: '#0c1524', border: '1px solid #162036', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: '#0a1220', borderBottom: '1px solid #162036' }}>
                  {['#', 'Đội thi', 'Điểm', '+/-'].map((h, i) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: i >= 2 ? 'right' : 'left', fontSize: '0.72rem', fontWeight: 700, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px', width: i === 0 ? 40 : i >= 2 ? (i === 2 ? 70 : 60) : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankingRows.map((r) => (
                  <tr key={r.rank} style={{ borderBottom: '1px solid #0f1a2e', background: r.isMine ? '#00d4ff08' : undefined }}>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <span style={{ fontWeight: 700, color: RANK_COLOR[r.rank] ?? '#4a6080', fontSize: r.rank <= 3 ? '0.9rem' : '0.83rem' }}>{r.rank}</span>
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: r.isMine ? '#00d4ff' : '#c9d6e8', fontWeight: r.isMine ? 600 : 400 }}>
                      {r.team}
                      {r.isMine && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#00d4ff', border: '1px solid #00d4ff40', padding: '0px 5px', borderRadius: 3 }}>Đội bạn</span>}
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 600, color: '#c9d6e8' }}>{r.score}</td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontSize: '0.76rem', color: r.change > 0 ? '#22c55e' : r.change < 0 ? '#f87171' : '#4a6080' }}>
                      {r.change > 0 ? `+${r.change}` : r.change === 0 ? '—' : r.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contributions */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-[10px]">
            <Ico d={BAR_D} size={15} />
            <span style={label}>Đóng góp thành viên</span>
          </div>
          <div style={{ ...card, padding: '16px 20px' }}>
            {memberContribs.length === 0 ? (
              <span style={{ color: '#4a6080' }}>Chưa có dữ liệu.</span>
            ) : (
              <div className="flex flex-col gap-[14px]">
                {memberContribs.map(({ member, commits, tasks, reviews, score }) => {
                  const pct = Math.round((score / maxScore) * 100);
                  return (
                    <div key={member.email}>
                      <div className="flex items-center justify-between mb-[5px]">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center flex-shrink-0 rounded-full text-white font-bold text-[0.72rem]" style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#00d4ff,#7c3aed)' }}>
                            {(member.full_name?.[0] ?? member.email?.[0] ?? 'U').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: '#c9d6e8', fontWeight: 600, fontSize: '0.83rem' }}>{member.full_name || member.email?.split('@')[0]}</div>
                            <div style={{ fontSize: '0.68rem', color: '#4a6080' }}>{commits} commits · {tasks} tasks · {reviews} reviews</div>
                          </div>
                        </div>
                        <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: '0.83rem' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: '#0a1220', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: 'linear-gradient(90deg,#00d4ff,#7c3aed)', transition: 'width .5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-4 mt-4 pt-[14px]" style={{ borderTop: '1px solid #162036' }}>
              {[{ label: 'Commits', color: '#00d4ff' }, { label: 'Tasks ×2', color: '#7c3aed' }, { label: 'Reviews', color: '#22c55e' }].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontSize: '0.72rem', color: '#4a6080' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
