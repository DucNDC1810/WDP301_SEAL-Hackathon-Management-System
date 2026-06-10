import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress, Spin, Tooltip, message, Tag } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
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

function buildScheduleEvents(contests) {
  const events = [];
  contests.forEach((c, ci) => {
    const color = ACCENT_COLORS[ci % ACCENT_COLORS.length];
    (c.rounds || []).forEach(r => {
      const dateStr = r.start_date || r.end_date;
      if (dateStr) {
        events.push({
          id: `${c._id}-${r._id}`,
          title: r.name,
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
  return events.filter(e => e.type !== 'ended').sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate)).slice(0, 9);
}

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
    rounds,
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

const MOCK_MSGS = [
  { id: 1, mine: false, text: 'Thầy/cô ơi, nhóm em muốn hỏi về slide pitch', time: '10:24' },
  { id: 2, mine: true,  text: 'Ok, slide của nhóm đang ở phase nào rồi?',     time: '10:25' },
  { id: 3, mine: false, text: 'Dạ nhóm em đang viết proposal ạ',              time: '10:26' },
  { id: 4, mine: true,  text: 'Focus vào problem statement trước, sau đó mới solution nhé', time: '10:27' },
];

const NAV_GROUPS = [
  { items: [{ id: 'dashboard', icon: '⊞', label: 'Tổng quan' }, { id: 'teams', icon: '👥', label: 'Đội của tôi' }]},
  { items: [
    { id: 'scoring',  icon: '⚖',  label: 'Đội cần chấm', badge: null },
    { id: 'chat',     icon: '💬', label: 'Nhóm chat', badge: 3 },
    { id: 'schedule', icon: '📅', label: 'Lịch trình' },
    { id: 'eval',     icon: '📊',  label: 'Đánh giá' },
  ]},
  { items: [{ id: 'settings', icon: '⚙', label: 'Cài đặt' }]},
];

function Sidebar({ active, onChange }) {
  return (
    <aside className="w-[200px] min-h-screen flex-shrink-0 bg-[#0b1120] border-r border-white/5 flex flex-col px-3 py-2 sticky top-0 h-screen overflow-y-auto">
      {NAV_GROUPS.map((g, gi) => (
        <div key={gi}>
          {gi > 0 && <div className="h-px bg-white/5 my-1.5" />}
          {g.items.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-150 mb-0.5 ${
                active === item.id
                  ? 'bg-[rgba(168,85,247,0.1)] text-[#a855f7]'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/70'
              }`}
              onClick={() => onChange(item.id)}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge ? <span className="bg-[#ef4444] text-white text-[0.65rem] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full">{item.badge}</span> : null}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

function TeamDrawer({ team, onClose }) {
  const [notes, setNotes] = useState('');
  if (!team) return null;

  const statusLabel = { confirmed: '✓ Xác nhận', pending: 'Chờ xác nhận', disqualified: 'Loại', ELIMINATED: 'Bị loại' };
  const statusColor = { confirmed: 'text-[#10b981] bg-[rgba(16,185,129,0.1)]', pending: 'text-[#f59e0b] bg-[rgba(245,158,11,0.1)]', disqualified: 'text-[#ef4444] bg-[rgba(239,68,68,0.1)]', ELIMINATED: 'text-[#ef4444] bg-[rgba(239,68,68,0.1)]' };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-stretch justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-[380px] max-w-full bg-[#0d1425] border-l border-white/8 flex flex-col h-full overflow-y-auto">
        <div className="px-5 py-4 border-b border-white/7 bg-[rgba(168,85,247,0.05)]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-white text-[1rem]">{team.teamName}</div>
              <div className="text-[0.75rem] text-white/40 mt-0.5">{team.projectName || 'Chưa chọn chủ đề'}</div>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl cursor-pointer bg-transparent border-none">✕</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[team.poolName, team.roundName, team.contestName].map(t => (
              <span key={t} className="text-[0.68rem] px-2 py-0.5 rounded-full bg-[rgba(0,212,255,0.08)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]">{t}</span>
            ))}
            <span className={`text-[0.68rem] px-2 py-0.5 rounded-full ${statusColor[team.teamStatus] || 'text-white/50 bg-white/5'}`}>
              {statusLabel[team.teamStatus] || team.teamStatus}
            </span>
          </div>
        </div>

        <div className="flex-1 px-5 py-4 flex flex-col gap-5 overflow-y-auto">
          {/* Members */}
          <div>
            <div className="text-[0.72rem] font-bold text-white/30 uppercase tracking-wide mb-2">Thành viên ({team.members.length})</div>
            {team.members.length === 0 ? (
              <div className="text-[0.8rem] text-white/30">Chưa có thành viên</div>
            ) : (
              <div className="flex flex-col gap-2">
                {team.members.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-black/20 border border-white/6">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(168,85,247,0.15)] flex items-center justify-center font-bold text-[0.8rem] text-[#a855f7] flex-shrink-0">
                      {initials(m.full_name || m.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.82rem] text-white/80 font-medium truncate">{m.full_name || '(Chưa đặt tên)'}</div>
                      <div className="text-[0.7rem] text-white/35 truncate">{m.email}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[0.62rem] text-white/40">{i === 0 ? 'Leader' : 'Member'}</span>
                      {m.email_verified
                        ? <span className="text-[0.62rem] text-[#10b981]">✓ Xác thực</span>
                        : <span className="text-[0.62rem] text-[#f59e0b]">Chờ xác thực</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment info */}
          <div>
            <div className="text-[0.72rem] font-bold text-white/30 uppercase tracking-wide mb-2">Thông tin phân công</div>
            <div className="flex flex-col gap-2">
              {[
                { label:'Cuộc thi', val: team.contestName },
                { label:'Vòng thi', val: team.roundName },
                { label:'Bảng',     val: team.poolName },
                { label:'Ngày phân công', val: fmtDate(team.assignedAt) },
                { label:'Chủ đề',   val: team.projectName || 'Chưa chọn' },
              ].map(f => (
                <div key={f.label} className="flex justify-between px-3 py-2 rounded-lg bg-black/20 border border-white/6">
                  <span className="text-[0.75rem] text-white/40">{f.label}</span>
                  <span className="text-[0.78rem] text-white/80 font-medium">{f.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-[0.72rem] font-bold text-white/30 uppercase tracking-wide mb-2">Ghi chú mentor</div>
            <textarea
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/25 outline-none resize-none focus:border-[rgba(168,85,247,0.4)] transition-colors"
              rows={4}
              placeholder="Ghi chú phản hồi, điểm mạnh/yếu, hướng cải thiện..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <button
              className="mt-2 w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-black cursor-pointer border-none hover:opacity-90 transition-opacity"
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

function SectionDashboard({ contests, enriched, loading, navigate }) {
  const uniqueContestIds = [...new Set(enriched.map(a => a.contestId).filter(Boolean))];
  const totalContest  = uniqueContestIds.length;
  const ongoingCount  = uniqueContestIds.filter(cid => enriched.find(a => a.contestId === cid)?.contestStatus === 'ongoing').length;
  const totalAssigned = enriched.length;
  const activeRounds  = enriched.filter(a => a.roundIsActive).length;

  const STATS = [
    { label:'Hackathon tham gia', value:totalContest,  color:'#00d4ff', icon:'🏆' },
    { label:'Đang diễn ra',       value:ongoingCount,  color:'#10b981', icon:'▶' },
    { label:'Đội được phân công', value:totalAssigned, color:'#a855f7', icon:'👥' },
    { label:'Vòng đang mở',       value:activeRounds,  color:'#f59e0b', icon:'⏱' },
  ];

  const byContest = {};
  enriched.forEach(a => {
    if (!byContest[a.contestId]) {
      byContest[a.contestId] = { id: a.contestId, name: a.contestName, status: a.contestStatus, startDate: a.contestStart, endDate: a.contestEnd, rounds: a.rounds, accentColor: a.accentColor, teams: [] };
    }
    byContest[a.contestId].teams.push(a);
  });
  const hackathons = Object.values(byContest);

  return (
    <div>
      <div className="grid grid-cols-4 gap-3.5 mb-7">
        {STATS.map((s, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/7 rounded-2xl p-4 flex flex-col gap-2">
            <div className="text-xl">{s.icon}</div>
            <div className="text-[1.6rem] font-bold" style={{ color: s.color }}>
              {loading ? <Spin size="small" /> : s.value}
            </div>
            <div className="text-[0.72rem] text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        🏆 Hackathon của tôi
        {!loading && <span className="bg-white/8 text-white/50 text-xs px-2 py-0.5 rounded-full">{hackathons.length}</span>}
      </div>

      {loading && <div className="text-center py-16"><Spin size="large" /></div>}

      {!loading && hackathons.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-2">📋</div>
          <div className="text-white/60 font-semibold">Chưa được phân công hackathon nào</div>
          <div className="text-white/30 text-sm mt-1">Liên hệ Admin để được phân công</div>
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {hackathons.map(h => {
          const sc = { ongoing:'green', upcoming:'blue', ended:'default' }[h.status] || 'default';
          const activeRound = h.rounds.find(r => r.is_active);
          return (
            <div key={h.id} className="bg-white/[0.025] border border-white/7 rounded-2xl overflow-hidden">
              <div className="flex items-start justify-between flex-wrap gap-3 px-5 py-4" style={{ background: `linear-gradient(135deg,${h.accentColor}08,transparent)`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="font-extrabold text-white text-[1rem] mb-1">{h.name}</div>
                  <div className="text-[0.75rem] text-white/40">{fmtDate(h.startDate)} → {fmtDate(h.endDate)}</div>
                  <div className="text-[0.72rem] text-white/35 mt-1">{h.teams.length} đội được phân công · {h.rounds.length} vòng</div>
                </div>
                <Tag color={sc} style={{ fontSize:'0.72rem' }}>{{ ongoing:'Đang diễn ra', upcoming:'Sắp tới', ended:'Đã kết thúc' }[h.status]}</Tag>
              </div>

              {activeRound && (
                <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-3 bg-[rgba(0,212,255,0.04)] border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                    <span className="text-[0.82rem] text-white/70"><strong className="text-white">{activeRound.name}</strong> đang mở</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-black cursor-pointer border-none hover:opacity-90 transition-opacity"
                      onClick={() => navigate(`/mentor/portal/${h.id}/${activeRound._id}`)}>
                      🎯 Mentor Portal
                    </button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/60 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => navigate(`/mentor/scoring/${h.id}/rounds/${activeRound._id}`)}>
                      📝 Chấm điểm
                    </button>
                  </div>
                </div>
              )}

              {h.rounds.length > 0 && (
                <div className="px-5 py-3">
                  {h.rounds.map((r, ri) => {
                    const rColor = r.is_active ? '#10b981' : '#6b7280';
                    const rLabel = r.is_active ? 'Đang mở' : (r.scoring_locked ? 'Đã đóng' : 'Sắp tới');
                    return (
                      <div key={r._id} className={`flex items-center gap-2.5 py-1.5 ${ri > 0 ? 'border-t border-white/4' : ''}`}>
                        <span className="text-[0.68rem] text-white/25 min-w-[16px]">{ri+1}.</span>
                        <span className="text-[0.82rem] text-white/70 flex-1">{r.name}</span>
                        <span className="text-[0.68rem] font-bold" style={{ color: rColor }}>{rLabel}</span>
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

function SectionTeams({ enriched, onOpenTeam }) {
  if (enriched.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-2">👥</div>
        <div className="text-white/60 font-semibold">Chưa được phân công đội nào</div>
        <div className="text-white/30 text-sm mt-1">Admin sẽ phân công bạn mentor cho các đội trong cuộc thi</div>
      </div>
    );
  }

  const statusProgress = { confirmed: 60, pending: 25, disqualified: 0, ELIMINATED: 0 };

  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        👥 Đội được phân công
        <span className="bg-white/8 text-white/50 text-xs px-2 py-0.5 rounded-full">{enriched.length} phân công</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enriched.map(t => {
          const pct = statusProgress[t.teamStatus] ?? 25;
          const steps = Math.round((pct / 100) * 4);
          const verifiedCount = t.members.filter(m => m.email_verified).length;
          const statusText = { confirmed:'Xác nhận', pending:'Chờ xác nhận', disqualified:'Loại', ELIMINATED:'Bị loại' }[t.teamStatus] || t.teamStatus;

          return (
            <div key={t.key} className="bg-white/[0.025] border border-white/7 rounded-2xl overflow-hidden cursor-pointer hover:border-white/15 transition-all" onClick={() => onOpenTeam(t)}>
              <div className="p-4" style={{ background: `linear-gradient(135deg,${t.accentColor}08,transparent)` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-black/30 border-2 flex items-center justify-center font-bold text-[0.9rem] flex-shrink-0"
                    style={{ color: t.accentColor, borderColor: `${t.accentColor}55` }}>
                    {initials(t.teamName)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{t.teamName}</div>
                    <div className="text-[0.72rem] truncate" style={{ color: t.accentColor }}>{t.projectName || 'Chưa chọn chủ đề'}</div>
                    <span className="text-[0.65rem] text-white/40">◆ {t.poolName}</span>
                  </div>
                </div>

                <div className="flex justify-between text-[0.72rem] mb-1">
                  <span className="text-white/40">Trạng thái đội</span>
                  <span className="font-bold" style={{ color: t.accentColor }}>{statusText}</span>
                </div>
                <Progress percent={pct} strokeColor={t.accentColor} trailColor="rgba(255,255,255,0.06)" showInfo={false} size={[undefined, 5]} />
                <div className="flex gap-1.5 mt-2">
                  {['Đăng ký','Xác nhận','Mentoring','Nộp bài'].map((phase, pi) => (
                    <Tooltip key={phase} title={phase}>
                      <div className={`flex-1 h-1 rounded-full transition-colors ${pi < steps ? '' : 'bg-white/10'}`} style={pi < steps ? { background: t.accentColor } : {}} />
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/5 flex flex-col gap-1">
                <div className="text-[0.75rem] text-white/50">🏆 {t.contestName}</div>
                <div className="flex justify-between text-[0.72rem]">
                  <span className="text-white/40">📋 {t.roundName}</span>
                  <span className="text-white/40">👥 {t.members.length} thành viên ({verifiedCount} xác thực)</span>
                </div>
                <div className="text-[0.68rem] text-white/25 mt-1">Phân công: {relTime(t.assignedAt)}</div>
              </div>

              <div className="px-4 py-3 border-t border-white/5 flex gap-2">
                <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-black cursor-pointer border-none"
                  onClick={e => { e.stopPropagation(); onOpenTeam(t); }}>
                  Xem chi tiết
                </button>
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/60 border border-white/10 cursor-pointer hover:bg-white/10"
                  onClick={e => e.stopPropagation()}>
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

function SectionChat({ enriched }) {
  const convs = enriched.slice(0, 6).map((a, i) => ({
    id: i, name: a.teamName,
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
    return <div className="text-center py-16"><div className="text-4xl mb-2">💬</div><div className="text-white/60 font-semibold">Chưa có cuộc trò chuyện nào</div></div>;
  }

  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        💬 Nhóm chat
        <span className="bg-[rgba(245,158,11,0.1)] text-[#f59e0b] text-xs px-2 py-0.5 rounded-full">Demo</span>
      </div>
      <div className="flex gap-3 h-[450px] bg-white/[0.015] border border-white/7 rounded-2xl overflow-hidden">
        {/* Conversation list */}
        <div className="w-[220px] border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="px-3 py-2.5 text-[0.72rem] font-bold text-white/30 border-b border-white/5">Nhóm ({convs.length})</div>
          <div className="flex-1 overflow-y-auto">
            {convs.map(cv => (
              <div
                key={cv.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-white/4 transition-colors ${cv.id === activeCid ? 'bg-[rgba(168,85,247,0.1)]' : 'hover:bg-white/5'}`}
                onClick={() => setActiveCid(cv.id)}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[0.75rem] flex-shrink-0"
                  style={{ background: `${cv.color}22`, color: cv.color }}>
                  {initials(cv.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.8rem] font-semibold text-white/80 truncate">{cv.name}</div>
                  <div className="text-[0.68rem] text-white/35 truncate">{cv.last}</div>
                </div>
                {cv.unread > 0 && <div className="w-4.5 h-4.5 rounded-full bg-[#ef4444] text-white text-[0.6rem] font-bold flex items-center justify-center">{cv.unread}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[0.8rem]"
              style={{ background: `${activeConv?.color}22`, color: activeConv?.color }}>
              {initials(activeConv?.name || '')}
            </div>
            <div>
              <div className="text-[0.85rem] font-semibold text-white">{activeConv?.name}</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span className="text-[0.68rem] text-white/40">Online</span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.mine ? 'flex-row-reverse' : ''}`}>
                {!m.mine && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.7rem] font-bold flex-shrink-0 mt-auto"
                    style={{ background: `${activeConv?.color}22`, color: activeConv?.color }}>
                    {initials(activeConv?.name || '')}
                  </div>
                )}
                <div>
                  <div className={`px-3 py-2 rounded-xl text-[0.82rem] leading-relaxed max-w-[260px] ${
                    m.mine ? 'bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-black rounded-tr-sm' : 'bg-white/8 text-white/80 rounded-tl-sm'
                  }`}>{m.text}</div>
                  <div className={`text-[0.62rem] text-white/30 mt-0.5 ${m.mine ? 'text-right' : 'text-left'}`}>{m.time}</div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
            <input
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[0.82rem] text-white/80 placeholder-white/25 outline-none focus:border-[#a855f7] transition-colors"
              placeholder="Nhắn tin với nhóm..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
            />
            <button className="w-9 h-9 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-black font-bold flex items-center justify-center cursor-pointer border-none hover:opacity-90" onClick={sendMsg}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionSchedule({ contests, enriched }) {
  const assignedContestIds = new Set(enriched.map(a => a.contestId));
  const myContests = contests.filter(c => assignedContestIds.has(c._id?.toString()));
  const events = buildScheduleEvents(myContests);

  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        📅 Lịch trình <span className="bg-white/8 text-white/50 text-xs px-2 py-0.5 rounded-full">{events.length} sự kiện</span>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16"><div className="text-4xl mb-2">📅</div><div className="text-white/60 font-semibold">Không có lịch trình sắp tới</div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {events.map(ev => (
            <div key={ev.id} className="bg-white/[0.025] border border-white/7 rounded-xl p-4" style={{ borderLeftColor: ev.color, borderLeftWidth: 3 }}>
              <div className="text-[0.72rem] text-white/40 mb-1">{ev.icon} {ev.time}</div>
              <div className="font-semibold text-white text-[0.88rem] mb-0.5">{ev.title}</div>
              <div className="text-[0.72rem] mb-2" style={{ color: ev.color }}>{ev.subtitle}</div>
              <div className="text-[0.68rem] text-white/35 mb-2">📍 Online</div>
              <span className={`text-[0.68rem] px-2 py-0.5 rounded-full ${ev.type === 'active' ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]' : 'bg-[rgba(0,212,255,0.08)] text-[#00d4ff]'}`}>
                {ev.type === 'active' ? '▶ Đang diễn ra' : 'Sắp tới'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionEval({ enriched, scores, navigate }) {
  const rows = enriched.map(a => {
    const key = `${a.contestId}___${a.roundId}`;
    const myScores = scores[key] || [];
    const submitted = myScores.filter(s => s.status === 'submitted').length;
    const status = !a.roundIsActive ? (submitted > 0 ? (submitted >= myScores.length ? 'done' : 'inprog') : 'inprog') : 'pending';
    return { key: a.key, contestName: a.contestName, roundName: a.roundName, roundId: a.roundId, contestId: a.contestId, teamName: a.teamName, submitted, total: myScores.length, status, roundIsActive: a.roundIsActive };
  });

  const done = rows.filter(r => r.status === 'done').length;
  const inprog = rows.filter(r => r.status === 'inprog').length;
  const pending = rows.filter(r => r.status === 'pending').length;

  const statusColors = { done: 'text-[#10b981] bg-[rgba(16,185,129,0.1)]', inprog: 'text-[#00d4ff] bg-[rgba(0,212,255,0.1)]', pending: 'text-[#f59e0b] bg-[rgba(245,158,11,0.1)]' };

  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4">⚖ Đánh giá & Chấm điểm</div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[{ label:'Hoàn thành', value:done, color:'#10b981' }, { label:'Đang chấm', value:inprog, color:'#00d4ff' }, { label:'Chờ kết thúc vòng', value:pending, color:'#f59e0b' }].map((c, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/7 rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold" style={{ color:c.color }}>{c.value}</div>
            <div className="text-[0.72rem] text-white/40 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16"><div className="text-4xl mb-2">⚖</div><div className="text-white/60">Không có nhiệm vụ đánh giá</div></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/7">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/7">
                {['Cuộc thi / Vòng','Đội','Chấm điểm','Trạng thái','Hành động'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.72rem] text-white/35 font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.key} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3"><div className="font-semibold text-white text-[0.85rem]">{row.contestName}</div><div className="text-[0.72rem] text-white/40">{row.roundName}</div></td>
                  <td className="px-4 py-3 text-white/70 text-[0.82rem]">{row.teamName}</td>
                  <td className="px-4 py-3 text-white/60 text-[0.82rem]">{row.total > 0 ? `${row.submitted}/${row.total}` : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[0.72rem] px-2 py-0.5 rounded-full font-medium ${statusColors[row.status]}`}>{{ done:'✓ Hoàn thành', inprog:'● Đang chấm', pending:'⏳ Chờ kết thúc' }[row.status]}</span></td>
                  <td className="px-4 py-3">
                    {!row.roundIsActive ? (
                      <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[rgba(0,212,255,0.3)] text-[#00d4ff] bg-[rgba(0,212,255,0.08)] cursor-pointer hover:bg-[rgba(0,212,255,0.15)] transition-colors"
                        onClick={() => navigate(`/mentor/scoring/${row.contestId}/rounds/${row.roundId}`)}>
                        Chấm điểm →
                      </button>
                    ) : (
                      <span className="text-[0.72rem] text-white/25">Vòng đang mở</span>
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

function SectionScoring({ enriched, judgeMap, navigate }) {
  const seen = new Set();
  const rounds = enriched.reduce((acc, a) => {
    const key = `${a.contestId}___${a.roundId}`;
    if (!seen.has(key) && a.contestId && a.roundId) {
      seen.add(key);
      const judgePoolId = judgeMap[key];
      acc.push({ key, contestId: a.contestId, roundId: a.roundId, contestName: a.contestName, roundName: a.roundName, roundIsActive: a.roundIsActive, accentColor: a.accentColor, judgePoolId });
    }
    return acc;
  }, []);

  const endedRounds  = rounds.filter(r => !r.roundIsActive);
  const activeRounds = rounds.filter(r => r.roundIsActive);

  const goScore = (r) => {
    if (r.judgePoolId) navigate(`/judge/scoring/${r.contestId}/rounds/${r.roundId}/pools/${r.judgePoolId}`);
    else navigate(`/mentor/scoring/${r.contestId}/rounds/${r.roundId}`);
  };

  if (rounds.length === 0) {
    return <div className="text-center py-16"><div className="text-4xl mb-2">⚖</div><div className="text-white/60">Chưa có vòng chấm điểm nào</div></div>;
  }

  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        ⚖ Đội cần chấm điểm
        {endedRounds.length > 0 && <span className="bg-[rgba(16,185,129,0.1)] text-[#10b981] text-xs px-2 py-0.5 rounded-full">{endedRounds.length} vòng sẵn sàng</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[{ label:'Sẵn sàng chấm', value:endedRounds.length, color:'#10b981' }, { label:'Chờ vòng kết thúc', value:activeRounds.length, color:'#f59e0b' }].map((c, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/7 rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold" style={{ color:c.color }}>{c.value}</div>
            <div className="text-[0.72rem] text-white/40 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {endedRounds.map(r => (
          <div key={r.key} className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 rounded-2xl bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.15)]">
            <div>
              <div className="font-bold text-white">{r.contestName}</div>
              <div className="text-[0.78rem] text-white/45 mt-1">
                📋 {r.roundName} · Vòng đã kết thúc
                {r.judgePoolId && <span className="text-[#a855f7] ml-2">⚖ Giám khảo</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[0.72rem] text-[#10b981] font-semibold">✓ Sẵn sàng</span>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black cursor-pointer border-none hover:opacity-90"
                onClick={() => goScore(r)}>⚖ Vào chấm điểm</button>
            </div>
          </div>
        ))}
        {activeRounds.map(r => (
          <div key={r.key} className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 rounded-2xl bg-white/[0.015] border border-white/6 opacity-60">
            <div>
              <div className="font-bold text-white">{r.contestName}</div>
              <div className="text-[0.78rem] text-white/40 mt-1">📋 {r.roundName} · Vòng đang diễn ra</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[0.72rem] text-[#f59e0b]">⏳ Chờ kết thúc</span>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/30 border border-white/10 cursor-not-allowed" disabled>🔒 Chưa thể chấm</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionSettings({ user }) {
  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4">⚙ Cài đặt tài khoản</div>
      <div className="max-w-[520px]">
        <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[rgba(168,85,247,0.2)] to-[rgba(0,212,255,0.2)] border-2 border-[rgba(168,85,247,0.4)] flex items-center justify-center font-extrabold text-xl text-[#a855f7]">
              {initials(user?.full_name || 'M')}
            </div>
            <div>
              <div className="font-bold text-white text-[1rem]">{user?.full_name}</div>
              <div className="text-[0.78rem] text-white/40 mb-1">{user?.email}</div>
              <div className="flex gap-1.5">
                {user?.roles?.map(r => (
                  <span key={r.role_name} className="text-xs px-2 py-0.5 rounded-full bg-[rgba(0,212,255,0.08)] text-[#00d4ff] capitalize">{r.role_name}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="h-px bg-white/7" />
          {[{ label:'Họ và tên', val: user?.full_name || '—' }, { label:'Email', val: user?.email || '—' }, { label:'Trường / Tổ chức', val: user?.organization || '—' }].map(f => (
            <div key={f.label}>
              <div className="text-[0.72rem] font-bold text-white/30 mb-1 uppercase tracking-wide">{f.label}</div>
              <div className="text-[0.88rem] text-white/80 bg-black/30 px-3 py-2 rounded-lg border border-white/7">{f.val}</div>
            </div>
          ))}
          <button className="py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-black cursor-pointer border-none hover:opacity-90"
            onClick={() => message.info('Tính năng đang phát triển')}>
            Chỉnh sửa hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}

const VIEW_LABELS = { dashboard:'Tổng quan', teams:'Đội của tôi', scoring:'Đội cần chấm điểm', chat:'Nhóm chat', schedule:'Lịch trình', eval:'Đánh giá', settings:'Cài đặt' };

export default function MentorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [contests, setContests]     = useState([]);
  const [enriched, setEnriched]     = useState([]);
  const [judgeMap, setJudgeMap]     = useState({});
  const [scores, setScores]         = useState({});
  const [selectedTeam, setSelectedTeam] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [assignRes, judgeRes, contestRes] = await Promise.all([
        request('/api/mentor-assignments/me'),
        request('/api/judge-assignments/me').catch(() => []),
        request('/api/contests'),
      ]);

      const rawAssignments = Array.isArray(assignRes) ? assignRes : (assignRes?.data ?? []);
      const rawJudge       = Array.isArray(judgeRes)  ? judgeRes  : (judgeRes?.data  ?? []);
      const allContests    = Array.isArray(contestRes) ? contestRes : (contestRes?.data ?? []);

      const jMap = {};
      rawJudge.forEach(ja => {
        const cid = (ja.contest_id?._id || ja.contest_id)?.toString();
        const rid = ja.round_id?.toString();
        const pid = (ja.pool_id?._id || ja.pool_id)?.toString();
        if (cid && rid && pid) jMap[`${cid}___${rid}`] = pid;
      });
      setJudgeMap(jMap);

      const enrichedList = rawAssignments.map((a, idx) => enrichAssignment(a, idx));
      setContests(allContests);
      setEnriched(enrichedList);

      const endedRoundKeys = [...new Set(enrichedList.filter(a => a.contestId && a.roundId && !a.roundIsActive).map(a => `${a.contestId}___${a.roundId}`))];

      if (endedRoundKeys.length > 0) {
        const scoreEntries = await Promise.allSettled(
          endedRoundKeys.map(async key => {
            const [cid, rid] = key.split('___');
            const res = await request(`/api/scores/contests/${cid}/rounds/${rid}/my-scores`);
            return { key, data: Array.isArray(res) ? res : (res?.data ?? []) };
          })
        );
        const scoreMap = {};
        scoreEntries.forEach(result => {
          if (result.status === 'fulfilled' && result.value) scoreMap[result.value.key] = result.value.data;
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
    if (loading && activeView === 'dashboard') return <div className="text-center py-20"><Spin size="large" /></div>;
    switch (activeView) {
      case 'dashboard': return <SectionDashboard contests={contests} enriched={enriched} loading={loading} navigate={navigate} />;
      case 'teams':     return <SectionTeams     enriched={enriched} onOpenTeam={setSelectedTeam} />;
      case 'scoring':   return <SectionScoring   enriched={enriched} judgeMap={judgeMap} navigate={navigate} />;
      case 'chat':      return <SectionChat      enriched={enriched} />;
      case 'schedule':  return <SectionSchedule  contests={contests} enriched={enriched} />;
      case 'eval':      return <SectionEval      enriched={enriched} scores={scores} navigate={navigate} />;
      case 'settings':  return <SectionSettings  user={user} />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#060b16] text-[#c9d6e8]">
      {contextHolder}

      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center bg-[#0b1120] border-b border-white/5 px-5">
        <div className="flex items-center gap-3">
          <span className="text-[#a855f7] font-extrabold tracking-[2px]" style={{ fontFamily: "'Orbitron', monospace" }}>SEAL</span>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-white/50 text-sm">Mentor Portal</span>
        </div>
        <div className="flex-1 px-5">
          <span className="text-[0.78rem] text-white/25">
            Dashboard / <span className="text-white/60">{VIEW_LABELS[activeView]}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer text-white/40 hover:text-white/70">🔔<div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#ef4444]" /></div>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[rgba(168,85,247,0.05)] border border-[rgba(168,85,247,0.15)]">
            <div className="w-8 h-8 rounded-lg bg-[rgba(168,85,247,0.2)] border border-[rgba(168,85,247,0.4)] flex items-center justify-center font-bold text-[0.82rem] text-[#a855f7]">
              {userInitials}
            </div>
            <div>
              <div className="text-[0.82rem] font-semibold text-white/80">{user?.full_name || 'Mentor'}</div>
              <span className="text-xs text-[#a855f7]">🎯 Mentor</span>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 text-sm cursor-pointer hover:bg-[#1a1020] hover:text-[#ff6b6b] hover:border-[rgba(239,68,68,0.3)] transition-all bg-transparent" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <div className="mt-14 flex-shrink-0">
        <Sidebar active={activeView} onChange={setActiveView} />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 mt-14 p-6 overflow-y-auto">
        {activeView === 'dashboard' && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">
              Xin chào, <span className="text-[#a855f7]">{user?.full_name?.split(' ').pop() || 'Mentor'}</span> 👋
            </h1>
            <p className="text-white/50 text-sm">Theo dõi tiến độ, hỗ trợ đội và quản lý lịch mentor từ đây.</p>
          </div>
        )}
        {renderSection()}
      </main>

      {/* Team Drawer */}
      {selectedTeam && <TeamDrawer team={selectedTeam} onClose={() => setSelectedTeam(null)} />}
    </div>
  );
}
