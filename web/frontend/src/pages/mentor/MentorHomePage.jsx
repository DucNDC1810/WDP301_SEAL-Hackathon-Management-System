import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Progress, Tooltip, Spin, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

const HACKATHON_STATUS = {
  ongoing:  { label: 'Đang diễn ra', color: 'green' },
  upcoming: { label: 'Sắp tới',      color: 'blue' },
  ended:    { label: 'Đã kết thúc',  color: 'default' },
};

const ROUND_STATUS = {
  active:   { label: 'Đang mở', color: '#10b981' },
  upcoming: { label: 'Sắp tới', color: '#60a5fa' },
  ended:    { label: 'Đã đóng', color: '#6b7280' },
};

const ROLE_CFG = {
  mentor: { label: 'Mentor', icon: '🎯', bg: 'rgba(168,85,247,0.12)', color: '#a855f7', border: 'rgba(168,85,247,0.3)' },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatsBar({ hackathons }) {
  const total = hackathons.length;
  const ongoing = hackathons.filter(h => h.status === 'ongoing').length;
  const totalTeams = hackathons.reduce((s, h) => s + h.assignedTeams, 0);
  const pending = hackathons.reduce((s, h) => s + h.pendingActions, 0);

  const stats = [
    { label: 'Hackathon tham gia', value: total,      color: '#00d4ff', icon: '🏆' },
    { label: 'Đang diễn ra',       value: ongoing,    color: '#10b981', icon: '▶' },
    { label: 'Đội được phân công', value: totalTeams, color: '#a855f7', icon: '👥' },
    { label: 'Cần xử lý',          value: pending,    color: pending > 0 ? '#f59e0b' : '#6b7280', icon: '⏳' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mt-4">
      {stats.map((s, i) => (
        <div key={i} className="bg-white/[0.025] border border-white/7 rounded-xl p-3 flex flex-col gap-1">
          <div className="text-xl">{s.icon}</div>
          <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
          <div className="text-[0.7rem] text-white/40">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function HackathonCard({ hackathon }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(hackathon.status === 'ongoing');
  const sc = HACKATHON_STATUS[hackathon.status];
  const activeRound = hackathon.rounds.find(r => r.status === 'active');
  const isMentor = hackathon.myRoles.includes('mentor');

  const totalScored = hackathon.rounds.reduce((s, r) => s + r.scoredTeams, 0);
  const totalPossible = hackathon.rounds.reduce((s, r) => s + r.totalTeams, 0);
  const overallProgress = totalPossible > 0 ? Math.round((totalScored / totalPossible) * 100) : 0;

  return (
    <div className="bg-white/[0.025] border border-white/7 rounded-2xl overflow-hidden">
      {/* Banner */}
      <div className="relative p-5" style={{ background: hackathon.banner }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="font-bold text-white text-[1rem] mb-1">{hackathon.name}</div>
            <div className="text-[0.72rem] text-white/50">{fmtDate(hackathon.startDate)} → {fmtDate(hackathon.endDate)}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {hackathon.myRoles.map(role => {
                const cfg = ROLE_CFG[role];
                if (!cfg) return null;
                return (
                  <span key={role} className="text-[0.72rem] px-2 py-0.5 rounded-full border"
                    style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                    {cfg.icon} {cfg.label}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Tag color={sc.color} style={{ fontSize: '0.75rem', padding: '2px 10px' }}>{sc.label}</Tag>
            {hackathon.pendingActions > 0 && (
              <div className="flex items-center gap-1.5 text-[0.72rem] text-[#f59e0b]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                {hackathon.pendingActions} cần xử lý
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Active round quick actions */}
        {activeRound && (
          <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2.5 rounded-xl bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.15)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
              <span className="text-[0.82rem] text-white/70">
                <strong className="text-white">{activeRound.name}</strong> đang mở
                {activeRound.totalTeams > 0 && ` — ${activeRound.scoredTeams}/${activeRound.totalTeams} đội`}
              </span>
            </div>
            <div className="flex gap-2">
              {isMentor && (
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(168,85,247,0.12)] text-[#a855f7] border border-[rgba(168,85,247,0.3)] cursor-pointer hover:bg-[rgba(168,85,247,0.2)] transition-colors"
                  onClick={() => navigate(`/mentor/portal/${hackathon.id}/${activeRound.id}`)}>
                  🎯 Mentor Portal
                </button>
              )}
              {isMentor && (
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(0,212,255,0.08)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)] cursor-pointer hover:bg-[rgba(0,212,255,0.15)] transition-colors"
                  onClick={() => navigate(`/mentor/scoring/${hackathon.id}/rounds/${activeRound.id}`)}>
                  📝 Chấm điểm
                </button>
              )}
              {isMentor && (
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(16,185,129,0.08)] text-[#10b981] border border-[rgba(16,185,129,0.25)] cursor-pointer hover:bg-[rgba(16,185,129,0.15)] transition-colors"
                  onClick={() => navigate('/mentor/chat')}>
                  💬 Chat
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        {totalPossible > 0 && (
          <div>
            <div className="flex justify-between text-[0.72rem] mb-1.5">
              <span className="text-white/40">Tiến độ tổng: {totalScored}/{totalPossible}</span>
              <span className="font-bold" style={{ color: hackathon.accentColor }}>{overallProgress}%</span>
            </div>
            <Progress percent={overallProgress} strokeColor={hackathon.accentColor} trailColor="rgba(255,255,255,0.07)" showInfo={false} size={[undefined, 6]} />
          </div>
        )}

        {/* Rounds */}
        {hackathon.rounds.length > 0 && (
          <>
            <button
              className="flex items-center justify-between text-[0.78rem] text-white/50 hover:text-white/70 cursor-pointer bg-transparent border-none py-1"
              onClick={() => setExpanded(e => !e)}
            >
              <span>Vòng thi ({hackathon.rounds.length})</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}
                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {expanded && (
              <div className="flex flex-col">
                {hackathon.rounds.map((round, idx) => {
                  const rcfg = ROUND_STATUS[round.status];
                  const pct = round.totalTeams > 0 ? Math.round((round.scoredTeams / round.totalTeams) * 100) : 0;
                  const isActive = round.status === 'active';
                  return (
                    <div key={round.id} className={`flex items-center gap-3 py-2 ${idx > 0 ? 'border-t border-white/5' : ''}`}>
                      <span className="text-[0.68rem] text-white/25 w-5">{idx + 1}.</span>
                      <span className="text-[0.82rem] text-white/70 flex-1">{round.name}</span>
                      {round.totalTeams > 0 && (
                        <Progress percent={pct} strokeColor={rcfg.color} trailColor="rgba(255,255,255,0.07)"
                          showInfo={false} size={[80, 4]} />
                      )}
                      <span className="text-[0.68rem] font-bold" style={{ color: rcfg.color }}>{rcfg.label}</span>
                      {isActive && isMentor && (
                        <div className="flex gap-1.5">
                          <Tooltip title="Mở Mentor Portal">
                            <button className="w-7 h-7 rounded-lg bg-[rgba(168,85,247,0.1)] text-[#a855f7] border border-[rgba(168,85,247,0.3)] text-xs cursor-pointer hover:bg-[rgba(168,85,247,0.2)] transition-colors"
                              onClick={() => navigate(`/mentor/portal/${hackathon.id}/${round.id}`)}>
                              🎯
                            </button>
                          </Tooltip>
                          <Tooltip title="Trang chấm điểm">
                            <button className="w-7 h-7 rounded-lg bg-[rgba(0,212,255,0.08)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)] text-xs cursor-pointer hover:bg-[rgba(0,212,255,0.15)] transition-colors"
                              onClick={() => navigate(`/mentor/scoring/${hackathon.id}/rounds/${round.id}`)}>
                              📝
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MentorHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const contestsRes = await request('/api/contests');
        const contests = Array.isArray(contestsRes) ? contestsRes : (contestsRes?.data ?? []);

        const statusMap = { open: 'ongoing', draft: 'upcoming', closed: 'ended' };
        const ACCENT_COLORS = ['#00d4ff', '#a855f7', '#10b981', '#f59e0b', '#ef4444'];
        const BANNERS = [
          'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
          'linear-gradient(135deg, #1a0533, #2d1b69, #11998e)',
          'linear-gradient(135deg, #0d1b2a, #1b4332, #081c15)',
        ];

        const filtered = contests.filter(c => c.status !== 'draft');
        const hacks = filtered.map((c, i) => ({
          id: c._id,
          name: c.title,
          status: statusMap[c.status] || 'upcoming',
          banner: BANNERS[i % BANNERS.length],
          accentColor: ACCENT_COLORS[i % ACCENT_COLORS.length],
          startDate: c.start_date,
          endDate: c.end_date,
          myRoles: ['mentor'],
          assignedTeams: 0,
          rounds: (c.rounds || []).map(r => ({
            id: r._id,
            name: r.name,
            status: r.is_active ? 'active' : (r.scoring_locked ? 'ended' : 'upcoming'),
            scoredTeams: 0,
            totalTeams: 0,
          })),
          pendingActions: 0,
        }));

        setHackathons(hacks);
      } catch {
        messageApi.error('Không thể tải dữ liệu hackathon');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#060b16] text-[#c9d6e8] flex flex-col">
      {contextHolder}

      {/* Topbar */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#0b1120] border-b border-white/5 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="text-[#00d4ff] font-extrabold tracking-[2px]" style={{ fontFamily: "'Orbitron', monospace" }}>SEAL</span>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-white/50 text-sm">Mentor Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(16,185,129,0.08)] text-[#10b981] border border-[rgba(16,185,129,0.25)] cursor-pointer hover:bg-[rgba(16,185,129,0.15)] transition-colors"
            onClick={() => navigate('/mentor/chat')}
          >
            💬 Chat với đội
          </button>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[rgba(168,85,247,0.05)] border border-[rgba(168,85,247,0.15)]">
            <div className="w-8 h-8 rounded-lg bg-[rgba(168,85,247,0.15)] flex items-center justify-center font-bold text-[0.85rem] text-[#a855f7]">
              {(user?.full_name || 'M')[0]}
            </div>
            <div>
              <div className="text-[0.82rem] font-semibold text-white/80">{user?.full_name || 'Mentor'}</div>
              <div className="flex gap-1">
                {user?.roles?.map(r => (
                  <span key={r.role_name} className="text-[0.65rem]" style={{ color: ROLE_CFG[r.role_name]?.color || '#94a3b8' }}>
                    {ROLE_CFG[r.role_name]?.icon} {r.role_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 text-sm cursor-pointer hover:bg-[#1a1020] hover:text-[#ff6b6b] hover:border-[rgba(239,68,68,0.3)] transition-all bg-transparent"
            onClick={logout}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="px-6 py-8 max-w-[1100px] mx-auto w-full">
        <h1 className="text-2xl font-bold text-white mb-1">
          Xin chào, <span className="text-[#a855f7]">{user?.full_name?.split(' ').pop() || 'Mentor'}</span> 👋
        </h1>
        <p className="text-white/50 text-sm">Theo dõi tiến độ các đội được phân công và hỗ trợ mentor.</p>
        {!loading && <StatsBar hackathons={hackathons} />}
      </div>

      {/* Content */}
      <div className="px-6 pb-10 max-w-[1100px] mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[0.85rem] font-bold text-white/70 uppercase tracking-wide flex items-center gap-2">
            🏆 Hackathon của tôi
            {!loading && <span className="bg-white/8 text-white/50 text-xs px-2 py-0.5 rounded-full">{hackathons.length}</span>}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-16"><Spin size="large" /></div>
        ) : hackathons.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-white/60 font-semibold mb-1">Bạn chưa được phân công hackathon nào</div>
            <div className="text-white/30 text-sm">Liên hệ Admin để được phân công</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {hackathons.map(h => <HackathonCard key={h.id} hackathon={h} />)}
          </div>
        )}
      </div>
    </div>
  );
}
