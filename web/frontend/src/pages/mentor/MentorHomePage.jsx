import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Progress, Tooltip, Spin, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import './MentorHomePage.css';

// ─── Config (display only, no mock data) ─────────────────────────────────────
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

// ─── Stats Summary ─────────────────────────────────────────────────────────
function StatsBar({ hackathons }) {
  const total = hackathons.length;
  const ongoing = hackathons.filter(h => h.status === 'ongoing').length;
  const totalTeams = hackathons.reduce((s, h) => s + h.assignedTeams, 0);
  const pending = hackathons.reduce((s, h) => s + h.pendingActions, 0);

  const stats = [
    { label: 'Hackathon tham gia', value: total,      color: 'var(--cyan, #00d4ff)',     icon: '🏆' },
    { label: 'Đang diễn ra',       value: ongoing,    color: '#10b981',                  icon: '▶' },
    { label: 'Đội được phân công', value: totalTeams, color: 'var(--purple, #a855f7)',   icon: '👥' },
    { label: 'Cần xử lý',          value: pending,    color: pending > 0 ? '#f59e0b' : '#6b7280', icon: '⏳' },
  ];

  return (
    <div className="mh-stats-bar">
      {stats.map((s, i) => (
        <div key={i} className="mh-stat">
          <div className="mh-stat-icon">{s.icon}</div>
          <div className="mh-stat-num" style={{ color: s.color }}>{s.value}</div>
          <div className="mh-stat-lbl">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Hackathon Card ─────────────────────────────────────────────────────────
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
    <div className="mh-hackathon-card" style={{ '--accent': hackathon.accentColor }}>
      {/* Banner */}
      <div className="mh-card-banner" style={{ background: hackathon.banner }}>
        <div className="mh-card-banner-overlay" />
        <div className="mh-card-banner-content">
          <div className="mh-card-banner-left">
            <div className="mh-card-name">{hackathon.name}</div>
            <div className="mh-card-date">
              {fmtDate(hackathon.startDate)} → {fmtDate(hackathon.endDate)}
            </div>
            <div className="mh-role-badges">
              {hackathon.myRoles.map(role => {
                const cfg = ROLE_CFG[role];
                if (!cfg) return null;
                return (
                  <span key={role} className="mh-role-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                    {cfg.icon} {cfg.label}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="mh-card-banner-right">
            <Tag color={sc.color} style={{ fontSize: '0.75rem', padding: '2px 10px' }}>{sc.label}</Tag>
            {hackathon.pendingActions > 0 && (
              <div className="mh-pending-badge">
                <span className="mh-pending-dot" />
                {hackathon.pendingActions} cần xử lý
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mh-card-body">
        {/* Quick actions for active round */}
        {activeRound && (
          <div className="mh-active-round-bar">
            <div className="mh-active-round-info">
              <span className="mh-active-dot" />
              <span className="mh-active-round-name">
                <strong>{activeRound.name}</strong> đang mở
                {activeRound.totalTeams > 0 && ` — ${activeRound.scoredTeams}/${activeRound.totalTeams} đội`}
              </span>
            </div>
            <div className="mh-active-round-actions">
              {isMentor && (
                <button
                  className="mh-action-btn mh-action-btn--mentor"
                  onClick={() => navigate(`/mentor/portal/${hackathon.id}/${activeRound.id}`)}
                >
                  🎯 Mentor Portal
                </button>
              )}
              {isMentor && (
                <button
                  className="mh-action-btn"
                  style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.25)' }}
                  onClick={() => navigate(`/mentor/scoring/${hackathon.id}/rounds/${activeRound.id}`)}
                >
                  📝 Chấm điểm
                </button>
              )}
              {isMentor && (
                <button
                  className="mh-action-btn"
                  style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                  onClick={() => navigate('/mentor/chat')}
                >
                  💬 Chat
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        {totalPossible > 0 && (
          <div className="mh-card-progress">
            <div className="mh-card-progress-row">
              <span className="mh-card-progress-label">Tiến độ tổng: {totalScored}/{totalPossible}</span>
              <span className="mh-card-progress-pct">{overallProgress}%</span>
            </div>
            <Progress
              percent={overallProgress}
              strokeColor={hackathon.accentColor}
              trailColor="rgba(255,255,255,0.07)"
              showInfo={false}
              size={[undefined, 6]}
            />
          </div>
        )}

        {/* Rounds expandable */}
        {hackathon.rounds.length > 0 && (
          <>
            <button className="mh-expand-btn" onClick={() => setExpanded(e => !e)}>
              <span>Vòng thi ({hackathon.rounds.length})</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}
                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {expanded && (
              <div className="mh-rounds-list">
                {hackathon.rounds.map((round, idx) => {
                  const rcfg = ROUND_STATUS[round.status];
                  const pct = round.totalTeams > 0 ? Math.round((round.scoredTeams / round.totalTeams) * 100) : 0;
                  const isActive = round.status === 'active';
                  return (
                    <div key={round.id} className={`mh-round-row ${isActive ? 'mh-round-row--active' : ''}`}>
                      <div className="mh-round-seq">{idx + 1}</div>
                      <div className="mh-round-info-col">
                        <div className="mh-round-row-name">{round.name}</div>
                        {round.totalTeams > 0 && (
                          <div className="mh-round-scored">{round.scoredTeams}/{round.totalTeams} đã chấm</div>
                        )}
                      </div>
                      {round.totalTeams > 0 && (
                        <div className="mh-round-progress-col">
                          <Progress
                            percent={pct}
                            strokeColor={rcfg.color}
                            trailColor="rgba(255,255,255,0.07)"
                            showInfo={false}
                            size={[80, 4]}
                          />
                        </div>
                      )}
                      <div className="mh-round-status-dot" style={{ color: rcfg.color, fontSize: '0.7rem', fontWeight: 700 }}>
                        {rcfg.label}
                      </div>
                      {isActive && isMentor && (
                        <div className="mh-round-actions">
                          <Tooltip title="Mở Mentor Portal">
                            <button className="mh-round-btn mh-round-btn--mentor"
                              onClick={() => navigate(`/mentor/portal/${hackathon.id}/${round.id}`)}>
                              🎯
                            </button>
                          </Tooltip>
                          <Tooltip title="Trang chấm điểm">
                            <button className="mh-round-btn"
                              style={{ color: '#00d4ff', borderColor: 'rgba(0,212,255,0.3)' }}
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

// ─── Page ───────────────────────────────────────────────────────────────────
export default function MentorHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  const isMentor = user?.roles?.some(r => r.role_name === 'mentor');

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

        // Show all open/closed contests
        const filtered = contests.filter(c => c.status !== 'draft');

        const hacks = filtered.map((c, i) => {
          return {
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
          };
        });

        setHackathons(hacks);
      } catch (e) {
        messageApi.error('Không thể tải dữ liệu hackathon');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="mh-page">
      {contextHolder}

      {/* ─── Topbar ─── */}
      <div className="mh-topbar">
        <div className="mh-topbar-brand">
          <span className="mh-topbar-logo">SEAL</span>
          <span className="mh-topbar-divider" />
          <span className="mh-topbar-subtitle">Mentor Portal</span>
        </div>
        <div className="mh-topbar-right">
          <button
            className="mh-action-btn"
            style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
            onClick={() => navigate('/mentor/chat')}
          >
            💬 Chat với đội
          </button>
          <div className="mh-user-pill">
            <div className="mh-user-avatar">{(user?.full_name || 'M')[0]}</div>
            <div className="mh-user-info">
              <div className="mh-user-name">{user?.full_name || 'Mentor'}</div>
              <div className="mh-user-roles">
                {user?.roles?.map(r => (
                  <span key={r.role_name} className="mh-user-role-tag" style={{ color: ROLE_CFG[r.role_name]?.color || '#94a3b8' }}>
                    {ROLE_CFG[r.role_name]?.icon} {r.role_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button className="mh-logout-btn" onClick={logout}>Đăng xuất</button>
        </div>
      </div>

      {/* ─── Hero ─── */}
      <div className="mh-hero">
        <div className="mh-hero-text">
          <h1 className="mh-hero-title">
            Xin chào, <span className="mh-hero-name">{user?.full_name?.split(' ').pop() || 'Mentor'}</span> 👋
          </h1>
          <p className="mh-hero-sub">
            Theo dõi tiến độ các đội được phân công và hỗ trợ mentor.
          </p>
        </div>
        {!loading && <StatsBar hackathons={hackathons} />}
      </div>

      {/* ─── Hackathon List ─── */}
      <div className="mh-content">
        <div className="mh-section-header">
          <h2 className="mh-section-title">Hackathon của tôi</h2>
          {!loading && <span className="mh-section-count">{hackathons.length} hackathon</span>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : hackathons.length === 0 ? (
          <div className="mh-empty">
            <div className="mh-empty-icon">📋</div>
            <div className="mh-empty-text">Bạn chưa được phân công hackathon nào</div>
            <div className="mh-empty-sub">Liên hệ Admin để được phân công</div>
          </div>
        ) : (
          <div className="mh-cards-list">
            {hackathons.map(h => <HackathonCard key={h.id} hackathon={h} />)}
          </div>
        )}
      </div>
    </div>
  );
}
