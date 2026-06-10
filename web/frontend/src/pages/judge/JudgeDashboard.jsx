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
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name[0].toUpperCase();
}

const ACCENT_COLORS = ['#00d4ff', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
const statusMap = { open: 'ongoing', draft: 'upcoming', closed: 'ended' };

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
      scoreStatus: score ? score.status : 'none',
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

function ProgressRing({ pct, color = '#00d4ff', size = 56 }) {
  const r   = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={5} stroke="rgba(255,255,255,0.06)" fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r} strokeWidth={5}
          stroke={color} fill="none"
          strokeDasharray={circ}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="text-[0.7rem] font-bold" style={{ color }}>{pct}%</div>
    </div>
  );
}

const NAV_GROUPS = [
  { items: [{ id: 'dashboard',  icon: '⊞', label: 'Tổng quan' }]},
  { items: [
    { id: 'teams',      icon: '👥', label: 'Đội cần chấm' },
    { id: 'results',    icon: '📊', label: 'Kết quả' },
  ]},
  { items: [{ id: 'schedule', icon: '📅', label: 'Lịch trình' }]},
  { items: [{ id: 'ai', icon: '🤖', label: 'AI Assistant' }]},
  { items: [{ id: 'profile', icon: '👤', label: 'Hồ sơ' }]},
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
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-150 mb-0.5
                ${active === item.id
                  ? 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff]'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/70'}`}
              onClick={() => onChange(item.id)}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

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
    { label: 'Cuộc thi tham gia', value: totalContests, color: '#00d4ff', icon: '🏆', bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.2)' },
    { label: 'Vòng đang mở',      value: activeRounds,  color: '#10b981', icon: '▶',  bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
    { label: 'Đội đã chấm',       value: reviewedTeams, color: '#a855f7', icon: '✓',  bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
    { label: 'Chờ chấm điểm',     value: pendingTeams,  color: pendingTeams > 0 ? '#f59e0b' : '#6b7280', icon: '⏳', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
    { label: 'Tỉ lệ hoàn thành',  value: `${completionPct}%`, color: '#3b82f6', icon: '📈', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
  ];

  return (
    <div>
      <div className="grid grid-cols-5 gap-3.5 mb-7">
        {STATS.map((s, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/7 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              {s.icon}
            </div>
            <div className="text-[1.6rem] font-bold leading-none" style={{ color: s.color }}>
              {loading ? <Spin size="small" /> : s.value}
            </div>
            <div className="text-[0.72rem] text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {!loading && urgentTeamsLeft > 0 && (
        <div className="relative flex items-center justify-between flex-wrap gap-4 p-5 mb-6 bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.25)] rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(245,158,11,0.04)] to-transparent pointer-events-none" />
          <div className="flex items-start gap-4 z-10">
            <div className="w-10 h-10 rounded-xl bg-[rgba(245,158,11,0.15)] flex items-center justify-center text-xl flex-shrink-0">⚠</div>
            <div>
              <div className="font-bold text-[0.9rem] text-white mb-1">Cần hoàn thành chấm điểm</div>
              <div className="text-[0.78rem] text-white/50">{urgentItems.length} bảng chưa chấm xong — vòng đã kết thúc</div>
              <div className="text-[0.72rem] text-[#f59e0b] mt-1">📅 Hãy hoàn thành sớm để có kết quả chính xác</div>
            </div>
          </div>
          <div className="flex items-center gap-4 z-10">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#f59e0b]">{urgentTeamsLeft}</div>
              <div className="text-[0.68rem] text-white/35">đội còn lại</div>
            </div>
            <button
              className="px-4 py-2 bg-[#f59e0b] text-black font-bold text-sm rounded-lg cursor-pointer hover:bg-[#fbbf24] transition-colors border-none"
              onClick={() => onNav('teams')}
            >
              Chấm ngay →
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide flex items-center gap-2">
          🏆 Cuộc thi được phân công
          {!loading && <span className="bg-white/8 text-white/50 text-xs px-2 py-0.5 rounded-full">{enriched.length} bảng</span>}
        </div>
      </div>

      {loading && <div className="text-center py-16"><Spin size="large" /></div>}

      {!loading && enriched.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">⚖</div>
          <div className="text-white/60 font-semibold mb-1">Chưa được phân công bảng chấm nào</div>
          <div className="text-white/30 text-sm">Liên hệ Admin để được phân công</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enriched.map(a => {
          const sc = { ongoing:'green', upcoming:'blue', ended:'default' }[a.contestStatus] || 'default';
          return (
            <div key={a.key} className="bg-white/[0.025] border border-white/7 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 pb-3" style={{ background: `linear-gradient(135deg,${a.accentColor}08,transparent)` }}>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-[0.95rem] truncate mb-1">{a.contestName}</div>
                    <div className="text-[0.72rem] text-white/35">{fmtDate(a.contestStart)} → {fmtDate(a.contestEnd)}</div>
                  </div>
                  <ProgressRing pct={a.pct} color={a.accentColor} size={52} />
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <Tag color={sc} style={{ fontSize:'0.68rem' }}>
                    {{ ongoing:'Đang diễn ra', upcoming:'Sắp tới', ended:'Đã kết thúc' }[a.contestStatus]}
                  </Tag>
                  <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-[rgba(0,212,255,0.1)] text-[#00d4ff]">⚖ {a.judgeType}</span>
                  {a.roundIsActive && <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981]">● {a.roundName} đang mở</span>}
                </div>
              </div>

              <div className="px-4 py-3 flex flex-col gap-1.5 border-t border-white/5">
                {[
                  { label:'Vòng chấm', val: a.roundName },
                  { label:'Bảng',      val: a.poolName  },
                  { label:'Tổng đội',  val: `${a.teamCount} đội` },
                  { label:'Đã chấm',   val: `${a.reviewedCount}/${a.teamCount}` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-[0.78rem]">
                    <span className="text-white/35">{r.label}</span>
                    <span className="text-white/70 font-medium">{r.val}</span>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-white/5">
                <div className="flex justify-between text-[0.72rem] mb-1.5">
                  <span className="text-white/40">Tiến độ chấm điểm</span>
                  <span className="font-bold" style={{ color: a.accentColor }}>{a.pct}%</span>
                </div>
                <Progress
                  percent={a.pct}
                  strokeColor={a.accentColor}
                  trailColor="rgba(255,255,255,0.06)"
                  showInfo={false}
                  size={[undefined, 5]}
                />
              </div>

              <div className="p-3 border-t border-white/5">
                <button
                  className="w-full py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all border-none"
                  style={{
                    background: a.roundIsActive ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${a.accentColor},rgba(168,85,247,0.8))`,
                    color: a.roundIsActive ? 'rgba(255,255,255,0.3)' : '#000',
                    cursor: a.roundIsActive ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => !a.roundIsActive && navigate(`/judge/scoring/${a.contestId}/rounds/${a.roundId}/pools/${a.poolId}`)}
                  disabled={a.roundIsActive}
                >
                  {a.roundIsActive ? '🔒 Chờ vòng kết thúc' : '⚖ Chấm điểm'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamsTable({ enriched, navigate, limit }) {
  const allTeams = enriched.flatMap(a =>
    a.teams.map(t => ({ ...t, poolName: a.poolName, roundName: a.roundName, contestName: a.contestName, contestId: a.contestId, roundId: a.roundId, poolId: a.poolId, accentColor: a.accentColor, roundIsActive: a.roundIsActive }))
  );
  const rows = limit ? allTeams.slice(0, limit) : allTeams;

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 mb-6">
        <div className="text-3xl mb-2">👥</div>
        <div className="text-white/50 text-sm">Không có đội nào trong bảng được phân công</div>
      </div>
    );
  }

  const statusColors = { submitted: 'text-[#10b981] bg-[rgba(16,185,129,0.1)]', draft: 'text-[#f59e0b] bg-[rgba(245,158,11,0.1)]', none: 'text-white/40 bg-white/5' };

  return (
    <div className="overflow-x-auto rounded-xl border border-white/7 mb-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/7">
            {['Tên đội','Dự án','Bảng / Vòng','Trạng thái chấm','Điểm','Hành động'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[0.72rem] text-white/35 font-semibold uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const sc = statusColors[t.scoreStatus] || statusColors.none;
            const statusText = { submitted:'✓ Đã chấm', draft:'● Đang chấm', none:'Chờ chấm' }[t.scoreStatus] || 'Chờ chấm';
            const canScore = !t.roundIsActive;
            return (
              <tr key={t.id || i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-semibold text-white">{t.name}</td>
                <td className="px-4 py-3 text-white/40 text-[0.75rem]">{t.projectName || '—'}</td>
                <td className="px-4 py-3">
                  <div className="text-[0.75rem] text-white/60">{t.poolName}</div>
                  <div className="text-[0.68rem] text-white/30">{t.roundName}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[0.72rem] font-medium ${sc}`}>{statusText}</span>
                </td>
                <td className="px-4 py-3 font-bold" style={{ color: t.totalScore != null ? t.accentColor : 'rgba(255,255,255,0.25)' }}>
                  {t.totalScore != null ? t.totalScore.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3">
                  <Tooltip title={!canScore ? 'Vòng thi đang mở — chưa thể chấm' : ''}>
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${t.scoreStatus === 'submitted' ? 'border-[rgba(16,185,129,0.3)] text-[#10b981] bg-[rgba(16,185,129,0.08)]' : 'border-[rgba(0,212,255,0.3)] text-[#00d4ff] bg-[rgba(0,212,255,0.08)] hover:bg-[rgba(0,212,255,0.15)]'}`}
                      disabled={!canScore}
                      style={!canScore ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
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

function SectionCompetitions({ enriched, navigate }) {
  const byContest = {};
  enriched.forEach(a => {
    if (!byContest[a.contestId]) {
      byContest[a.contestId] = { id:a.contestId, name:a.contestName, status:a.contestStatus, start:a.contestStart, end:a.contestEnd, rounds:a.rounds, accentColor:a.accentColor, pools:[] };
    }
    byContest[a.contestId].pools.push(a);
  });

  if (Object.keys(byContest).length === 0) {
    return <div className="text-center py-16"><div className="text-4xl mb-2">🏆</div><div className="text-white/50">Chưa có cuộc thi nào</div></div>;
  }

  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        🏆 Cuộc thi của tôi <span className="bg-white/8 text-white/50 text-xs px-2 py-0.5 rounded-full">{Object.keys(byContest).length}</span>
      </div>
      <div className="flex flex-col gap-4">
        {Object.values(byContest).map(c => {
          const sc = { ongoing:'green', upcoming:'blue', ended:'default' }[c.status] || 'default';
          return (
            <div key={c.id} className="bg-white/[0.025] border border-white/7 rounded-2xl overflow-hidden">
              <div className="flex justify-between items-start px-5 py-4" style={{ background: `linear-gradient(135deg,${c.accentColor}08,transparent)`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="font-bold text-white text-[1rem] mb-1">{c.name}</div>
                  <div className="text-[0.72rem] text-white/35">{fmtDate(c.start)} → {fmtDate(c.end)}</div>
                </div>
                <Tag color={sc} style={{ fontSize:'0.7rem' }}>{{ ongoing:'Đang diễn ra', upcoming:'Sắp tới', ended:'Kết thúc' }[c.status]}</Tag>
              </div>
              {c.pools.map((pool, pi) => (
                <div key={pool.key} className="flex items-center gap-3 px-5 py-3" style={{ borderTop: pi > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="text-white/25 text-sm w-5 flex-shrink-0">{pi+1}.</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white/80 text-[0.85rem]">{pool.roundName}</div>
                    <div className="text-[0.7rem] text-white/35">Bảng: {pool.poolName} · {pool.teamCount} đội · Đã chấm: {pool.reviewedCount}/{pool.teamCount}</div>
                  </div>
                  <ProgressRing pct={pool.pct} color={pool.accentColor} size={44} />
                  <span className="text-[0.72rem] font-semibold" style={{ color: pool.roundIsActive ? '#10b981' : '#6b7280' }}>
                    {pool.roundIsActive ? '▶ Mở' : '■ Đóng'}
                  </span>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all"
                    style={{
                      border: `1px solid ${pool.roundIsActive ? 'rgba(255,255,255,0.1)' : 'rgba(0,212,255,0.3)'}`,
                      background: pool.roundIsActive ? 'transparent' : 'rgba(0,212,255,0.08)',
                      color: pool.roundIsActive ? 'rgba(255,255,255,0.25)' : '#00d4ff',
                      opacity: pool.roundIsActive ? 0.5 : 1,
                      cursor: pool.roundIsActive ? 'not-allowed' : 'pointer',
                    }}
                    disabled={pool.roundIsActive}
                    onClick={() => !pool.roundIsActive && navigate(`/judge/scoring/${pool.contestId}/rounds/${pool.roundId}/pools/${pool.poolId}`)}
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

function SectionTeams({ enriched, navigate }) {
  const totalTeams = enriched.reduce((s, a) => s + a.teamCount, 0);
  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        👥 Đội cần chấm điểm <span className="bg-white/8 text-white/50 text-xs px-2 py-0.5 rounded-full">{totalTeams} đội</span>
      </div>
      <TeamsTable enriched={enriched} navigate={navigate} />
    </div>
  );
}

function SectionResults({ enriched }) {
  const allScored = enriched.flatMap(a =>
    a.teams
      .filter(t => t.scoreStatus === 'submitted' && t.totalScore != null)
      .map(t => ({ ...t, contestName: a.contestName, poolName: a.poolName, accentColor: a.accentColor }))
  ).sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

  const pendingCount = enriched.flatMap(a => a.teams).filter(t => t.scoreStatus !== 'submitted').length;

  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        📊 Kết quả & Xếp hạng
        {pendingCount > 0 && <span className="bg-[rgba(245,158,11,0.1)] text-[#f59e0b] text-xs px-2 py-0.5 rounded-full">{pendingCount} đội chờ chấm</span>}
      </div>
      {pendingCount > 0 && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)] mb-5 text-[0.82rem] text-white/55">
          ⏳ Kết quả đầy đủ sẽ hiển thị sau khi tất cả đội được chấm điểm. Hiện tại có {pendingCount} đội chờ.
        </div>
      )}
      {allScored.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-white/50 font-semibold mb-1">Chưa có điểm nào được nộp</div>
          <div className="text-white/30 text-sm">Kết quả sẽ xuất hiện sau khi bạn hoàn thành chấm điểm</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/7">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/7">
                {['#','Tên đội','Dự án','Bảng','Điểm (của tôi)'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.72rem] text-white/35 font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allScored.map((t, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <tr key={t.id || i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      {i < 3 ? <span className="text-lg">{medals[i]}</span> : <span className="text-white/30 font-bold">{i+1}</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{t.name}</td>
                    <td className="px-4 py-3 text-white/40 text-[0.75rem]">{t.projectName || '—'}</td>
                    <td className="px-4 py-3 text-white/50 text-[0.75rem]">{t.poolName}</td>
                    <td className="px-4 py-3 font-extrabold text-[1rem]" style={{ color: t.accentColor }}>
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
  const dotColor = { current: '#10b981', future: '#00d4ff', past: '#6b7280' };

  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        📅 Lịch trình vòng thi <span className="bg-white/8 text-white/50 text-xs px-2 py-0.5 rounded-full">{uniqueEvents.length} sự kiện</span>
      </div>
      {uniqueEvents.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-2">📅</div>
          <div className="text-white/50">Không có dữ liệu lịch trình</div>
        </div>
      ) : (
        <div className="max-w-[600px] flex flex-col gap-0">
          {uniqueEvents.map((ev, i) => (
            <div key={ev.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: dotColor[ev.type] || '#6b7280' }} />
                {i < uniqueEvents.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" />}
              </div>
              <div className="pb-6">
                <div className="text-[0.68rem] text-white/35 mb-0.5">{ev.date}</div>
                <div className="text-[0.85rem] font-semibold text-white">{ev.title}</div>
                <div className="text-[0.72rem] text-white/40">{ev.contest}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionAI() {
  const [chatInput, setChatInput] = useState('');
  const [chatMsgs, setChatMsgs] = useState([
    { id:1, role:'ai', text:'Xin chào! Tôi là AI Assistant của SEAL. Tôi có thể giúp bạn tóm tắt bài nộp, tạo câu hỏi phỏng vấn, hoặc kiểm tra thiên vị trong chấm điểm.' },
  ]);
  const endRef = useRef(null);

  const AI_FEATURES = [
    { icon:'📄', title:'AI Review Summary', desc:'Phân tích proposal, slide, GitHub và đưa ra điểm mạnh/yếu/rủi ro của dự án.' },
    { icon:'❓', title:'AI Question Generator', desc:'Tạo câu hỏi phỏng vấn thông minh dựa trên nội dung dự án để kiểm tra chiều sâu.' },
    { icon:'⚖', title:'AI Bias Checker', desc:'So sánh điểm của bạn với giám khảo khác, cảnh báo nếu có độ lệch bất thường.' },
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
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
        🤖 AI Assistant <span className="bg-[rgba(245,158,11,0.1)] text-[#f59e0b] text-xs px-2 py-0.5 rounded-full">Beta</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {AI_FEATURES.map((f, i) => (
          <div
            key={i}
            className="bg-white/[0.025] border border-white/7 rounded-xl p-4 cursor-pointer hover:border-[rgba(168,85,247,0.3)] transition-all"
            onClick={() => message.info('Tính năng AI đang phát triển')}
          >
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-bold text-white text-[0.85rem] mb-1">{f.title}</div>
            <div className="text-[0.72rem] text-white/40 leading-relaxed">{f.desc}</div>
            <div className="text-[0.72rem] text-[#a855f7] mt-2">Sử dụng →</div>
          </div>
        ))}
      </div>
      <div className="bg-white/[0.025] border border-white/7 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-[10px] bg-[rgba(168,85,247,0.2)] flex items-center justify-center text-base">🤖</div>
          <div>
            <div className="font-bold text-[0.85rem] text-[#a855f7]">SEAL AI Assistant</div>
            <div className="text-[0.68rem] text-white/35">Powered by GPT-4o</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
            <span className="text-[0.68rem] text-white/35">Online</span>
          </div>
        </div>
        <div className="px-4 py-3 max-h-[220px] overflow-y-auto flex flex-col gap-2">
          {chatMsgs.map(m => (
            <div
              key={m.id}
              className={`max-w-[80%] px-3 py-2 rounded-xl text-[0.82rem] leading-relaxed ${
                m.role === 'ai'
                  ? 'self-start bg-[rgba(168,85,247,0.1)] text-white/80 rounded-tl-sm'
                  : 'self-end bg-[rgba(0,212,255,0.15)] text-[#00d4ff] rounded-tr-sm'
              }`}
            >
              {m.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[0.82rem] text-white/80 placeholder-white/25 outline-none focus:border-[#a855f7] transition-colors"
            placeholder="Hỏi AI về dự án, tiêu chí chấm điểm..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
          />
          <button
            className="w-9 h-9 rounded-lg bg-[rgba(168,85,247,0.2)] text-[#a855f7] border border-[rgba(168,85,247,0.3)] flex items-center justify-center cursor-pointer hover:bg-[rgba(168,85,247,0.3)] transition-colors"
            onClick={sendMsg}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionProfile({ user }) {
  return (
    <div>
      <div className="text-[0.82rem] font-bold text-white/70 uppercase tracking-wide mb-4">👤 Hồ sơ</div>
      <div className="max-w-[520px]">
        <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[rgba(245,158,11,0.2)] to-[rgba(0,212,255,0.2)] border-2 border-[rgba(245,158,11,0.4)] flex items-center justify-center font-extrabold text-xl text-[#f59e0b]">
              {initials(user?.full_name || 'J')}
            </div>
            <div>
              <div className="font-bold text-white text-[1rem]">{user?.full_name}</div>
              <div className="text-[0.78rem] text-white/40 mb-1">{user?.email}</div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.1)] text-[#f59e0b]">
                {user?.roles?.some(r => r.role_name === 'mentor') ? '🎯 Mentor' : '⚖ Giám khảo'}
              </span>
            </div>
          </div>
          <div className="h-px bg-white/7" />
          {[{ label:'Họ và tên', val: user?.full_name || '—' }, { label:'Email', val: user?.email || '—' }].map(f => (
            <div key={f.label}>
              <div className="text-[0.72rem] font-bold text-white/30 mb-1 uppercase tracking-wide">{f.label}</div>
              <div className="text-[0.88rem] text-white/80 bg-black/30 px-3 py-2 rounded-lg border border-white/7">{f.val}</div>
            </div>
          ))}
          <button
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black cursor-pointer border-none hover:opacity-90 transition-opacity"
            onClick={() => message.info('Tính năng đang phát triển')}
          >
            Chỉnh sửa hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}

const VIEW_LABELS = {
  dashboard:'Tổng quan', competitions:'Cuộc thi của tôi',
  teams:'Đội cần chấm', results:'Kết quả',
  schedule:'Lịch trình', ai:'AI Assistant', profile:'Hồ sơ',
};

export default function JudgeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading]       = useState(true);
  const [enriched, setEnriched]     = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const assignRes = await request('/api/judge-assignments/me');
      const raw = (Array.isArray(assignRes) ? assignRes : (assignRes?.data ?? []))
        .filter(a => a.invitation_status !== 'pending_invite');

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

  const userInitials = initials(user?.full_name || 'J');

  const renderSection = () => {
    if (loading && activeView === 'dashboard') {
      return <div className="text-center py-20"><Spin size="large" /></div>;
    }
    switch (activeView) {
      case 'dashboard':    return <SectionDashboard    enriched={enriched} loading={loading} navigate={navigate} onNav={setActiveView} />;
      case 'competitions': return <SectionCompetitions enriched={enriched} navigate={navigate} />;
      case 'teams':        return <SectionTeams        enriched={enriched} navigate={navigate} />;
      case 'results':      return <SectionResults      enriched={enriched} />;
      case 'schedule':     return <SectionSchedule     enriched={enriched} />;
      case 'ai':           return <SectionAI />;
      case 'profile':      return <SectionProfile      user={user} />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#060b16] text-[#c9d6e8]">
      {contextHolder}

      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center bg-[#0b1120] border-b border-white/5 px-5">
        <div className="flex items-center gap-3">
          <span className="text-[#00d4ff] font-extrabold tracking-[2px]" style={{ fontFamily: "'Orbitron', monospace" }}>SEAL</span>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-white/50 text-sm">Judge Portal</span>
        </div>
        <div className="flex-1 px-5">
          <span className="text-[0.78rem] text-white/25">
            Dashboard / <span className="text-white/60">{VIEW_LABELS[activeView]}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer text-white/40 hover:text-white/70">🔔<div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#ef4444]" /></div>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgba(245,158,11,0.3)] to-[rgba(0,212,255,0.3)] border border-[rgba(245,158,11,0.4)] flex items-center justify-center font-bold text-[0.82rem] text-[#f59e0b]">
              {userInitials}
            </div>
            <div>
              <div className="text-[0.82rem] font-semibold text-white/80">{user?.full_name || 'Judge'}</div>
              <span className="text-xs text-[#f59e0b]">{user?.roles?.some(r => r.role_name === 'mentor') ? '🎯 Mentor' : '⚖ Giám khảo'}</span>
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

      {/* Sidebar */}
      <div className="mt-14 flex-shrink-0">
        <Sidebar active={activeView} onChange={setActiveView} />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 mt-14 p-6 overflow-y-auto">
        {activeView === 'dashboard' && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">
              Xin chào, <span className="text-[#00d4ff]">{user?.full_name?.split(' ').pop() || 'Giám khảo'}</span> 👋
            </h1>
            <p className="text-white/50 text-sm">
              Theo dõi tiến độ chấm điểm và các vòng thi được phân công.
            </p>
          </div>
        )}
        {renderSection()}
      </main>
    </div>
  );
}
