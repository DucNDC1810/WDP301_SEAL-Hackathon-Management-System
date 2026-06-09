import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress, Spin, Tooltip, message, Tag } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import '../mentor/MentorDashboard.css';
import './JudgeDashboard.css';

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

const ACCENT_COLORS = ['#00d4ff', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
const statusMap = { open: 'ongoing', draft: 'upcoming', closed: 'ended' };

// ─── Enrich raw judge assignment ──────────────────────────────────────────────
function enrichJudgeAssignment(a, idx, scoreMap) {
  const contest = a.contest_id || {};
  const rounds  = contest.rounds || [];
  const round   = rounds.find(r => r._id?.toString() === a.round_id?.toString()) || {};
  const pool    = a.pool_id || {};
  const teams   = Array.isArray(pool.teams) ? pool.teams : [];
  const scoreKey = `${contest._id?.toString()}___${round._id?.toString()}`;
  const myScores  = scoreMap[scoreKey] || [];

  const enrichedTeams = teams.map(t => {
    const tid = t._id?.toString();
    const score = myScores.find(s => (s.team_id?._id || s.team_id)?.toString() === tid);
    return {
      id: tid,
      name: typeof t === 'string' ? `Đội ${idx + 1}` : (t.team_name || '—'),
      status: t.status || 'pending',
      projectName: t.topic_id?.title || '',
      memberCount: (t.members || []).length,
      scoreStatus: score ? score.status : 'none', // 'draft' | 'submitted' | 'none'
      totalScore: score?.total_score ?? null,
      scoreId: score?._id,
    };
  });

  const reviewed = enrichedTeams.filter(t => t.scoreStatus === 'submitted').length;
  const total    = enrichedTeams.length;
  const pct      = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return {
    key: a._id,
    contestId:     contest._id?.toString() || '',
    contestName:   contest.title || '—',
    contestStatus: statusMap[contest.status] || 'upcoming',
    contestStart:  contest.start_date,
    contestEnd:    contest.end_date,
    scoreCriteria: contest.score_criteria || [],
    rounds,
    roundId:       round._id?.toString() || a.round_id?.toString() || '',
    roundName:     round.name || '—',
    roundIsActive: !!round.is_active,
    poolId:        pool._id?.toString() || '',
    poolName:      pool.pool_name || '—',
    teams:         enrichedTeams,
    teamCount:     total,
    reviewedCount: reviewed,
    pct,
    judgeType:     a.judge_type,
    accentColor:   ACCENT_COLORS[idx % ACCENT_COLORS.length],
  };
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, color = '#00d4ff', size = 56 }) {
  const r   = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <div className="jd-ring-wrap" style={{ width: size, height: size }}>
      <svg className="jd-ring-svg" width={size} height={size}>
        <circle className="jd-ring-bg" cx={size/2} cy={size/2} r={r} strokeWidth={5} />
        <circle
          className="jd-ring-fg"
          cx={size/2} cy={size/2} r={r} strokeWidth={5}
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={off}
        />
      </svg>
      <div className="jd-ring-text" style={{ color }}>{pct}%</div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  { items: [
    { id: 'dashboard',  icon: '⊞', label: 'Tổng quan' },
  ]},
  { items: [
    { id: 'evaluation', icon: '📝', label: 'Đánh giá',    badge: null },
    { id: 'teams',      icon: '👥', label: 'Đội cần chấm' },
    { id: 'results',    icon: '📊', label: 'Kết quả' },
  ]},
  { items: [
    { id: 'schedule', icon: '📅', label: 'Lịch trình' },
  ]},
  { items: [
    { id: 'ai', icon: '🤖', label: 'AI Assistant' },
  ]},
  { items: [
    { id: 'profile', icon: '👤', label: 'Hồ sơ' },
  ]},
];

function Sidebar({ active, onChange, pendingCount }) {
  return (
    <aside className="md-sidebar" style={{ padding: '8px 12px' }}>
      {NAV_GROUPS.map((g, gi) => (
        <div key={gi}>
          {gi > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />}
          {g.items.map(item => {
            const badge = item.id === 'evaluation' && pendingCount > 0 ? pendingCount : item.badge;
            return (
              <div
                key={item.id}
                className={`md-nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => onChange(item.id)}
              >
                <span className="md-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {badge ? <span className="md-nav-badge">{badge}</span> : null}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

// ─── Section: Dashboard ───────────────────────────────────────────────────────
function SectionDashboard({ enriched, loading, navigate, onNav }) {
  const uniqueContests = [...new Set(enriched.map(a => a.contestId).filter(Boolean))];
  const totalContests  = uniqueContests.length;
  const activeRounds   = enriched.filter(a => a.roundIsActive).length;
  const totalTeams     = enriched.reduce((s, a) => s + a.teamCount, 0);
  const reviewedTeams  = enriched.reduce((s, a) => s + a.reviewedCount, 0);
  const pendingTeams   = totalTeams - reviewedTeams;
  const completionPct  = totalTeams > 0 ? Math.round((reviewedTeams / totalTeams) * 100) : 0;

  const urgentItems = enriched.filter(a => !a.roundIsActive && a.pct < 100 && a.teamCount > 0);
  const urgentTeamsLeft = urgentItems.reduce((s, a) => s + (a.teamCount - a.reviewedCount), 0);

  const STATS = [
    { label: 'Cuộc thi tham gia', value: totalContests, color: '#00d4ff', icon: '🏆',
      bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.2)',
      accent: 'linear-gradient(90deg,#00d4ff,#a855f7)', glow: 'rgba(0,212,255,0.08)' },
    { label: 'Vòng đang mở',      value: activeRounds,  color: '#10b981', icon: '▶',
      bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)',
      accent: 'linear-gradient(90deg,#10b981,#00d4ff)', glow: 'rgba(16,185,129,0.08)' },
    { label: 'Đội đã chấm',       value: reviewedTeams, color: '#a855f7', icon: '✓',
      bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)',
      accent: 'linear-gradient(90deg,#a855f7,#f59e0b)', glow: 'rgba(168,85,247,0.08)' },
    { label: 'Chờ chấm điểm',     value: pendingTeams,  color: pendingTeams > 0 ? '#f59e0b' : '#6b7280', icon: '⏳',
      bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)',
      accent: 'linear-gradient(90deg,#f59e0b,#ef4444)', glow: 'rgba(245,158,11,0.08)' },
    { label: 'Tỉ lệ hoàn thành',  value: `${completionPct}%`, color: '#3b82f6', icon: '📈',
      bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)',
      accent: 'linear-gradient(90deg,#3b82f6,#a855f7)', glow: 'rgba(59,130,246,0.08)' },
  ];

  return (
    <div>
      {/* Stats row — 5 cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:28 }}>
        {STATS.map((s, i) => (
          <div key={i} className="md-stat-card" style={{ '--card-accent': s.accent, '--glow-color': s.glow }}>
            <div className="md-stat-icon-wrap" style={{ background: s.bg, border:`1px solid ${s.border}` }}>
              {s.icon}
            </div>
            <div className="md-stat-num" style={{ color: s.color, fontSize:'1.6rem' }}>
              {loading ? <Spin size="small" /> : s.value}
            </div>
            <div className="md-stat-label">{s.label}</div>
            <div className="md-stat-glow" style={{ background: s.glow }} />
          </div>
        ))}
      </div>

      {/* Urgent panel */}
      {!loading && urgentTeamsLeft > 0 && (
        <div className="jd-urgent-card">
          <div className="jd-urgent-glow" />
          <div className="jd-urgent-left">
            <div className="jd-urgent-icon">⚠</div>
            <div>
              <div className="jd-urgent-title">Cần hoàn thành chấm điểm</div>
              <div className="jd-urgent-sub">
                {urgentItems.length} bảng chưa chấm xong — vòng đã kết thúc
              </div>
              <div className="jd-urgent-deadline">📅 Hãy hoàn thành sớm để có kết quả chính xác</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div className="jd-urgent-stat">
              <div className="jd-urgent-num">{urgentTeamsLeft}</div>
              <div className="jd-urgent-lbl">đội còn lại</div>
            </div>
            <button className="jd-urgent-btn" onClick={() => onNav('evaluation')}>
              Chấm ngay →
            </button>
          </div>
        </div>
      )}

      {/* Hackathon cards */}
      <div className="md-section-header">
        <div className="md-section-title">
          🏆 Cuộc thi được phân công
          {!loading && <span className="md-section-count">{enriched.length} bảng</span>}
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:'60px 0' }}><Spin size="large" /></div>}

      {!loading && enriched.length === 0 && (
        <div className="jd-empty">
          <div className="jd-empty-icon">⚖</div>
          <div className="jd-empty-title">Chưa được phân công bảng chấm nào</div>
          <div className="jd-empty-sub">Liên hệ Admin để được phân công</div>
        </div>
      )}

      <div className="jd-hack-cards">
        {enriched.map(a => {
          const sc = { ongoing:'green', upcoming:'blue', ended:'default' }[a.contestStatus] || 'default';
          return (
            <div key={a.key} className="jd-hack-card">
              <div className="jd-hack-header" style={{ background:`linear-gradient(135deg,${a.accentColor}08,transparent)` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div className="jd-hack-name">{a.contestName}</div>
                    <div className="jd-hack-date">{fmtDate(a.contestStart)} → {fmtDate(a.contestEnd)}</div>
                  </div>
                  <ProgressRing pct={a.pct} color={a.accentColor} size={52} />
                </div>
                <div className="jd-hack-meta" style={{ marginTop:8 }}>
                  <Tag color={sc} style={{ fontSize:'0.68rem' }}>
                    {{ ongoing:'Đang diễn ra', upcoming:'Sắp tới', ended:'Đã kết thúc' }[a.contestStatus]}
                  </Tag>
                  <span className="md-tag-cyan">⚖ {a.judgeType}</span>
                  {a.roundIsActive && <span className="md-tag-green">● {a.roundName} đang mở</span>}
                </div>
              </div>

              <div className="jd-hack-body">
                {[
                  { label:'Vòng chấm',   val: a.roundName },
                  { label:'Bảng',        val: a.poolName  },
                  { label:'Tổng đội',    val: `${a.teamCount} đội` },
                  { label:'Đã chấm',     val: `${a.reviewedCount}/${a.teamCount}` },
                ].map(r => (
                  <div key={r.label} className="jd-hack-row">
                    <span className="jd-hack-row-label">{r.label}</span>
                    <span className="jd-hack-row-val">{r.val}</span>
                  </div>
                ))}
              </div>

              <div className="jd-progress-row">
                <div className="jd-progress-label-row">
                  <span>Tiến độ chấm điểm</span>
                  <span style={{ color: a.accentColor, fontWeight:700 }}>{a.pct}%</span>
                </div>
                <Progress
                  percent={a.pct}
                  strokeColor={a.accentColor}
                  trailColor="rgba(255,255,255,0.06)"
                  showInfo={false}
                  size={[undefined, 5]}
                />
              </div>

              <div className="jd-hack-actions">
                <button
                  className="md-btn-primary"
                  style={{ flex:1 }}
                  onClick={() => navigate(`/judge/scoring/${a.contestId}/rounds/${a.roundId}/pools/${a.poolId}`)}
                  disabled={a.roundIsActive}
                >
                  {a.roundIsActive ? '🔒 Chờ vòng kết thúc' : '⚖ Chấm điểm'}
                </button>
                <Tooltip title="Xem tiêu chí chấm điểm">
                  <button className="md-btn-secondary" onClick={() => onNav('evaluation')}>
                    📋 Tiêu chí
                  </button>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ─── Teams Table (shared) ─────────────────────────────────────────────────────
function TeamsTable({ enriched, navigate, limit }) {
  const allTeams = enriched.flatMap(a =>
    a.teams.map(t => ({ ...t, poolName: a.poolName, roundName: a.roundName, contestName: a.contestName, contestId: a.contestId, roundId: a.roundId, poolId: a.poolId, accentColor: a.accentColor, roundIsActive: a.roundIsActive }))
  );
  const rows = limit ? allTeams.slice(0, limit) : allTeams;

  if (rows.length === 0) {
    return (
      <div className="jd-empty" style={{ marginBottom:24 }}>
        <div className="jd-empty-icon">👥</div>
        <div className="jd-empty-title">Không có đội nào trong bảng được phân công</div>
      </div>
    );
  }

  return (
    <div className="jd-review-table-wrap" style={{ marginBottom:0 }}>
      <table className="jd-review-table">
        <thead>
          <tr>
            <th>Tên đội</th>
            <th>Dự án</th>
            <th>Bảng / Vòng</th>
            <th>Trạng thái chấm</th>
            <th>Điểm</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const statusCls  = t.scoreStatus === 'submitted' ? 'completed' : t.scoreStatus === 'draft' ? 'reviewing' : 'pending';
            const statusText = { submitted:'✓ Đã chấm', draft:'● Đang chấm', none:'Chờ chấm' }[t.scoreStatus] || 'Chờ chấm';
            const canScore   = !t.roundIsActive;

            return (
              <tr key={t.id || i}>
                <td>
                  <div className="jd-team-name-cell">{t.name}</div>
                </td>
                <td><div className="jd-project-cell">{t.projectName || '—'}</div></td>
                <td>
                  <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.6)' }}>{t.poolName}</div>
                  <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.3)' }}>{t.roundName}</div>
                </td>
                <td><span className={`jd-review-status ${statusCls}`}>{statusText}</span></td>
                <td style={{ color: t.totalScore != null ? t.accentColor : 'rgba(255,255,255,0.25)', fontWeight:700 }}>
                  {t.totalScore != null ? t.totalScore.toFixed(1) : '—'}
                </td>
                <td>
                  <Tooltip title={!canScore ? 'Vòng thi đang mở — chưa thể chấm' : ''}>
                    <button
                      className={`jd-review-btn ${t.scoreStatus === 'submitted' ? 'done' : ''}`}
                      disabled={!canScore}
                      style={!canScore ? { opacity:0.35, cursor:'not-allowed' } : {}}
                      onClick={() => navigate(`/judge/scoring/${t.contestId}/rounds/${t.roundId}/pools/${t.poolId}`)}
                    >
                      {t.scoreStatus === 'submitted' ? '✓ Xem lại' : '⚖ Chấm điểm'}
                    </button>
                  </Tooltip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section: Competitions ────────────────────────────────────────────────────
function SectionCompetitions({ enriched, navigate }) {
  const byContest = {};
  enriched.forEach(a => {
    if (!byContest[a.contestId]) {
      byContest[a.contestId] = { id:a.contestId, name:a.contestName, status:a.contestStatus, start:a.contestStart, end:a.contestEnd, rounds:a.rounds, accentColor:a.accentColor, pools:[] };
    }
    byContest[a.contestId].pools.push(a);
  });

  if (Object.keys(byContest).length === 0) {
    return <div className="jd-empty"><div className="jd-empty-icon">🏆</div><div className="jd-empty-title">Chưa có cuộc thi nào</div></div>;
  }

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">🏆 Cuộc thi của tôi <span className="md-section-count">{Object.keys(byContest).length}</span></div>
      </div>
      <div className="jd-comp-cards">
        {Object.values(byContest).map(c => {
          const sc = { ongoing:'green', upcoming:'blue', ended:'default' }[c.status] || 'default';
          return (
            <div key={c.id} className="jd-comp-card">
              <div style={{ padding:'16px 20px', background:`linear-gradient(135deg,${c.accentColor}08,transparent)`, borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:'1rem', color:'#fff', marginBottom:4 }}>{c.name}</div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)' }}>{fmtDate(c.start)} → {fmtDate(c.end)}</div>
                </div>
                <Tag color={sc} style={{ fontSize:'0.7rem' }}>{{ ongoing:'Đang diễn ra', upcoming:'Sắp tới', ended:'Kết thúc' }[c.status]}</Tag>
              </div>

              {c.pools.map((pool, pi) => (
                <div key={pool.key} className="jd-round-row" style={{ borderTop: pi > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="jd-round-seq">{pi+1}.</div>
                  <div className="jd-round-info">
                    <div className="jd-round-name">{pool.roundName}</div>
                    <div className="jd-round-meta">Bảng: {pool.poolName} · {pool.teamCount} đội · Đã chấm: {pool.reviewedCount}/{pool.teamCount}</div>
                  </div>
                  <ProgressRing pct={pool.pct} color={pool.accentColor} size={44} />
                  <span className="jd-round-status" style={{ color: pool.roundIsActive ? '#10b981' : '#6b7280' }}>
                    {pool.roundIsActive ? '▶ Mở' : '■ Đóng'}
                  </span>
                  <button
                    className="jd-round-btn"
                    style={{ border:`1px solid ${pool.roundIsActive ? 'rgba(255,255,255,0.1)' : 'rgba(0,212,255,0.3)'}`, background: pool.roundIsActive ? 'transparent' : 'rgba(0,212,255,0.08)', color: pool.roundIsActive ? 'rgba(255,255,255,0.25)' : '#00d4ff', opacity: pool.roundIsActive ? 0.5 : 1, cursor: pool.roundIsActive ? 'not-allowed' : 'pointer' }}
                    disabled={pool.roundIsActive}
                    onClick={() => navigate(`/judge/scoring/${pool.contestId}/rounds/${pool.roundId}/pools/${pool.poolId}`)}
                  >
                    {pool.roundIsActive ? '🔒' : '⚖ Chấm'}
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section: Evaluation ─────────────────────────────────────────────────────
function SectionEvaluation({ enriched, navigate }) {
  const [selected, setSelected] = useState(enriched[0] || null);

  const pending   = enriched.filter(a => a.pct < 100 && !a.roundIsActive);
  const completed = enriched.filter(a => a.pct === 100);
  const waiting   = enriched.filter(a => a.roundIsActive);

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">📝 Đánh giá</div>
      </div>

      {/* Summary cards */}
      <div className="jd-analytics-grid">
        {[
          { label:'Cần chấm',    value: pending.length,   color:'#f59e0b' },
          { label:'Hoàn thành',  value: completed.length, color:'#10b981' },
          { label:'Chờ kết thúc vòng', value: waiting.length, color:'rgba(255,255,255,0.3)' },
          { label:'Tổng bảng',   value: enriched.length,  color:'#00d4ff' },
        ].map((c, i) => (
          <div key={i} className="jd-analytics-card">
            <div className="jd-analytics-big" style={{ color: c.color }}>{c.value}</div>
            <div className="jd-analytics-lbl">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Per-pool scoring overview */}
      <div className="md-section-header" style={{ marginTop:8 }}>
        <div className="md-section-title" style={{ fontSize:'0.88rem' }}>Bảng phân công của tôi</div>
      </div>

      {enriched.length === 0 ? (
        <div className="jd-empty"><div className="jd-empty-icon">📝</div><div className="jd-empty-title">Chưa có bảng chấm nào</div></div>
      ) : (
        <div className="jd-review-table-wrap">
          <table className="jd-review-table">
            <thead>
              <tr>
                <th>Cuộc thi / Vòng</th>
                <th>Bảng</th>
                <th>Tiến độ</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map(a => (
                <tr key={a.key}>
                  <td>
                    <div style={{ fontWeight:700, color:'#fff', fontSize:'0.85rem' }}>{a.contestName}</div>
                    <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.4)' }}>{a.roundName}</div>
                  </td>
                  <td style={{ color:'rgba(255,255,255,0.7)' }}>{a.poolName}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <ProgressRing pct={a.pct} color={a.accentColor} size={40} />
                      <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)' }}>
                        {a.reviewedCount}/{a.teamCount} đội
                      </span>
                    </div>
                  </td>
                  <td>
                    {a.roundIsActive
                      ? <span className="jd-review-status pending">⏳ Chờ vòng đóng</span>
                      : a.pct === 100
                      ? <span className="jd-review-status completed">✓ Hoàn thành</span>
                      : <span className="jd-review-status reviewing">● Đang chấm</span>
                    }
                  </td>
                  <td>
                    {!a.roundIsActive ? (
                      <button
                        className="jd-review-btn"
                        onClick={() => navigate(`/judge/scoring/${a.contestId}/rounds/${a.roundId}/pools/${a.poolId}`)}
                      >
                        {a.pct === 100 ? '✓ Xem lại' : '⚖ Chấm điểm'}
                      </button>
                    ) : (
                      <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.2)' }}>Chưa mở</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Score criteria preview for first assignment */}
      {enriched.length > 0 && enriched[0].scoreCriteria?.length > 0 && (
        <>
          <div className="md-section-header" style={{ marginTop:24 }}>
            <div className="md-section-title" style={{ fontSize:'0.88rem' }}>📋 Tiêu chí chấm điểm — {enriched[0].contestName}</div>
          </div>
          <div className="jd-criteria-list">
            {enriched[0].scoreCriteria.map((c, i) => (
              <div key={i} className="jd-criteria-row">
                <div className="jd-criteria-label">{c.name || c.criteria_name || `Tiêu chí ${i+1}`}</div>
                <span className="jd-criteria-weight">{c.weight || c.percentage || 0}%</span>
                <div className="jd-criteria-score">
                  <span className="jd-criteria-max">/ {c.max_score || 10}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Section: Teams ───────────────────────────────────────────────────────────
function SectionTeams({ enriched, navigate }) {
  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">
          👥 Đội cần chấm điểm
          <span className="md-section-count">{enriched.reduce((s, a) => s + a.teamCount, 0)} đội</span>
        </div>
      </div>
      <TeamsTable enriched={enriched} navigate={navigate} />
    </div>
  );
}

// ─── Section: Results ─────────────────────────────────────────────────────────
function SectionResults({ enriched }) {
  // Collect submitted scores sorted by total_score desc
  const allScored = enriched.flatMap(a =>
    a.teams
      .filter(t => t.scoreStatus === 'submitted' && t.totalScore != null)
      .map(t => ({ ...t, contestName: a.contestName, poolName: a.poolName, accentColor: a.accentColor }))
  ).sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

  const pendingCount = enriched.flatMap(a => a.teams).filter(t => t.scoreStatus !== 'submitted').length;

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">📊 Kết quả & Xếp hạng</div>
        {pendingCount > 0 && (
          <span className="md-tag-amber">{pendingCount} đội chờ chấm</span>
        )}
      </div>

      {pendingCount > 0 && (
        <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', marginBottom:20, fontSize:'0.82rem', color:'rgba(255,255,255,0.55)' }}>
          ⏳ Kết quả đầy đủ sẽ hiển thị sau khi tất cả đội được chấm điểm. Hiện tại có {pendingCount} đội chờ.
        </div>
      )}

      {allScored.length === 0 ? (
        <div className="jd-empty">
          <div className="jd-empty-icon">📊</div>
          <div className="jd-empty-title">Chưa có điểm nào được nộp</div>
          <div className="jd-empty-sub">Kết quả sẽ xuất hiện sau khi bạn hoàn thành chấm điểm</div>
        </div>
      ) : (
        <div className="jd-rank-table-wrap">
          <table className="jd-rank-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên đội</th>
                <th>Dự án</th>
                <th>Bảng</th>
                <th>Điểm (của tôi)</th>
              </tr>
            </thead>
            <tbody>
              {allScored.map((t, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <tr key={t.id || i}>
                    <td>
                      {i < 3
                        ? <span className="jd-rank-medal">{medals[i]}</span>
                        : <span style={{ color:'rgba(255,255,255,0.3)', fontWeight:700 }}>{i+1}</span>}
                    </td>
                    <td style={{ fontWeight:700, color:'#fff' }}>{t.name}</td>
                    <td style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.75rem' }}>{t.projectName || '—'}</td>
                    <td style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.75rem' }}>{t.poolName}</td>
                    <td style={{ fontWeight:800, color: t.accentColor, fontSize:'1rem' }}>
                      {t.totalScore?.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Section: Schedule ────────────────────────────────────────────────────────
function SectionSchedule({ enriched }) {
  const events = enriched.flatMap(a =>
    a.rounds.map((r, ri) => {
      const dateStr = r.start_date || r.end_date;
      const isAssigned = r._id?.toString() === a.roundId;
      return {
        id: `${a.contestId}-${r._id}`,
        title: `${r.name}${isAssigned ? ' (Được phân công)' : ''}`,
        contest: a.contestName,
        date: dateStr ? fmtDate(dateStr) : null,
        rawDate: dateStr,
        type: r.is_active ? 'current' : (dateStr && new Date(dateStr) > new Date() ? 'future' : 'past'),
      };
    }).filter(e => e.date)
  ).sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

  const uniqueEvents = Array.from(new Map(events.map(e => [e.id, e])).values());

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">📅 Lịch trình vòng thi</div>
        <span className="md-section-count">{uniqueEvents.length} sự kiện</span>
      </div>

      {uniqueEvents.length === 0 ? (
        <div className="jd-empty">
          <div className="jd-empty-icon">📅</div>
          <div className="jd-empty-title">Không có dữ liệu lịch trình</div>
          <div className="jd-empty-sub">Các vòng thi chưa được đặt ngày</div>
        </div>
      ) : (
        <div style={{ maxWidth:600 }}>
          <div className="jd-timeline">
            {uniqueEvents.map((ev, i) => (
              <div key={ev.id} className="jd-timeline-item">
                <div className="jd-tl-connector">
                  <div className={`jd-tl-dot ${ev.type}`} />
                  {i < uniqueEvents.length - 1 && <div className="jd-tl-line" />}
                </div>
                <div className="jd-tl-content">
                  <div className="jd-tl-date">{ev.date}</div>
                  <div className="jd-tl-title">{ev.title}</div>
                  <div className="jd-tl-desc">{ev.contest}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: AI Assistant ────────────────────────────────────────────────────
function SectionAI() {
  const [chatInput, setChatInput] = useState('');
  const [chatMsgs, setChatMsgs] = useState([
    { id:1, role:'ai', text:'Xin chào! Tôi là AI Assistant của SEAL. Tôi có thể giúp bạn tóm tắt bài nộp, tạo câu hỏi phỏng vấn, hoặc kiểm tra thiên vị trong chấm điểm.' },
  ]);
  const endRef = useRef(null);

  const AI_FEATURES = [
    { icon:'📄', title:'AI Review Summary', desc:'Phân tích proposal, slide, GitHub và đưa ra điểm mạnh/yếu/rủi ro của dự án.' },
    { icon:'❓', title:'AI Question Generator', desc:'Tạo câu hỏi phỏng vấn thông minh dựa trên nội dung dự án để kiểm tra chiều sâu.' },
    { icon:'⚖',  title:'AI Bias Checker', desc:'So sánh điểm của bạn với giám khảo khác, cảnh báo nếu có độ lệch bất thường.' },
    { icon:'💡', title:'AI Score Recommendation', desc:'Gợi ý khoảng điểm phù hợp dựa trên phân tích tiêu chí và nội dung bài nộp.' },
  ];

  const sendMsg = () => {
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now(), role:'user', text: chatInput };
    const aiReply = { id: Date.now() + 1, role:'ai', text: 'Tính năng AI đang được phát triển. Vui lòng thử lại sau! 🚀' };
    setChatMsgs(prev => [...prev, userMsg, aiReply]);
    setChatInput('');
    setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
  };

  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">🤖 AI Assistant</div>
        <span className="md-tag-amber">Beta</span>
      </div>

      <div className="jd-ai-grid">
        {AI_FEATURES.map((f, i) => (
          <div key={i} className="jd-ai-feature-card" onClick={() => message.info('Tính năng AI đang phát triển')}>
            <div className="jd-ai-card-icon">{f.icon}</div>
            <div className="jd-ai-card-title">{f.title}</div>
            <div className="jd-ai-card-desc">{f.desc}</div>
            <div className="jd-ai-card-action">Sử dụng →</div>
          </div>
        ))}
      </div>

      <div className="jd-ai-chat-area">
        <div className="jd-ai-chat-header">
          <div style={{ width:32, height:32, borderRadius:10, background:'rgba(168,85,247,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>🤖</div>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.85rem', color:'#a855f7' }}>SEAL AI Assistant</div>
            <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.35)' }}>Powered by GPT-4o</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981' }} />
            <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.35)' }}>Online</span>
          </div>
        </div>
        <div className="jd-ai-msgs md-scroll-fade" style={{ maxHeight:220, overflowY:'auto' }}>
          {chatMsgs.map(m => (
            <div key={m.id} className={`jd-ai-msg ${m.role}`}>{m.text}</div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="md-chat-input-bar">
          <input
            className="md-chat-input"
            placeholder="Hỏi AI về dự án, tiêu chí chấm điểm..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
          />
          <button className="md-chat-send-btn" onClick={sendMsg}>➤</button>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Profile ─────────────────────────────────────────────────────────
function SectionProfile({ user }) {
  return (
    <div>
      <div className="md-section-header">
        <div className="md-section-title">👤 Hồ sơ</div>
      </div>
      <div style={{ maxWidth:520 }}>
        <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:24, display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(0,212,255,0.2))', border:'2px solid rgba(245,158,11,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'1.3rem', color:'#f59e0b' }}>
              {initials(user?.full_name || 'J')}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:'1rem', color:'#fff' }}>{user?.full_name}</div>
              <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginBottom:4 }}>{user?.email}</div>
              <span className="jd-judge-badge">⚖ Giám khảo</span>
            </div>
          </div>
          <div className="md-divider" />
          {[
            { label:'Họ và tên', val: user?.full_name || '—' },
            { label:'Email',     val: user?.email || '—' },
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

// ─── AI FAB Panel ─────────────────────────────────────────────────────────────
function AiFab({ onClose }) {
  const [q, setQ] = useState('');
  return (
    <div className="md-ai-panel">
      <div className="md-ai-header">
        <div className="md-ai-dot" />
        <div className="md-ai-title">SEAL AI Assistant</div>
        <div className="md-ai-sub">Judge Mode</div>
        <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'1rem' }}>✕</button>
      </div>
      <div className="md-ai-suggestions">
        <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)', marginBottom:2 }}>Gợi ý</div>
        {[
          { icon:'📄', text:'Tóm tắt bài nộp của đội này' },
          { icon:'❓', text:'Tạo câu hỏi phỏng vấn' },
          { icon:'⚖', text:'Kiểm tra thiên vị điểm số' },
          { icon:'💡', text:'Gợi ý điểm cho tiêu chí' },
        ].map((s, i) => (
          <div key={i} className="md-ai-chip" onClick={() => setQ(s.text)}>
            <span className="md-ai-chip-icon">{s.icon}</span>
            {s.text}
          </div>
        ))}
      </div>
      <div className="md-ai-input-row">
        <input className="md-ai-input" placeholder="Hỏi AI..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && message.info('Tính năng AI đang phát triển')} />
        <button className="md-ai-send" onClick={() => message.info('Tính năng AI đang phát triển')}>Gửi</button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const VIEW_LABELS = {
  dashboard:'Tổng quan', competitions:'Cuộc thi của tôi',
  evaluation:'Đánh giá', teams:'Đội cần chấm',
  results:'Kết quả', schedule:'Lịch trình',
  ai:'AI Assistant', profile:'Hồ sơ',
};

export default function JudgeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading]       = useState(true);
  const [enriched, setEnriched]     = useState([]);
  const [showAi, setShowAi]         = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const assignRes = await request('/api/judge-assignments/me');
      const raw = (Array.isArray(assignRes) ? assignRes : (assignRes?.data ?? []))
        .filter(a => a.invitation_status !== 'pending_invite');

      // Collect unique ended rounds for score fetch
      const endedKeys = [...new Set(
        raw
          .filter(a => {
            const contest = a.contest_id || {};
            const round = (contest.rounds || []).find(r => r._id?.toString() === a.round_id?.toString());
            return round && !round.is_active;
          })
          .map(a => {
            const cid = (a.contest_id?._id || a.contest_id)?.toString();
            const rid = a.round_id?.toString();
            return `${cid}___${rid}`;
          })
      )];

      // Fetch my scores for ended rounds
      const scoreMap = {};
      if (endedKeys.length > 0) {
        const results = await Promise.allSettled(
          endedKeys.map(async key => {
            const [cid, rid] = key.split('___');
            const res = await request(`/api/scores/contests/${cid}/rounds/${rid}/my-scores`);
            return { key, data: Array.isArray(res) ? res : (res?.data ?? []) };
          })
        );
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value) scoreMap[r.value.key] = r.value.data;
        });
      }

      setEnriched(raw.map((a, idx) => enrichJudgeAssignment(a, idx, scoreMap)));
    } catch {
      messageApi.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingCount = enriched.reduce((s, a) => s + (a.teamCount - a.reviewedCount), 0);
  const userInitials = initials(user?.full_name || 'J');

  const renderSection = () => {
    if (loading && activeView === 'dashboard') {
      return <div style={{ textAlign:'center', padding:'80px 0' }}><Spin size="large" /></div>;
    }
    switch (activeView) {
      case 'dashboard':    return <SectionDashboard    enriched={enriched} loading={loading} navigate={navigate} onNav={setActiveView} />;
      case 'competitions': return <SectionCompetitions enriched={enriched} navigate={navigate} />;
      case 'evaluation':   return <SectionEvaluation   enriched={enriched} navigate={navigate} />;
      case 'teams':        return <SectionTeams        enriched={enriched} navigate={navigate} />;
      case 'results':      return <SectionResults      enriched={enriched} />;
      case 'schedule':     return <SectionSchedule     enriched={enriched} />;
      case 'ai':           return <SectionAI />;
      case 'profile':      return <SectionProfile      user={user} />;
      default: return null;
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
          <span className="md-brand-sub">Judge Portal</span>
        </div>
        <div style={{ flex:1, padding:'0 20px', display:'flex', alignItems:'center' }}>
          <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.25)' }}>
            Dashboard / <span style={{ color:'rgba(255,255,255,0.6)' }}>{VIEW_LABELS[activeView]}</span>
          </span>
        </div>
        <div className="md-topbar-right">
          <Tooltip title="AI Assistant">
            <button
              className="md-notif-btn"
              onClick={() => setShowAi(v => !v)}
              style={{ fontSize:'1rem', color: showAi ? '#a855f7' : undefined, borderColor: showAi ? 'rgba(168,85,247,0.4)' : undefined }}
            >
              🤖
            </button>
          </Tooltip>
          <div className="md-notif-btn">🔔<div className="md-notif-dot" /></div>
          <div className="md-profile-chip">
            <div className="md-avatar" style={{ background:'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(0,212,255,0.2))', borderColor:'rgba(245,158,11,0.4)', color:'#f59e0b' }}>
              {userInitials}
            </div>
            <div>
              <div className="md-profile-name">{user?.full_name || 'Judge'}</div>
              <span className="jd-judge-badge">⚖ Giám khảo</span>
            </div>
          </div>
          <button className="md-logout-btn" onClick={logout}>Đăng xuất</button>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar active={activeView} onChange={setActiveView} pendingCount={pendingCount} />

      {/* Main */}
      <main className="md-main">
        {activeView === 'dashboard' && (
          <div className="md-hero">
            <h1 className="md-hero-greeting">
              Xin chào, <span>{user?.full_name?.split(' ').pop() || 'Giám khảo'}</span> 👋
            </h1>
            <p className="md-hero-sub">
              Theo dõi tiến độ chấm điểm và các vòng thi được phân công.
            </p>
          </div>
        )}
        {renderSection()}
      </main>

      {/* AI panel */}
      {showAi && <AiFab onClose={() => setShowAi(false)} />}

      {/* AI FAB */}
      <button className="md-ai-fab" onClick={() => setShowAi(v => !v)} title="AI Assistant" style={{ background:'linear-gradient(135deg,#f59e0b,#a855f7)' }}>
        ✨
      </button>
    </div>
  );
}
