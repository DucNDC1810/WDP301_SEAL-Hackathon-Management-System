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

// Mock upcoming schedule events derived from contests
function buildScheduleEvents(contests) {
  const events = [];
  contests.forEach((c, ci) => {
    const color = ACCENT_COLORS[ci % ACCENT_COLORS.length];
    (c.rounds || []).forEach((r, ri) => {
      if (r.start_date) {
        events.push({
          id: `${c._id}-${r._id}`,
          title: `${r.name} — ${c.title}`,
          time: fmtDate(r.start_date),
          rawDate: r.start_date,
          team: c.title,
          color,
          type: r.is_active ? 'active' : 'upcoming',
          icon: r.is_active ? '▶' : '📅',
          location: 'Online',
        });
      }
    });
  });
  return events.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate)).slice(0, 9);
}

// Dummy chat conversations seeded from real team names
const MOCK_MSGS_BASE = [
  { id: 1, mine: false, text: 'Thầy/cô ơi, nhóm em muốn hỏi về slide pitch', time: '10:24' },
  { id: 2, mine: true,  text: 'Ok, slide của nhóm em đang ở phase nào rồi?', time: '10:25' },
  { id: 3, mine: false, text: 'Dạ nhóm em đang viết proposal ạ', time: '10:26' },
  { id: 4, mine: true,  text: 'Được rồi, focus vào problem statement trước nhé, sau đó mới solution', time: '10:27' },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { section: 'MAIN', items: [
    { id: 'dashboard', icon: '⊞', label: 'Tổng quan' },
    { id: 'teams',     icon: '👥', label: 'Đội của tôi' },
  ]},
  { section: 'CÔNG CỤ', items: [
    { id: 'chat',     icon: '💬', label: 'Nhóm chat', badge: 3 },
    { id: 'schedule', icon: '📅', label: 'Lịch trình' },
    { id: 'eval',     icon: '⚖',  label: 'Đánh giá' },
  ]},
  { section: 'TÀI KHOẢN', items: [
    { id: 'settings', icon: '⚙', label: 'Cài đặt' },
  ]},
];

function Sidebar({ active, onChange }) {
  return (
    <aside className="md-sidebar">
      {NAV_ITEMS.map(group => (
        <div key={group.section} className="md-sidebar-section">
          <div className="md-sidebar-label">{group.section}</div>
          {group.items.map(item => (
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
  const members = team.members || [];

  return (
    <div className="md-drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="md-drawer">
        {/* Header */}
        <div className="md-drawer-top">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div className="md-drawer-title">{team.teamName}</div>
              <div className="md-drawer-sub">{team.projectName || 'Chưa có tên dự án'}</div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <span className="md-tag-cyan">Bảng: {team.poolName}</span>
            <span className="md-tag-cyan">Vòng: {team.roundName}</span>
            <span className="md-tag-green">{members.length} thành viên</span>
          </div>
        </div>

        <div className="md-drawer-body">
          {/* Members */}
          <div className="md-drawer-section">
            <div className="md-drawer-section-title">Thành viên nhóm</div>
            {members.length === 0 ? (
              <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.3)', padding:'8px 0' }}>Chưa có thành viên</div>
            ) : (
              <div className="md-members-list">
                {members.map((m, i) => (
                  <div key={i} className="md-member-row">
                    <div className="md-member-avatar">{initials(m.name || m.email || '?')}</div>
                    <div>
                      <div className="md-member-name">{m.name || m.email || 'Thành viên ' + (i+1)}</div>
                      {m.email && <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.3)' }}>{m.email}</div>}
                    </div>
                    <span className="md-member-role" style={{ marginLeft:'auto' }}>{i === 0 ? 'Leader' : 'Member'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Materials */}
          <div className="md-drawer-section">
            <div className="md-drawer-section-title">Tài liệu nộp</div>
            <div className="md-materials-list">
              {[
                { label: '📋 Proposal', key: 'proposal_url' },
                { label: '🎨 Prototype', key: 'prototype_url' },
                { label: '📊 Slide trình bày', key: 'slide_url' },
                { label: '🎥 Demo video', key: 'video_url' },
              ].map(mat => (
                <div key={mat.key} className="md-material-row">
                  <span className="md-material-label">{mat.label}</span>
                  {team[mat.key]
                    ? <a href={team[mat.key]} target="_blank" rel="noreferrer" className="md-material-link">Xem</a>
                    : <span className="md-material-missing">Chưa nộp</span>
                  }
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
              style={{ marginTop: 8, width:'100%', padding:'8px 0' }}
              onClick={() => message.success('Đã lưu ghi chú')}
            >
              Lưu ghi chú
            </button>
          </div>

          {/* Meeting timeline */}
          <div className="md-drawer-section">
            <div className="md-drawer-section-title">Lịch sử mentor</div>
            <div className="md-timeline">
              {[
                { date: '08/06/2026', summary: 'Buổi 1 — Khởi động, định hướng ý tưởng', actions: 'Feedback: Cần làm rõ vấn đề' },
                { date: '05/06/2026', summary: 'Kickoff — Giới thiệu nhóm', actions: 'Đã hoàn thành' },
              ].map((ev, i, arr) => (
                <div key={i} className="md-timeline-item">
                  <div className="md-timeline-dot-wrap">
                    <div className="md-timeline-dot" />
                    {i < arr.length - 1 && <div className="md-timeline-line" />}
                  </div>
                  <div className="md-timeline-content">
                    <div className="md-timeline-date">{ev.date}</div>
                    <div className="md-timeline-summary">{ev.summary}</div>
                    <div className="md-timeline-actions">{ev.actions}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Dashboard (Overview) ───────────────────────────────────────────
function SectionDashboard({ contests, assignments, loading, navigate }) {
  const hackathons = contests.map((c, i) => {
    const myRoundIds = assignments
      .filter(a => (a.contest_id?._id || a.contest_id)?.toString() === c._id?.toString())
      .map(a => (a.round_id?._id || a.round_id)?.toString());

    const rounds = (c.rounds || []).map(r => ({
      id: r._id?.toString(),
      name: r.name,
      is_active: r.is_active,
      scoring_locked: r.scoring_locked,
      status: r.is_active ? 'active' : (r.scoring_locked ? 'ended' : 'upcoming'),
    }));

    const activeRound = rounds.find(r => r.status === 'active');
    const accentColor = ACCENT_COLORS[i % ACCENT_COLORS.length];

    return {
      id: c._id,
      name: c.title,
      status: statusMap[c.status] || 'upcoming',
      accentColor,
      startDate: c.start_date,
      endDate: c.end_date,
      rounds,
      activeRound,
      myRoundIds,
    };
  });

  const totalContest = hackathons.filter(h => h.status !== 'upcoming').length;
  const ongoingCount = hackathons.filter(h => h.status === 'ongoing').length;
  const totalAssigned = assignments.length;

  const STATS = [
    { label: 'Hackathon tham gia', value: totalContest, color: '#00d4ff', icon: '🏆',
      iconBg: 'rgba(0,212,255,0.1)', iconBorder: 'rgba(0,212,255,0.2)',
      accent: 'linear-gradient(90deg,#00d4ff,#a855f7)',
      glow: 'rgba(0,212,255,0.08)', statColor: '#00d4ff' },
    { label: 'Đang diễn ra', value: ongoingCount, color: '#10b981', icon: '▶',
      iconBg: 'rgba(16,185,129,0.1)', iconBorder: 'rgba(16,185,129,0.2)',
      accent: 'linear-gradient(90deg,#10b981,#00d4ff)',
      glow: 'rgba(16,185,129,0.08)', statColor: '#10b981' },
    { label: 'Phân công mentor', value: totalAssigned, color: '#a855f7', icon: '👥',
      iconBg: 'rgba(168,85,247,0.1)', iconBorder: 'rgba(168,85,247,0.2)',
      accent: 'linear-gradient(90deg,#a855f7,#f59e0b)',
      glow: 'rgba(168,85,247,0.08)', statColor: '#a855f7' },
    { label: 'Vòng đang mở', value: hackathons.filter(h => h.activeRound).length, color: '#f59e0b', icon: '⏱',
      iconBg: 'rgba(245,158,11,0.1)', iconBorder: 'rgba(245,158,11,0.2)',
      accent: 'linear-gradient(90deg,#f59e0b,#ef4444)',
      glow: 'rgba(245,158,11,0.08)', statColor: '#f59e0b' },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="md-stats-grid">
        {STATS.map((s, i) => (
          <div key={i} className="md-stat-card" style={{ '--card-accent': s.accent, '--glow-color': s.glow }}>
            <div className="md-stat-icon-wrap" style={{ '--icon-bg': s.iconBg, '--icon-border': s.iconBorder, background: s.iconBg, border: `1px solid ${s.iconBorder}` }}>
              {s.icon}
            </div>
            <div className="md-stat-num" style={{ '--stat-color': s.statColor, color: s.statColor }}>
              {loading ? '—' : s.value}
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
          <span className="md-section-count">{hackathons.length}</span>
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:'60px 0' }}><Spin size="large" /></div>}

      {!loading && hackathons.length === 0 && (
        <div className="md-empty">
          <div className="md-empty-icon">📋</div>
          <div className="md-empty-title">Chưa có hackathon nào</div>
          <div className="md-empty-sub">Liên hệ Admin để được phân công</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {hackathons.map(h => {
          const sc = { ongoing:'green', upcoming:'blue', ended:'default' }[h.status] || 'default';
          return (
            <div key={h.id} style={{
              borderRadius: 16, overflow:'hidden',
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid rgba(255,255,255,0.07)`,
              transition: 'border-color 0.2s',
            }}>
              {/* Banner */}
              <div style={{
                padding: '16px 20px',
                background: `linear-gradient(135deg, ${h.accentColor}08, ${h.accentColor}04)`,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12,
              }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:'1rem', color:'#fff', marginBottom:4 }}>{h.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)' }}>
                    {fmtDate(h.startDate)} → {fmtDate(h.endDate)}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Tag color={sc} style={{ fontSize:'0.72rem' }}>
                    {{ ongoing:'Đang diễn ra', upcoming:'Sắp tới', ended:'Đã kết thúc' }[h.status]}
                  </Tag>
                </div>
              </div>

              {/* Active round quick-action */}
              {h.activeRound && (
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
                      <strong style={{ color:'#fff' }}>{h.activeRound.name}</strong> đang mở
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button
                      className="md-btn-primary"
                      onClick={() => navigate(`/mentor/portal/${h.id}/${h.activeRound.id}`)}
                    >
                      🎯 Mentor Portal
                    </button>
                    <button
                      className="md-btn-secondary"
                      onClick={() => navigate(`/mentor/scoring/${h.id}/rounds/${h.activeRound.id}`)}
                    >
                      📝 Chấm điểm
                    </button>
                  </div>
                </div>
              )}

              {/* Rounds */}
              {h.rounds.length > 0 && (
                <div style={{ padding:'10px 20px 14px' }}>
                  {h.rounds.map((r, ri) => {
                    const rColor = r.status === 'active' ? '#10b981' : r.status === 'ended' ? '#6b7280' : '#60a5fa';
                    return (
                      <div key={r.id} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'6px 0',
                        borderTop: ri > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}>
                        <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.25)', minWidth:16 }}>{ri+1}.</span>
                        <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)', flex:1 }}>{r.name}</span>
                        <span style={{ fontSize:'0.68rem', fontWeight:700, color:rColor }}>
                          {{ active:'Đang mở', ended:'Đã đóng', upcoming:'Sắp tới' }[r.status]}
                        </span>
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
function SectionTeams({ assignments, contests, onOpenTeam }) {
  const teams = assignments.map((a, i) => {
    const cid = (a.contest_id?._id || a.contest_id)?.toString();
    const contest = contests.find(c => c._id?.toString() === cid) || {};
    const roundObj = (contest.rounds || []).find(
      r => r._id?.toString() === (a.round_id?._id || a.round_id)?.toString()
    ) || {};
    const pool = a.board_id || a.pool_id || {};
    const teamList = Array.isArray(pool.teams) ? pool.teams : [];

    return {
      key: a._id,
      teamName: a.team_id?.team_name || pool.pool_name || `Bảng ${i+1}`,
      projectName: a.team_id?.project_name || '',
      contestName: contest.title || '—',
      roundName: roundObj.name || '—',
      poolName: pool.pool_name || '—',
      members: a.team_id?.members || [],
      accentColor: ACCENT_COLORS[i % ACCENT_COLORS.length],
      is_active: roundObj.is_active,
    };
  });

  if (teams.length === 0) {
    return (
      <div className="md-empty">
        <div className="md-empty-icon">👥</div>
        <div className="md-empty-title">Chưa được phân công đội nào</div>
        <div className="md-empty-sub">Admin sẽ phân công bạn mentor cho các đội trong cuộc thi</div>
      </div>
    );
  }

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">
          👥 Đội được phân công
          <span className="md-section-count">{teams.length} phân công</span>
        </div>
      </div>
      <div className="md-teams-grid">
        {teams.map((t, i) => {
          const pct = 40 + i * 15 > 100 ? 100 : 40 + i * 15; // placeholder progress
          const steps = Math.floor((pct / 100) * 4);
          return (
            <div key={t.key} className="md-team-card" onClick={() => onOpenTeam(t)}>
              <div className="md-team-card-top">
                <div className="md-team-head">
                  <div className="md-team-avatar" style={{ color: t.accentColor, borderColor: `${t.accentColor}55` }}>
                    {initials(t.teamName)}
                  </div>
                  <div className="md-team-meta">
                    <div className="md-team-name">{t.teamName}</div>
                    <div className="md-team-project" style={{ color: t.accentColor }}>
                      {t.projectName || 'Chưa có dự án'}
                    </div>
                    <span className="md-team-pool-tag">◆ {t.poolName}</span>
                  </div>
                </div>

                <div className="md-progress-label">
                  <span>Tiến độ</span>
                  <span style={{ color: t.accentColor, fontWeight:700 }}>{pct}%</span>
                </div>
                <Progress
                  percent={pct}
                  strokeColor={t.accentColor}
                  trailColor="rgba(255,255,255,0.06)"
                  showInfo={false}
                  size={[undefined, 5]}
                />
                <div className="md-progress-steps">
                  {['Ý tưởng','Đề xuất','Prototype','Hoàn thiện'].map((phase, pi) => (
                    <Tooltip key={phase} title={phase}>
                      <div className={`md-step ${pi < steps ? 'done' : pi === steps ? 'partial' : ''}`} />
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div className="md-team-card-body">
                <div className="md-team-info-row">
                  <div className="md-team-info-item">🏆 {t.contestName}</div>
                  <div className="md-team-info-item">· {t.roundName}</div>
                </div>
                <div className="md-team-info-row">
                  <div className="md-team-info-item">
                    👥 {t.members.length > 0 ? `${t.members.length} thành viên` : 'Chưa có thành viên'}
                  </div>
                </div>
                {t.is_active && (
                  <span className="md-deadline-chip">⏰ Vòng đang diễn ra</span>
                )}
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
function SectionChat({ assignments }) {
  const convs = assignments.slice(0, 5).map((a, i) => {
    const pool = a.board_id || a.pool_id || {};
    const teamName = a.team_id?.team_name || pool.pool_name || `Nhóm ${i+1}`;
    return {
      id: i,
      name: teamName,
      last: i === 0 ? 'Thầy/cô ơi, nhóm em muốn hỏi...' : 'Cảm ơn thầy/cô ạ!',
      time: relTime(new Date(Date.now() - i * 3600000).toISOString()),
      unread: i === 0 ? 3 : 0,
      color: ACCENT_COLORS[i % ACCENT_COLORS.length],
    };
  });

  const [activeCid, setActiveCid] = useState(convs[0]?.id ?? 0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(MOCK_MSGS_BASE);
  const activeConv = convs.find(c => c.id === activeCid) || convs[0];
  const endRef = useRef(null);

  const sendMsg = () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), mine: true, text: chatInput, time: new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) }]);
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
        <span className="md-tag-amber">Beta</span>
      </div>
      <div className="md-chat-layout">
        {/* Conv list */}
        <div className="md-chat-list">
          <div className="md-chat-list-header">Cuộc trò chuyện ({convs.length})</div>
          <div className="md-chat-list-body">
            {convs.map(cv => (
              <div
                key={cv.id}
                className={`md-chat-item ${cv.id === activeCid ? 'active' : ''}`}
                onClick={() => setActiveCid(cv.id)}
              >
                <div className="md-chat-item-avatar" style={{ background:`${cv.color}22`, color: cv.color }}>
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

        {/* Chat window */}
        <div className="md-chat-window">
          <div className="md-chat-window-header">
            <div className="md-chat-item-avatar" style={{ background:`${activeConv?.color}22`, color: activeConv?.color, borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.85rem' }}>
              {initials(activeConv?.name)}
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
                    {initials(activeConv?.name)}
                  </div>
                )}
                <div>
                  <div className="md-msg-bubble">{m.text}</div>
                  <div className="md-msg-time" style={{ textAlign: m.mine ? 'right' : 'left' }}>{m.time}</div>
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
function SectionSchedule({ contests }) {
  const events = buildScheduleEvents(contests);

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">📅 Lịch trình sắp tới</div>
        <span className="md-section-count">{events.length} sự kiện</span>
      </div>

      {events.length === 0 ? (
        <div className="md-empty">
          <div className="md-empty-icon">📅</div>
          <div className="md-empty-title">Không có lịch trình sắp tới</div>
          <div className="md-empty-sub">Các vòng thi chưa có thời gian bắt đầu</div>
        </div>
      ) : (
        <div className="md-schedule-grid">
          {events.map(ev => (
            <div key={ev.id} className="md-event-card" style={{ '--event-color': ev.color }}>
              <div className="md-event-time">{ev.icon} {ev.time}</div>
              <div className="md-event-title">{ev.title}</div>
              <div className="md-event-team">{ev.team}</div>
              <div className="md-event-loc">📍 {ev.location}</div>
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
function SectionEval({ assignments, contests, navigate }) {
  const rows = assignments.map((a, i) => {
    const cid = (a.contest_id?._id || a.contest_id)?.toString();
    const contest = contests.find(c => c._id?.toString() === cid) || {};
    const roundObj = (contest.rounds || []).find(
      r => r._id?.toString() === (a.round_id?._id || a.round_id)?.toString()
    ) || {};
    const pool = a.board_id || a.pool_id || {};
    const teams = Array.isArray(pool.teams) ? pool.teams : [];
    const roundEnded = !roundObj.is_active && roundObj._id;

    return {
      key: a._id || i,
      contestName: contest.title || '—',
      roundName: roundObj.name || '—',
      roundId: roundObj._id?.toString(),
      contestId: cid,
      teamCount: teams.length,
      scored: Math.floor(Math.random() * (teams.length + 1)), // placeholder
      status: roundEnded ? (i % 2 === 0 ? 'done' : 'inprog') : 'pending',
      roundEnded,
    };
  });

  const done = rows.filter(r => r.status === 'done').length;
  const inprog = rows.filter(r => r.status === 'inprog').length;
  const pending = rows.filter(r => r.status === 'pending').length;

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">⚖ Đánh giá & Chấm điểm</div>
      </div>

      <div className="md-eval-header-cards">
        {[
          { label: 'Hoàn thành', value: done, color: '#10b981' },
          { label: 'Đang chấm', value: inprog, color: '#00d4ff' },
          { label: 'Chờ vòng kết thúc', value: pending, color: '#f59e0b' },
        ].map((c, i) => (
          <div key={i} className="md-eval-hcard">
            <div className="md-eval-hcard-num" style={{ color: c.color }}>{c.value}</div>
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
                  <td>
                    <span style={{ color:'rgba(255,255,255,0.7)' }}>{row.teamCount} đội</span>
                  </td>
                  <td>
                    <span className={`md-status-badge ${row.status}`}>
                      {{ done:'✓ Hoàn thành', inprog:'● Đang chấm', pending:'⏳ Chờ kết thúc' }[row.status]}
                    </span>
                  </td>
                  <td>
                    {row.roundEnded ? (
                      <button
                        className="md-review-btn"
                        onClick={() => navigate(`/mentor/scoring/${row.contestId}/rounds/${row.roundId}`)}
                      >
                        Chấm điểm →
                      </button>
                    ) : (
                      <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.25)' }}>Chưa mở</span>
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

// ─── Section: Settings ────────────────────────────────────────────────────────
function SectionSettings({ user }) {
  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">⚙ Cài đặt tài khoản</div>
      </div>
      <div style={{ maxWidth: 520 }}>
        <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'24px 24px', display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div className="md-avatar-lg" style={{ width:56, height:56, fontSize:'1.3rem' }}>{initials(user?.full_name || 'M')}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:'1rem', color:'#fff' }}>{user?.full_name}</div>
              <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)' }}>{user?.email}</div>
              <div style={{ display:'flex', gap:6, marginTop:4 }}>
                {user?.roles?.map(r => (
                  <span key={r.role_name} className="md-tag-cyan" style={{ textTransform:'capitalize' }}>{r.role_name}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="md-divider" />

          {[
            { label:'Họ và tên', val: user?.full_name || '—' },
            { label:'Email', val: user?.email || '—' },
            { label:'Trường / Tổ chức', val: user?.organization || '—' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.3)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>{f.label}</div>
              <div style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.8)', background:'rgba(0,0,0,0.3)', padding:'8px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.07)' }}>{f.val}</div>
            </div>
          ))}

          <button className="md-btn-primary" style={{ padding:'9px 0', marginTop:4 }} onClick={() => message.info('Tính năng đang phát triển')}>
            Chỉnh sửa hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Assistant Panel ───────────────────────────────────────────────────────
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
        <div>
          <div className="md-ai-title">SEAL AI Assistant</div>
        </div>
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
export default function MentorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showAi, setShowAi] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [contestRes, assignRes] = await Promise.all([
        request('/api/contests'),
        request('/api/mentor-assignments/me'),
      ]);
      const allContests = Array.isArray(contestRes) ? contestRes : (contestRes?.data ?? []);
      const allAssign  = Array.isArray(assignRes)  ? assignRes  : (assignRes?.data  ?? []);
      setContests(allContests);
      setAssignments(allAssign);
    } catch {
      messageApi.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const userName = user?.full_name?.split(' ').pop() || 'Mentor';
  const userInitials = initials(user?.full_name || 'M');

  const renderSection = () => {
    switch (activeView) {
      case 'dashboard':
        return <SectionDashboard contests={contests} assignments={assignments} loading={loading} navigate={navigate} />;
      case 'teams':
        return <SectionTeams assignments={assignments} contests={contests} onOpenTeam={setSelectedTeam} />;
      case 'chat':
        return <SectionChat assignments={assignments} />;
      case 'schedule':
        return <SectionSchedule contests={contests} />;
      case 'eval':
        return <SectionEval assignments={assignments} contests={contests} navigate={navigate} />;
      case 'settings':
        return <SectionSettings user={user} />;
      default:
        return null;
    }
  };

  const VIEW_LABELS = {
    dashboard: 'Tổng quan',
    teams:     'Đội của tôi',
    chat:      'Nhóm chat',
    schedule:  'Lịch trình',
    eval:      'Đánh giá',
    settings:  'Cài đặt',
  };

  return (
    <div className="md-root">
      {contextHolder}

      {/* ─── Topbar ─── */}
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
          <div className="md-notif-btn">
            🔔
            <div className="md-notif-dot" />
          </div>

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

      {/* ─── Sidebar ─── */}
      <Sidebar active={activeView} onChange={setActiveView} />

      {/* ─── Main ─── */}
      <main className="md-main">
        {/* Hero greeting — only on dashboard */}
        {activeView === 'dashboard' && (
          <div className="md-hero">
            <h1 className="md-hero-greeting">
              Xin chào, <span>{userName}</span> 👋
            </h1>
            <p className="md-hero-sub">
              Theo dõi tiến độ, hỗ trợ đội và quản lý lịch mentor từ đây.
            </p>
          </div>
        )}

        {/* Section content */}
        {renderSection()}
      </main>

      {/* ─── Team Drawer ─── */}
      {selectedTeam && (
        <TeamDrawer team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}

      {/* ─── AI Panel ─── */}
      {showAi && <AiPanel onClose={() => setShowAi(false)} />}

      {/* ─── AI FAB ─── */}
      <button className="md-ai-fab" onClick={() => setShowAi(v => !v)} title="AI Assistant">
        ✨
      </button>
    </div>
  );
}
