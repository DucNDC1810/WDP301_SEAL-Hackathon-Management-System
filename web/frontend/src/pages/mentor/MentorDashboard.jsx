import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress, Spin, Tooltip, message, Tag } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import './MentorDashboard.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name[0].toUpperCase();
}
function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return fmtDate(iso);
}

const ACCENT_COLORS = ['#00d4ff', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
const statusMap = { open: 'ongoing', draft: 'upcoming', closed: 'ended' };

// ─── Build schedule events from real contest round dates ──────────────────────
function buildScheduleEvents(contests) {
  const events = [];
  contests.forEach((c, ci) => {
    const color = ACCENT_COLORS[ci % ACCENT_COLORS.length];
    (c.rounds || []).forEach(r => {
      const dateStr = r.start_date || r.end_date;
      if (dateStr) {
        events.push({
          id: `${c._id}-${r._id}`,
          title: `${r.name}`,
          subtitle: c.title,
          time: fmtDate(dateStr),
          rawDate: dateStr,
          color,
          type: r.is_active ? 'active' : (new Date(dateStr) > new Date() ? 'upcoming' : 'ended'),
          icon: r.is_active ? '▶' : '📅',
        });
      }
    });
  });
  return events
    .filter(e => e.type !== 'ended')
    .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
    .slice(0, 9);
}

// ─── Enrich raw assignments from /api/mentor-assignments/me ──────────────────
function enrichAssignment(a, idx) {
  const contest = a.contest_id || {};
  const rounds  = contest.rounds || [];
  const round   = rounds.find(r => r._id?.toString() === a.round_id?.toString()) || {};
  const pool    = a.board_id || {};
  const team    = a.team_id  || {};

  return {
    key:           a._id,
    contestId:     contest._id?.toString() || '',
    contestName:   contest.title || '—',
    contestStart:  contest.start_date,
    contestEnd:    contest.end_date,
    contestStatus: statusMap[contest.status] || 'upcoming',
    rounds:        rounds,
    roundId:       round._id?.toString() || a.round_id?.toString() || '',
    roundName:     round.name || '—',
    roundIsActive: !!round.is_active,
    poolId:        pool._id?.toString() || '',
    poolName:      pool.pool_name || '—',
    teamId:        team._id?.toString() || '',
    teamName:      team.team_name || '—',
    teamStatus:    team.status || 'pending',
    projectName:   team.topic_id?.title || '',
    members:       team.members || [],
    assignedAt:    a.assigned_at,
    accentColor:   ACCENT_COLORS[idx % ACCENT_COLORS.length],
  };
}

// ─── Mock chat messages ───────────────────────────────────────────────────────
const MOCK_MSGS = [
  { id: 1, mine: false, text: 'Thầy/cô ơi, nhóm em muốn hỏi về slide pitch', time: '10:24' },
  { id: 2, mine: true,  text: 'Ok, slide của nhóm đang ở phase nào rồi?',     time: '10:25' },
  { id: 3, mine: false, text: 'Dạ nhóm em đang viết proposal ạ',              time: '10:26' },
  { id: 4, mine: true,  text: 'Focus vào problem statement trước, sau đó mới solution nhé', time: '10:27' },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  { items: [
    { id: 'dashboard', icon: '⊞', label: 'Tổng quan' },
    { id: 'teams',     icon: '👥', label: 'Đội của tôi' },
  ]},
  { items: [
    { id: 'scoring',  icon: '⚖',  label: 'Đội cần chấm' },
    { id: 'chat',     icon: '💬', label: 'Nhóm chat',  badge: 3 },
    { id: 'schedule', icon: '📅', label: 'Lịch trình' },
    { id: 'eval',     icon: '📊',  label: 'Đánh giá' },
  ]},
  { items: [
    { id: 'settings', icon: '⚙', label: 'Cài đặt' },
  ]},
];

function Sidebar({ active, onChange }) {
  return (
    <aside className="md-sidebar" style={{ padding: '8px 12px' }}>
      {NAV_GROUPS.map((g, gi) => (
        <div key={g.section}>
          {gi > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />}
          {g.items.map(item => (
            <div
              key={item.id}
              className={`md-nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => onChange(item.id)}
            >
              <span className="md-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span className="md-nav-badge">{item.badge}</span> : null}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

// ─── Team Drawer ──────────────────────────────────────────────────────────────
function TeamDrawer({ team, onClose }) {
  const [notes, setNotes] = useState('');

  if (!team) return null;

  return (
    <div className="md-drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="md-drawer">
        <div className="md-drawer-top">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div className="md-drawer-title">{team.teamName}</div>
              <div className="md-drawer-sub">{team.projectName || 'Chưa chọn chủ đề'}</div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
            <span className="md-tag-cyan">Bảng: {team.poolName}</span>
            <span className="md-tag-cyan">Vòng: {team.roundName}</span>
            <span className="md-tag-cyan">{team.contestName}</span>
            <span className={`md-status-badge ${{ confirmed:'done', pending:'pending', disqualified:'inprog', ELIMINATED:'inprog' }[team.teamStatus] || 'pending'}`} style={{ fontSize:'0.68rem', padding:'2px 8px' }}>
              {{ confirmed:'✓ Xác nhận', pending:'Chờ xác nhận', disqualified:'Loại', ELIMINATED:'Bị loại' }[team.teamStatus] || team.teamStatus}
            </span>
          </div>
        </div>

        <div className="md-drawer-body">
          {/* Members */}
          <div className="md-drawer-section">
            <div className="md-drawer-section-title">Thành viên ({team.members.length})</div>
            {team.members.length === 0 ? (
              <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.3)', padding:'8px 0' }}>Chưa có thành viên</div>
            ) : (
              <div className="md-members-list">
                {team.members.map((m, i) => (
                  <div key={i} className="md-member-row">
                    <div className="md-member-avatar">{initials(m.full_name || m.email)}</div>
                    <div>
                      <div className="md-member-name">{m.full_name || '(Chưa đặt tên)'}</div>
                      <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.35)' }}>{m.email}</div>
                    </div>
                    <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                      <span className="md-member-role">{i === 0 ? 'Leader' : 'Member'}</span>
                      {m.email_verified
                        ? <span className="md-tag-green" style={{ fontSize:'0.62rem' }}>✓ Đã xác thực</span>
                        : <span className="md-tag-amber" style={{ fontSize:'0.62rem' }}>Chờ xác thực</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thông tin phân công */}
          <div className="md-drawer-section">
            <div className="md-drawer-section-title">Thông tin phân công</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'Cuộc thi', val: team.contestName },
                { label:'Vòng thi', val: team.roundName },
                { label:'Bảng',     val: team.poolName },
                { label:'Ngày phân công', val: fmtDate(team.assignedAt) },
                { label:'Chủ đề',   val: team.projectName || 'Chưa chọn' },
              ].map(f => (
                <div key={f.label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', borderRadius:8, background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)' }}>{f.label}</span>
                  <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.8)', fontWeight:500 }}>{f.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mentor notes */}
          <div className="md-drawer-section">
            <div className="md-drawer-section-title">Ghi chú mentor</div>
            <textarea
              className="md-notes-area"
              placeholder="Ghi chú phản hồi, điểm mạnh/yếu, hướng cải thiện..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <button
              className="md-btn-primary"
              style={{ marginTop:8, width:'100%', padding:'8px 0' }}
              onClick={() => message.success('Đã lưu ghi chú')}
            >
              Lưu ghi chú
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Dashboard ───────────────────────────────────────────────────────
function SectionDashboard({ contests, enriched, loading, navigate }) {
  // Chỉ đếm những contest mà mentor thực sự được phân công
  const uniqueContestIds = [...new Set(enriched.map(a => a.contestId).filter(Boolean))];
  const totalContest  = uniqueContestIds.length;
  const ongoingCount  = uniqueContestIds.filter(cid =>
    enriched.find(a => a.contestId === cid)?.contestStatus === 'ongoing'
  ).length;
  const totalAssigned = enriched.length;
  const activeRounds  = enriched.filter(a => a.roundIsActive).length;

  const STATS = [
    { label:'Hackathon tham gia', value:totalContest,  color:'#00d4ff', icon:'🏆',
      iconBg:'rgba(0,212,255,0.1)', iconBorder:'rgba(0,212,255,0.2)',
      accent:'linear-gradient(90deg,#00d4ff,#a855f7)', glow:'rgba(0,212,255,0.08)' },
    { label:'Đang diễn ra',       value:ongoingCount,  color:'#10b981', icon:'▶',
      iconBg:'rgba(16,185,129,0.1)', iconBorder:'rgba(16,185,129,0.2)',
      accent:'linear-gradient(90deg,#10b981,#00d4ff)', glow:'rgba(16,185,129,0.08)' },
    { label:'Đội được phân công', value:totalAssigned, color:'#a855f7', icon:'👥',
      iconBg:'rgba(168,85,247,0.1)', iconBorder:'rgba(168,85,247,0.2)',
      accent:'linear-gradient(90deg,#a855f7,#f59e0b)', glow:'rgba(168,85,247,0.08)' },
    { label:'Vòng đang mở',       value:activeRounds,  color:'#f59e0b', icon:'⏱',
      iconBg:'rgba(245,158,11,0.1)', iconBorder:'rgba(245,158,11,0.2)',
      accent:'linear-gradient(90deg,#f59e0b,#ef4444)', glow:'rgba(245,158,11,0.08)' },
  ];

  // Group enriched assignments by contestId for the hackathon list
  const byContest = {};
  enriched.forEach(a => {
    if (!byContest[a.contestId]) {
      byContest[a.contestId] = {
        id: a.contestId, name: a.contestName,
        status: a.contestStatus,
        startDate: a.contestStart, endDate: a.contestEnd,
        rounds: a.rounds,
        accentColor: a.accentColor,
        teams: [],
      };
    }
    byContest[a.contestId].teams.push(a);
  });
  const hackathons = Object.values(byContest);

  return (
    <div>
      {/* Stats */}
      <div className="md-stats-grid">
        {STATS.map((s, i) => (
          <div key={i} className="md-stat-card" style={{ '--card-accent': s.accent, '--glow-color': s.glow }}>
            <div className="md-stat-icon-wrap" style={{ background: s.iconBg, border: `1px solid ${s.iconBorder}` }}>
              {s.icon}
            </div>
            <div className="md-stat-num" style={{ color: s.color }}>
              {loading ? <Spin size="small" /> : s.value}
            </div>
            <div className="md-stat-label">{s.label}</div>
            <div className="md-stat-glow" style={{ background: s.glow }} />
          </div>
        ))}
      </div>

      {/* Hackathon list */}
      <div className="md-section-header">
        <div className="md-section-title">
          🏆 Hackathon của tôi
          {!loading && <span className="md-section-count">{hackathons.length}</span>}
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:'60px 0' }}><Spin size="large" /></div>}

      {!loading && hackathons.length === 0 && (
        <div className="md-empty">
          <div className="md-empty-icon">📋</div>
          <div className="md-empty-title">Chưa được phân công hackathon nào</div>
          <div className="md-empty-sub">Liên hệ Admin để được phân công</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {hackathons.map(h => {
          const sc = { ongoing:'green', upcoming:'blue', ended:'default' }[h.status] || 'default';
          const activeRound = h.rounds.find(r => r.is_active);
          return (
            <div key={h.id} style={{
              borderRadius:16, overflow:'hidden',
              background:'rgba(255,255,255,0.025)',
              border:'1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{
                padding:'16px 20px',
                background:`linear-gradient(135deg,${h.accentColor}08,${h.accentColor}03)`,
                borderBottom:'1px solid rgba(255,255,255,0.06)',
                display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12,
              }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:'1rem', color:'#fff', marginBottom:4 }}>{h.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)' }}>
                    {fmtDate(h.startDate)} → {fmtDate(h.endDate)}
                  </div>
                  <div style={{ marginTop:6, fontSize:'0.72rem', color:'rgba(255,255,255,0.35)' }}>
                    {h.teams.length} đội được phân công · {h.rounds.length} vòng
                  </div>
                </div>
                <Tag color={sc} style={{ fontSize:'0.72rem' }}>
                  {{ ongoing:'Đang diễn ra', upcoming:'Sắp tới', ended:'Đã kết thúc' }[h.status]}
                </Tag>
              </div>

              {activeRound && (
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 20px',
                  background:'rgba(0,212,255,0.04)',
                  borderBottom:'1px solid rgba(255,255,255,0.05)',
                  flexWrap:'wrap', gap:8,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981', flexShrink:0, display:'inline-block' }} />
                    <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)' }}>
                      <strong style={{ color:'#fff' }}>{activeRound.name}</strong> đang mở
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button
                      className="md-btn-primary"
                      onClick={() => navigate(`/mentor/portal/${h.id}/${activeRound._id}`)}
                    >
                      🎯 Mentor Portal
                    </button>
                    <button
                      className="md-btn-secondary"
                      onClick={() => navigate(`/mentor/scoring/${h.id}/rounds/${activeRound._id}`)}
                    >
                      📝 Chấm điểm
                    </button>
                  </div>
                </div>
              )}

              {h.rounds.length > 0 && (
                <div style={{ padding:'10px 20px 14px' }}>
                  {h.rounds.map((r, ri) => {
                    const rColor = r.is_active ? '#10b981' : '#6b7280';
                    const rLabel = r.is_active ? 'Đang mở' : (r.scoring_locked ? 'Đã đóng' : 'Sắp tới');
                    return (
                      <div key={r._id} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'6px 0',
                        borderTop:ri > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}>
                        <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.25)', minWidth:16 }}>{ri+1}.</span>
                        <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)', flex:1 }}>{r.name}</span>
                        <span style={{ fontSize:'0.68rem', fontWeight:700, color:rColor }}>{rLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section: My Teams ────────────────────────────────────────────────────────
function SectionTeams({ enriched, onOpenTeam }) {
  if (enriched.length === 0) {
    return (
      <div className="md-empty">
        <div className="md-empty-icon">👥</div>
        <div className="md-empty-title">Chưa được phân công đội nào</div>
        <div className="md-empty-sub">Admin sẽ phân công bạn mentor cho các đội trong cuộc thi</div>
      </div>
    );
  }

  // Progress based on team status
  const statusProgress = { confirmed: 60, pending: 25, disqualified: 0, ELIMINATED: 0 };

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">
          👥 Đội được phân công
          <span className="md-section-count">{enriched.length} phân công</span>
        </div>
      </div>
      <div className="md-teams-grid">
        {enriched.map(t => {
          const pct = statusProgress[t.teamStatus] ?? 25;
          const steps = Math.round((pct / 100) * 4);
          const verifiedCount = t.members.filter(m => m.email_verified).length;

          return (
            <div key={t.key} className="md-team-card" onClick={() => onOpenTeam(t)}>
              <div className="md-team-card-top">
                <div className="md-team-head">
                  <div className="md-team-avatar" style={{ color: t.accentColor, borderColor:`${t.accentColor}55` }}>
                    {initials(t.teamName)}
                  </div>
                  <div className="md-team-meta">
                    <div className="md-team-name">{t.teamName}</div>
                    <div className="md-team-project" style={{ color: t.accentColor }}>
                      {t.projectName || 'Chưa chọn chủ đề'}
                    </div>
                    <span className="md-team-pool-tag">◆ {t.poolName}</span>
                  </div>
                </div>

                <div className="md-progress-label">
                  <span>Trạng thái đội</span>
                  <span style={{ color: t.accentColor, fontWeight:700 }}>
                    {{ confirmed:'Xác nhận', pending:'Chờ xác nhận', disqualified:'Loại', ELIMINATED:'Bị loại' }[t.teamStatus] || t.teamStatus}
                  </span>
                </div>
                <Progress
                  percent={pct}
                  strokeColor={t.accentColor}
                  trailColor="rgba(255,255,255,0.06)"
                  showInfo={false}
                  size={[undefined, 5]}
                />
                <div className="md-progress-steps">
                  {['Đăng ký','Xác nhận','Mentoring','Nộp bài'].map((phase, pi) => (
                    <Tooltip key={phase} title={phase}>
                      <div className={`md-step ${pi < steps ? 'done' : ''}`} />
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div className="md-team-card-body">
                <div className="md-team-info-row">
                  <div className="md-team-info-item">🏆 {t.contestName}</div>
                </div>
                <div className="md-team-info-row">
                  <div className="md-team-info-item">📋 {t.roundName}</div>
                  <div className="md-team-info-item">
                    👥 {t.members.length} thành viên
                    {t.members.length > 0 && ` (${verifiedCount}/${t.members.length} xác thực)`}
                  </div>
                </div>
                <div style={{ marginTop:8, fontSize:'0.72rem', color:'rgba(255,255,255,0.35)' }}>
                  Phân công: {relTime(t.assignedAt)}
                </div>
              </div>

              <div className="md-team-actions">
                <button className="md-btn-primary" onClick={e => { e.stopPropagation(); onOpenTeam(t); }}>
                  Xem chi tiết
                </button>
                <button className="md-btn-secondary" onClick={e => e.stopPropagation()}>
                  💬 Chat
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section: Chat ────────────────────────────────────────────────────────────
function SectionChat({ enriched }) {
  const convs = enriched.slice(0, 6).map((a, i) => ({
    id: i,
    name: a.teamName,
    last: i === 0 ? 'Thầy/cô ơi, nhóm em muốn hỏi về slide pitch' : 'Cảm ơn thầy/cô ạ!',
    time: relTime(new Date(Date.now() - i * 3600000 * 2).toISOString()),
    unread: i === 0 ? 3 : 0,
    color: a.accentColor,
  }));

  const [activeCid, setActiveCid] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(MOCK_MSGS);
  const activeConv = convs.find(c => c.id === activeCid) || convs[0];
  const endRef = useRef(null);

  const sendMsg = () => {
    if (!chatInput.trim()) return;
    const now = new Date();
    setMessages(prev => [...prev, {
      id: Date.now(), mine: true, text: chatInput,
      time: now.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' }),
    }]);
    setChatInput('');
    setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
  };

  if (convs.length === 0) {
    return (
      <div className="md-empty">
        <div className="md-empty-icon">💬</div>
        <div className="md-empty-title">Chưa có cuộc trò chuyện nào</div>
        <div className="md-empty-sub">Chat sẽ khả dụng sau khi được phân công đội</div>
      </div>
    );
  }

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">💬 Nhóm chat</div>
        <span className="md-tag-amber">Demo</span>
      </div>
      <div className="md-chat-layout">
        <div className="md-chat-list">
          <div className="md-chat-list-header">Nhóm ({convs.length})</div>
          <div className="md-chat-list-body">
            {convs.map(cv => (
              <div key={cv.id} className={`md-chat-item ${cv.id === activeCid ? 'active' : ''}`} onClick={() => setActiveCid(cv.id)}>
                <div className="md-chat-item-avatar" style={{ background:`${cv.color}22`, color:cv.color }}>
                  {initials(cv.name)}
                </div>
                <div className="md-chat-item-info">
                  <div className="md-chat-item-name">{cv.name}</div>
                  <div className="md-chat-item-last">{cv.last}</div>
                </div>
                {cv.unread > 0 && <div className="md-chat-unread">{cv.unread}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="md-chat-window">
          <div className="md-chat-window-header">
            <div style={{ width:32, height:32, borderRadius:8, background:`${activeConv?.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.85rem', color:activeConv?.color }}>
              {initials(activeConv?.name || '')}
            </div>
            <div>
              <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#fff' }}>{activeConv?.name}</div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div className="md-chat-online" />
                <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)' }}>Online</span>
              </div>
            </div>
          </div>
          <div className="md-chat-messages md-scroll-fade">
            {messages.map(m => (
              <div key={m.id} className={`md-msg ${m.mine ? 'mine' : 'theirs'}`}>
                {!m.mine && (
                  <div style={{ width:28, height:28, borderRadius:'50%', background:`${activeConv?.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, color:activeConv?.color, flexShrink:0 }}>
                    {initials(activeConv?.name || '')}
                  </div>
                )}
                <div>
                  <div className="md-msg-bubble">{m.text}</div>
                  <div className="md-msg-time" style={{ textAlign:m.mine ? 'right' : 'left' }}>{m.time}</div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="md-chat-input-bar">
            <input
              className="md-chat-input"
              placeholder="Nhắn tin với nhóm..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
            />
            <button className="md-chat-send-btn" onClick={sendMsg}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Schedule ────────────────────────────────────────────────────────
function SectionSchedule({ contests, enriched }) {
  // Merge contest rounds from all assigned contests
  const assignedContestIds = new Set(enriched.map(a => a.contestId));
  const myContests = contests.filter(c => assignedContestIds.has(c._id?.toString()));
  const events = buildScheduleEvents(myContests);

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">📅 Lịch trình</div>
        <span className="md-section-count">{events.length} sự kiện</span>
      </div>

      {events.length === 0 ? (
        <div className="md-empty">
          <div className="md-empty-icon">📅</div>
          <div className="md-empty-title">Không có lịch trình sắp tới</div>
          <div className="md-empty-sub">Các vòng thi chưa có ngày cụ thể hoặc đã kết thúc</div>
        </div>
      ) : (
        <div className="md-schedule-grid">
          {events.map(ev => (
            <div key={ev.id} className="md-event-card" style={{ '--event-color': ev.color }}>
              <div className="md-event-time">{ev.icon} {ev.time}</div>
              <div className="md-event-title">{ev.title}</div>
              <div className="md-event-team" style={{ color: ev.color }}>{ev.subtitle}</div>
              <div className="md-event-loc">📍 Online</div>
              <div style={{ marginTop:8 }}>
                <span className={ev.type === 'active' ? 'md-tag-green' : 'md-tag-cyan'}>
                  {ev.type === 'active' ? '▶ Đang diễn ra' : 'Sắp tới'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Evaluation ─────────────────────────────────────────────────────
function SectionEval({ enriched, scores, navigate }) {
  const rows = enriched.map(a => {
    const key = `${a.contestId}___${a.roundId}`;
    const myScores = scores[key] || [];
    const submitted = myScores.filter(s => s.status === 'submitted').length;
    const status = !a.roundIsActive
      ? (submitted > 0 ? (submitted >= myScores.length ? 'done' : 'inprog') : 'inprog')
      : 'pending';

    return {
      key: a.key,
      contestName: a.contestName,
      roundName: a.roundName,
      roundId: a.roundId,
      contestId: a.contestId,
      teamName: a.teamName,
      submitted,
      total: myScores.length,
      status,
      roundIsActive: a.roundIsActive,
    };
  });

  const done   = rows.filter(r => r.status === 'done').length;
  const inprog = rows.filter(r => r.status === 'inprog').length;
  const pending = rows.filter(r => r.status === 'pending').length;

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">⚖ Đánh giá & Chấm điểm</div>
      </div>

      <div className="md-eval-header-cards">
        {[
          { label:'Hoàn thành', value:done,    color:'#10b981' },
          { label:'Đang chấm',  value:inprog,  color:'#00d4ff' },
          { label:'Chờ kết thúc vòng', value:pending, color:'#f59e0b' },
        ].map((c, i) => (
          <div key={i} className="md-eval-hcard">
            <div className="md-eval-hcard-num" style={{ color:c.color }}>{c.value}</div>
            <div className="md-eval-hcard-label">{c.label}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="md-empty">
          <div className="md-empty-icon">⚖</div>
          <div className="md-empty-title">Không có nhiệm vụ đánh giá</div>
          <div className="md-empty-sub">Sau khi vòng kết thúc bạn có thể chấm điểm cho các đội</div>
        </div>
      ) : (
        <div className="md-eval-table">
          <table>
            <thead>
              <tr>
                <th>Cuộc thi / Vòng</th>
                <th>Đội</th>
                <th>Chấm điểm</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.key}>
                  <td>
                    <div style={{ fontWeight:600, color:'#fff', fontSize:'0.85rem' }}>{row.contestName}</div>
                    <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)' }}>{row.roundName}</div>
                  </td>
                  <td style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.82rem' }}>{row.teamName}</td>
                  <td style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.6)' }}>
                    {row.total > 0 ? `${row.submitted}/${row.total}` : '—'}
                  </td>
                  <td>
                    <span className={`md-status-badge ${row.status}`}>
                      {{ done:'✓ Hoàn thành', inprog:'● Đang chấm', pending:'⏳ Chờ kết thúc' }[row.status]}
                    </span>
                  </td>
                  <td>
                    {!row.roundIsActive ? (
                      <button
                        className="md-review-btn"
                        onClick={() => navigate(`/mentor/scoring/${row.contestId}/rounds/${row.roundId}`)}
                      >
                        Chấm điểm →
                      </button>
                    ) : (
                      <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.25)' }}>Vòng đang mở</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Section: Scoring (teams to score — not own mentees) ─────────────────────
function SectionScoring({ enriched, judgeMap, navigate }) {
  // Deduplicate by (contestId, roundId) — each unique round the mentor is assigned to
  const seen = new Set();
  const rounds = enriched.reduce((acc, a) => {
    const key = `${a.contestId}___${a.roundId}`;
    if (!seen.has(key) && a.contestId && a.roundId) {
      seen.add(key);
      // If mentor also has a judge assignment for this round → use judge URL (pool-scoped)
      const judgePoolId = judgeMap[key];
      acc.push({
        key,
        contestId:    a.contestId,
        roundId:      a.roundId,
        contestName:  a.contestName,
        roundName:    a.roundName,
        roundIsActive: a.roundIsActive,
        accentColor:  a.accentColor,
        judgePoolId,  // defined → navigate to judge URL; undefined → mentor URL (all pools)
      });
    }
    return acc;
  }, []);

  const endedRounds  = rounds.filter(r => !r.roundIsActive);
  const activeRounds = rounds.filter(r => r.roundIsActive);

  const goScore = (r) => {
    if (r.judgePoolId) {
      navigate(`/judge/scoring/${r.contestId}/rounds/${r.roundId}/pools/${r.judgePoolId}`);
    } else {
      navigate(`/mentor/scoring/${r.contestId}/rounds/${r.roundId}`);
    }
  };

  if (rounds.length === 0) {
    return (
      <div className="md-empty">
        <div className="md-empty-icon">⚖</div>
        <div className="md-empty-title">Chưa có vòng chấm điểm nào</div>
        <div className="md-empty-sub">Sau khi vòng thi kết thúc bạn có thể chấm điểm các đội khác trong cuộc thi</div>
      </div>
    );
  }

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">
          ⚖ Đội cần chấm điểm
          {endedRounds.length > 0 && <span className="md-section-count">{endedRounds.length} vòng sẵn sàng</span>}
        </div>
      </div>

      <div className="md-eval-header-cards" style={{ marginBottom: 20 }}>
        {[
          { label: 'Sẵn sàng chấm',     value: endedRounds.length,  color: '#10b981' },
          { label: 'Chờ vòng kết thúc', value: activeRounds.length, color: '#f59e0b' },
        ].map((c, i) => (
          <div key={i} className="md-eval-hcard">
            <div className="md-eval-hcard-num" style={{ color: c.color }}>{c.value}</div>
            <div className="md-eval-hcard-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {endedRounds.map(r => (
          <div key={r.key} style={{
            borderRadius: 14,
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.15)',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>{r.contestName}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                📋 {r.roundName} · Vòng đã kết thúc
                {r.judgePoolId && <span style={{ color: '#a855f7', marginLeft: 6 }}>⚖ Giám khảo</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>✓ Sẵn sàng</span>
              <button className="md-btn-primary" onClick={() => goScore(r)}>
                ⚖ Vào chấm điểm
              </button>
            </div>
          </div>
        ))}

        {activeRounds.map(r => (
          <div key={r.key} style={{
            borderRadius: 14,
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            opacity: 0.6,
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>{r.contestName}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                📋 {r.roundName} · Vòng đang diễn ra
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>⏳ Chờ kết thúc</span>
              <button className="md-btn-secondary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                🔒 Chưa thể chấm
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Settings ────────────────────────────────────────────────────────
function SectionSettings({ user }) {
  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">⚙ Cài đặt tài khoản</div>
      </div>
      <div style={{ maxWidth:520 }}>
        <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:24, display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div className="md-avatar-lg" style={{ width:56, height:56, fontSize:'1.3rem' }}>{initials(user?.full_name || 'M')}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:'1rem', color:'#fff' }}>{user?.full_name}</div>
              <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginBottom:4 }}>{user?.email}</div>
              <div style={{ display:'flex', gap:6 }}>
                {user?.roles?.map(r => (
                  <span key={r.role_name} className="md-tag-cyan" style={{ textTransform:'capitalize' }}>{r.role_name}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="md-divider" />
          {[
            { label:'Họ và tên',         val: user?.full_name || '—' },
            { label:'Email',             val: user?.email     || '—' },
            { label:'Trường / Tổ chức',  val: user?.organization || '—' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.3)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>{f.label}</div>
              <div style={{ fontSize:'0.88rem', color:'rgba(255,255,255,0.8)', background:'rgba(0,0,0,0.3)', padding:'8px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.07)' }}>{f.val}</div>
            </div>
          ))}
          <button className="md-btn-primary" style={{ padding:'9px 0' }} onClick={() => message.info('Tính năng đang phát triển')}>
            Chỉnh sửa hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────
function AiPanel({ onClose }) {
  const [q, setQ] = useState('');
  const suggestions = [
    { icon:'💡', text:'Tóm tắt tiến độ các đội của tôi' },
    { icon:'📋', text:'Gợi ý câu hỏi feedback cho nhóm' },
    { icon:'📊', text:'Phân tích điểm mạnh cần cải thiện' },
    { icon:'📅', text:'Đề xuất lịch buổi mentoring tiếp theo' },
  ];
  return (
    <div className="md-ai-panel">
      <div className="md-ai-header">
        <div className="md-ai-dot" />
        <div className="md-ai-title">SEAL AI Assistant</div>
        <div className="md-ai-sub">GPT-4o</div>
        <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'1rem' }}>✕</button>
      </div>
      <div className="md-ai-suggestions">
        <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)', marginBottom:2 }}>Gợi ý nhanh</div>
        {suggestions.map((s, i) => (
          <div key={i} className="md-ai-chip" onClick={() => setQ(s.text)}>
            <span className="md-ai-chip-icon">{s.icon}</span>
            {s.text}
          </div>
        ))}
      </div>
      <div className="md-ai-input-row">
        <input
          className="md-ai-input"
          placeholder="Hỏi AI assistant..."
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && message.info('Tính năng AI đang phát triển')}
        />
        <button className="md-ai-send" onClick={() => message.info('Tính năng AI đang phát triển')}>Gửi</button>
      </div>
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────
const VIEW_LABELS = {
  dashboard:'Tổng quan', teams:'Đội của tôi', scoring:'Đội cần chấm điểm',
  chat:'Nhóm chat', schedule:'Lịch trình', eval:'Đánh giá', settings:'Cài đặt',
};

export default function MentorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [contests, setContests]     = useState([]);
  const [enriched, setEnriched]     = useState([]); // processed mentor assignments
  const [judgeMap, setJudgeMap]     = useState({}); // "contestId___roundId" → poolId
  const [scores, setScores]         = useState({});  // { "contestId___roundId": [score,...] }
  const [selectedTeam, setSelectedTeam] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch mentor assignments, judge assignments, and contests in parallel
      const [assignRes, judgeRes, contestRes] = await Promise.all([
        request('/api/mentor-assignments/me'),
        request('/api/judge-assignments/me').catch(() => []),
        request('/api/contests'),
      ]);

      const rawAssignments = Array.isArray(assignRes) ? assignRes : (assignRes?.data ?? []);
      const rawJudge       = Array.isArray(judgeRes)  ? judgeRes  : (judgeRes?.data  ?? []);
      const allContests    = Array.isArray(contestRes) ? contestRes : (contestRes?.data ?? []);

      // Build judge pool map: "contestId___roundId" → poolId
      const jMap = {};
      rawJudge.forEach(ja => {
        const cid = (ja.contest_id?._id || ja.contest_id)?.toString();
        const rid = ja.round_id?.toString();
        const pid = (ja.pool_id?._id || ja.pool_id)?.toString();
        if (cid && rid && pid) jMap[`${cid}___${rid}`] = pid;
      });
      setJudgeMap(jMap);

      // 2. Enrich each mentor assignment with flat data
      const enrichedList = rawAssignments.map((a, idx) => enrichAssignment(a, idx));
      setContests(allContests);
      setEnriched(enrichedList);

      // 3. Fetch my scores for each unique (contestId, roundId) that has ended
      const endedRoundKeys = [
        ...new Set(
          enrichedList
            .filter(a => a.contestId && a.roundId && !a.roundIsActive)
            .map(a => `${a.contestId}___${a.roundId}`)
        )
      ];

      if (endedRoundKeys.length > 0) {
        const scoreEntries = await Promise.allSettled(
          endedRoundKeys.map(async key => {
            const [cid, rid] = key.split('___');
            const res = await request(`/api/scores/contests/${cid}/rounds/${rid}/my-scores`);
            const data = Array.isArray(res) ? res : (res?.data ?? []);
            return { key, data };
          })
        );
        const scoreMap = {};
        scoreEntries.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            scoreMap[result.value.key] = result.value.data;
          }
        });
        setScores(scoreMap);
      }
    } catch {
      messageApi.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const userInitials = initials(user?.full_name || 'M');

  const renderSection = () => {
    if (loading && activeView === 'dashboard') {
      return <div style={{ textAlign:'center', padding:'80px 0' }}><Spin size="large" /></div>;
    }
    switch (activeView) {
      case 'dashboard': return <SectionDashboard contests={contests} enriched={enriched} loading={loading} navigate={navigate} />;
      case 'teams':     return <SectionTeams     enriched={enriched} onOpenTeam={setSelectedTeam} />;
      case 'scoring':   return <SectionScoring   enriched={enriched} judgeMap={judgeMap} navigate={navigate} />;
      case 'chat':      return <SectionChat      enriched={enriched} />;
      case 'schedule':  return <SectionSchedule  contests={contests} enriched={enriched} />;
      case 'eval':      return <SectionEval      enriched={enriched} scores={scores} navigate={navigate} />;
      case 'settings':  return <SectionSettings  user={user} />;
      default:          return null;
    }
  };

  return (
    <div className="md-root">
      {contextHolder}

      {/* Topbar */}
      <header className="md-topbar">
        <div className="md-topbar-brand">
          <span className="md-brand-logo">SEAL</span>
          <div className="md-brand-sep" />
          <span className="md-brand-sub">Mentor Portal</span>
        </div>
        <div style={{ flex:1, padding:'0 20px', display:'flex', alignItems:'center' }}>
          <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.25)' }}>
            Dashboard / <span style={{ color:'rgba(255,255,255,0.6)' }}>{VIEW_LABELS[activeView]}</span>
          </span>
        </div>
        <div className="md-topbar-right">
          <div className="md-notif-btn">🔔<div className="md-notif-dot" /></div>
          <div className="md-profile-chip">
            <div className="md-avatar">{userInitials}</div>
            <div>
              <div className="md-profile-name">{user?.full_name || 'Mentor'}</div>
              <span className="md-role-badge">🎯 Mentor</span>
            </div>
          </div>
          <button className="md-logout-btn" onClick={logout}>Đăng xuất</button>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar active={activeView} onChange={setActiveView} />

      {/* Main content */}
      <main className="md-main">
        {activeView === 'dashboard' && (
          <div className="md-hero">
            <h1 className="md-hero-greeting">
              Xin chào, <span>{user?.full_name?.split(' ').pop() || 'Mentor'}</span> 👋
            </h1>
            <p className="md-hero-sub">
              Theo dõi tiến độ, hỗ trợ đội và quản lý lịch mentor từ đây.
            </p>
          </div>
        )}
        {renderSection()}
      </main>

      {/* Team Drawer */}
      {selectedTeam && (
        <TeamDrawer team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}

    </div>
  );
}
