import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Modal, InputNumber, Tag, Alert, Progress, Tooltip, message } from 'antd';
import { useAuth } from '../../context/AuthContext';

const MOCK_ROUND = {
  name: 'Vòng Ý Tưởng (Sơ loại)',
  contestName: 'SEAL Hackathon Summer 2026',
  deadline: '2026-06-10T18:00:00',
  sequence_order: 1,
};

const MOCK_CRITERIA = [
  { id: 'c1', name: 'Tính thực tiễn',       weight: 0.3, maxScore: 10, description: 'Độ khả thi, giải quyết bài toán thực tế cụ thể' },
  { id: 'c2', name: 'Tính sáng tạo',         weight: 0.4, maxScore: 10, description: 'Ý tưởng mới lạ, đột phá, khác biệt' },
  { id: 'c3', name: 'Khả năng thuyết trình', weight: 0.3, maxScore: 10, description: 'Trình bày rõ ràng, thuyết phục, phản biện tốt' },
];

const MOCK_POOLS = [
  {
    id: 'pool-a', name: 'Bảng A',
    teams: [
      { id: 't1', name: 'Team Alpha',   repoUrl: 'https://github.com/alpha',   slideUrl: 'https://drive.google.com/alpha',  status: 'submitted' },
      { id: 't2', name: 'Team Beta',    repoUrl: 'https://github.com/beta',    slideUrl: null,                              status: 'submitted' },
      { id: 't3', name: 'Team Gamma',   repoUrl: null,                          slideUrl: null,                              status: 'not_submitted' },
    ],
  },
  {
    id: 'pool-b', name: 'Bảng B',
    teams: [
      { id: 't4', name: 'Team Delta',   repoUrl: 'https://github.com/delta',   slideUrl: 'https://slides.com/delta',        status: 'submitted' },
      { id: 't5', name: 'Team Epsilon', repoUrl: 'https://github.com/epsilon', slideUrl: 'https://slides.com/epsilon',      status: 'late_approved' },
    ],
  },
];

const TEAM_STATUS_CFG = {
  submitted:     { label: 'Đã nộp',           color: 'green'   },
  not_submitted: { label: 'Chưa nộp bài',     color: 'default' },
  late_approved: { label: 'Trễ — Đã duyệt',   color: 'orange'  },
  late_pending:  { label: 'Trễ — Chờ duyệt',  color: 'orange'  },
};

function calcTotal(criteriaScores) {
  return MOCK_CRITERIA.reduce((sum, c) => sum + ((criteriaScores[c.id] || 0) * c.weight), 0);
}

export default function JudgeDashboardPage() {
  const { contestId, roundId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scores, setScores] = useState({});
  const [scoringTeam, setScoringTeam] = useState(null);
  const [draft, setDraft] = useState({ criteria: {}, comment: '' });
  const [messageApi, contextHolder] = message.useMessage();

  const allTeams = MOCK_POOLS.flatMap(p => p.teams);
  const scorable = allTeams.filter(t => t.status !== 'not_submitted');
  const submittedCount = Object.values(scores).filter(s => s.status === 'submitted').length;
  const draftCount = Object.values(scores).filter(s => s.status === 'draft').length;
  const progress = scorable.length > 0 ? Math.round((submittedCount / scorable.length) * 100) : 0;
  const allDone = submittedCount >= scorable.length && scorable.length > 0;

  const openForm = (team) => {
    const existing = scores[team.id];
    setDraft({ criteria: existing?.criteria || {}, comment: existing?.comment || '' });
    setScoringTeam(team);
  };

  const saveScore = (status) => {
    if (status === 'submitted') {
      const allFilled = MOCK_CRITERIA.every(c => draft.criteria[c.id] !== undefined && draft.criteria[c.id] > 0);
      if (!allFilled) { messageApi.error('Vui lòng chấm đầy đủ tất cả tiêu chí trước khi nộp!'); return; }
    }
    setScores(prev => ({ ...prev, [scoringTeam.id]: { ...draft, status } }));
    setScoringTeam(null);
    messageApi.success(status === 'submitted' ? '✓ Đã nộp điểm chính thức!' : '💾 Đã lưu bản nháp!');
  };

  const weightedTotal = calcTotal(draft.criteria);

  return (
    <div className="min-h-screen bg-[#060b16] text-[#c9d6e8] flex flex-col">
      {contextHolder}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0b1120] border-b border-white/5 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white cursor-pointer hover:bg-white/10 transition-all"
            onClick={() => navigate(-1)}
            title="Quay lại"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} width={18} height={18}>
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] flex items-center justify-center text-lg">⚖</div>
            <div>
              <div className="font-bold text-white text-[0.9rem]">Judge Portal</div>
              <div className="text-[0.72rem] text-white/40">{MOCK_ROUND.contestName}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.15)]">
          <div className="w-8 h-8 rounded-lg bg-[rgba(0,212,255,0.15)] flex items-center justify-center font-bold text-[0.85rem] text-[#00d4ff]">
            {(user?.full_name || 'J')[0]}
          </div>
          <div>
            <div className="text-[0.82rem] font-semibold text-white/80">{user?.full_name || 'Judge'}</div>
            <div className="text-[0.68rem] text-white/35">{user?.email || ''}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-[960px] mx-auto w-full px-5 py-6 flex flex-col gap-5">

        {/* Round Header */}
        <div className="bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.15)] rounded-2xl p-5">
          <div className="mb-4">
            <div className="text-[0.68rem] font-bold text-[#00d4ff] tracking-widest mb-1">ROUND {MOCK_ROUND.sequence_order}</div>
            <h1 className="text-xl font-extrabold text-white mb-1">{MOCK_ROUND.name}</h1>
            <div className="flex items-center gap-1.5 text-[0.78rem] text-white/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={14} height={14}>
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              Deadline: {new Date(MOCK_ROUND.deadline).toLocaleString('vi-VN')}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {[
              { num: submittedCount, label: 'Đã nộp điểm',   color: '#10b981' },
              { num: draftCount,     label: 'Bản nháp',       color: '#f59e0b' },
              { num: scorable.length - submittedCount - draftCount, label: 'Chưa chấm', color: '#94a3b8' },
            ].map(s => (
              <div key={s.label} className="bg-black/30 border border-white/7 rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.num}</div>
                <div className="text-[0.68rem] text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
            <div className="flex-1 min-w-[200px] bg-black/30 border border-white/7 rounded-xl px-4 py-2.5">
              <div className="text-[0.72rem] text-white/40 mb-2">Tiến độ tổng: {submittedCount}/{scorable.length}</div>
              <Progress
                percent={progress}
                strokeColor={allDone ? '#10b981' : '#00d4ff'}
                trailColor="rgba(255,255,255,0.08)"
                strokeWidth={8}
              />
            </div>
          </div>
        </div>

        {allDone && (
          <Alert
            type="success"
            showIcon
            message="Bạn đã hoàn thành chấm điểm tất cả đội được giao! Admin có thể tiến hành khóa chấm điểm."
            style={{ borderRadius: 12 }}
          />
        )}

        {/* Criteria Reference */}
        <div className="bg-white/[0.025] border border-white/7 rounded-xl px-4 py-3">
          <div className="text-[0.72rem] font-bold text-white/40 uppercase tracking-wide mb-2">Tiêu chí chấm điểm vòng này</div>
          <div className="flex flex-wrap gap-2">
            {MOCK_CRITERIA.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)]">
                <span className="text-[0.8rem] text-white/70 font-medium">{c.name}</span>
                <span className="text-[0.7rem] font-bold text-[#00d4ff]">×{(c.weight * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pool Sections */}
        <div className="flex flex-col gap-5">
          {MOCK_POOLS.map(pool => {
            const poolSubmitted = pool.teams.filter(t => scores[t.id]?.status === 'submitted').length;
            const poolScorable = pool.teams.filter(t => t.status !== 'not_submitted').length;
            return (
              <div key={pool.id} className="bg-white/[0.025] border border-white/7 rounded-2xl overflow-hidden">
                {/* Pool Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-white text-[0.95rem] m-0">{pool.name}</h2>
                    <Tag style={{ fontSize: '0.72rem' }}>{pool.teams.length} đội</Tag>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[0.75rem] text-white/40">{poolSubmitted}/{poolScorable} đã nộp</span>
                    <Progress
                      percent={poolScorable > 0 ? Math.round((poolSubmitted / poolScorable) * 100) : 0}
                      size="small"
                      strokeColor="#00d4ff"
                      trailColor="rgba(255,255,255,0.08)"
                      showInfo={false}
                      style={{ width: 100 }}
                    />
                  </div>
                </div>

                {/* Team List */}
                <div className="flex flex-col">
                  {pool.teams.map((team, ti) => {
                    const sc = TEAM_STATUS_CFG[team.status] || TEAM_STATUS_CFG.not_submitted;
                    const myScore = scores[team.id];
                    const final = myScore?.status === 'submitted' ? calcTotal(myScore.criteria) : null;

                    return (
                      <div
                        key={team.id}
                        className={`flex items-center justify-between px-4 py-3 gap-3 hover:bg-white/[0.02] transition-colors ${ti > 0 ? 'border-t border-white/5' : ''}`}
                      >
                        {/* Left: team info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] flex items-center justify-center font-bold text-[#00d4ff] text-[0.85rem] flex-shrink-0">
                            {team.name.slice(-1)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white text-[0.88rem] truncate">{team.name}</div>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <Tag color={sc.color} style={{ fontSize: '0.68rem' }}>{sc.label}</Tag>
                              {team.repoUrl && (
                                <a href={team.repoUrl} target="_blank" rel="noreferrer" className="text-[0.72rem] text-[#00d4ff] hover:underline no-underline">🔗 Repo</a>
                              )}
                              {team.slideUrl && (
                                <a href={team.slideUrl} target="_blank" rel="noreferrer" className="text-[0.72rem] text-[#a855f7] hover:underline no-underline">📊 Slide</a>
                              )}
                              {!team.repoUrl && !team.slideUrl && team.status !== 'not_submitted' && (
                                <span className="text-[0.72rem] text-white/30">Chưa có tài liệu</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: score badge + action */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {myScore?.status === 'submitted' && final !== null && (
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-xl font-extrabold text-[#10b981]">{final.toFixed(1)}</span>
                              <span className="text-[0.72rem] text-white/30">/10</span>
                            </div>
                          )}
                          {myScore?.status === 'draft' && (
                            <Tag color="orange" style={{ marginRight: 8 }}>Nháp</Tag>
                          )}
                          {team.status === 'not_submitted' ? (
                            <Tooltip title="Đội này chưa nộp bài — không thể chấm điểm">
                              <Button size="small" disabled>Chưa nộp bài</Button>
                            </Tooltip>
                          ) : (
                            <Button
                              type={myScore?.status === 'submitted' ? 'default' : 'primary'}
                              size="small"
                              onClick={() => openForm(team)}
                            >
                              {myScore?.status === 'submitted' ? '✓ Xem / Sửa'
                                : myScore?.status === 'draft' ? '📝 Tiếp tục'
                                : '⚖ Chấm điểm'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score Form Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2.5">
            <span>⚖ Chấm điểm:</span>
            <span className="text-[#00d4ff]">{scoringTeam?.name}</span>
          </div>
        }
        open={!!scoringTeam}
        onCancel={() => setScoringTeam(null)}
        width={620}
        footer={null}
        destroyOnClose
      >
        {scoringTeam && (
          <div className="flex flex-col gap-4 pt-1">
            {/* Quick links */}
            <div className="flex items-center gap-3 flex-wrap">
              {scoringTeam.repoUrl
                ? <a href={scoringTeam.repoUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] text-sm no-underline hover:bg-[rgba(0,212,255,0.15)]">🔗 Mở Repo</a>
                : <span className="text-sm text-white/30">Không có link repo</span>}
              {scoringTeam.slideUrl
                ? <a href={scoringTeam.slideUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.2)] text-[#a855f7] text-sm no-underline hover:bg-[rgba(168,85,247,0.15)]">📊 Mở Slide</a>
                : <span className="text-sm text-white/30">Không có slide</span>}
            </div>

            {/* Criteria scoring */}
            <div className="flex flex-col gap-3">
              {MOCK_CRITERIA.map(c => (
                <div key={c.id} className="bg-white/[0.02] border border-white/7 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white/85 text-[0.88rem]">{c.name}</span>
                    <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full bg-[rgba(0,212,255,0.1)] text-[#00d4ff]">×{(c.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-[0.75rem] text-white/40 mb-2.5">{c.description}</div>
                  <div className="flex items-center gap-3">
                    <InputNumber
                      min={0} max={c.maxScore} step={0.5} precision={1}
                      value={draft.criteria[c.id] ?? null}
                      onChange={v => setDraft(p => ({ ...p, criteria: { ...p.criteria, [c.id]: v } }))}
                      style={{ width: 90 }}
                      placeholder="0–10"
                    />
                    <span className="text-sm text-white/40">/ {c.maxScore}</span>
                    {draft.criteria[c.id] !== undefined && draft.criteria[c.id] !== null && (
                      <span className="text-sm font-semibold text-[#10b981]">
                        → {(draft.criteria[c.id] * c.weight).toFixed(2)} điểm
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Weighted total */}
            <div className="bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.2)] rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.85rem] font-semibold text-white/60">Điểm tổng (quy đổi):</span>
                <span className="text-xl font-extrabold" style={{
                  color: weightedTotal >= 8 ? '#10b981' : weightedTotal >= 6 ? '#f59e0b' : weightedTotal > 0 ? '#ef4444' : 'rgba(255,255,255,0.25)'
                }}>
                  {weightedTotal.toFixed(2)} / 10
                </span>
              </div>
              <Progress
                percent={Math.round(weightedTotal * 10)}
                strokeColor={weightedTotal >= 8 ? '#10b981' : weightedTotal >= 6 ? '#f59e0b' : '#ef4444'}
                trailColor="rgba(255,255,255,0.08)"
                size="small"
                showInfo={false}
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-[0.75rem] font-semibold text-white/40 mb-2 uppercase tracking-wide">Nhận xét (không bắt buộc)</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/25 outline-none resize-none focus:border-[rgba(0,212,255,0.4)] transition-colors"
                rows={3}
                placeholder="Nhận xét tổng quan về đội thi, điểm mạnh, điểm cần cải thiện..."
                value={draft.comment}
                onChange={e => setDraft(p => ({ ...p, comment: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <Button onClick={() => saveScore('draft')}>💾 Lưu nháp</Button>
              <Button type="primary" onClick={() => saveScore('submitted')} style={{ minWidth: 160 }}>
                ✓ Nộp điểm chính thức
              </Button>
            </div>

            {scores[scoringTeam.id]?.status === 'submitted' && (
              <Alert
                type="success"
                showIcon
                message="Đội này đã có điểm chính thức. Bạn vẫn có thể sửa trước khi Admin khóa chấm điểm."
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
