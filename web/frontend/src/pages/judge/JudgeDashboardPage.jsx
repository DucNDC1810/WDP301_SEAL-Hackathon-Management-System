import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Modal, InputNumber, Tag, Alert, Progress, Tooltip, Badge, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import './JudgeDashboardPage.css';

// ─── Mock Data ───────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TEAM_STATUS_CFG = {
  submitted:     { label: 'Đã nộp',           color: 'green'   },
  not_submitted: { label: 'Chưa nộp bài',     color: 'default' },
  late_approved: { label: 'Trễ — Đã duyệt',   color: 'orange'  },
  late_pending:  { label: 'Trễ — Chờ duyệt',  color: 'orange'  },
};

function calcTotal(criteriaScores) {
  return MOCK_CRITERIA.reduce((sum, c) => sum + ((criteriaScores[c.id] || 0) * c.weight), 0);
}

// ─── Component ───────────────────────────────────────────────────────────────
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
    <div className="jp-page">
      {contextHolder}

      {/* ─── Top Bar ─── */}
      <div className="jp-topbar">
        <div className="jp-topbar-left">
          <button className="jp-back-btn" onClick={() => navigate(-1)} title="Quay lại">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} width={18} height={18}>
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div className="jp-brand">
            <span className="jp-brand-icon">⚖</span>
            <div>
              <div className="jp-brand-title">Judge Portal</div>
              <div className="jp-brand-sub">{MOCK_ROUND.contestName}</div>
            </div>
          </div>
        </div>
        <div className="jp-topbar-right">
          <div className="jp-judge-chip">
            <div className="jp-judge-avatar">{(user?.full_name || 'J')[0]}</div>
            <div>
              <div className="jp-judge-name">{user?.full_name || 'Judge'}</div>
              <div className="jp-judge-email">{user?.email || ''}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Round Header ─── */}
      <div className="jp-round-header">
        <div className="jp-round-info">
          <div className="jp-round-seq">ROUND {MOCK_ROUND.sequence_order}</div>
          <h1 className="jp-round-name">{MOCK_ROUND.name}</h1>
          <div className="jp-deadline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={14} height={14}>
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            Deadline: {new Date(MOCK_ROUND.deadline).toLocaleString('vi-VN')}
          </div>
        </div>

        {/* Progress stats */}
        <div className="jp-stats-row">
          <div className="jp-stat-box">
            <div className="jp-stat-num" style={{ color: '#10b981' }}>{submittedCount}</div>
            <div className="jp-stat-lbl">Đã nộp điểm</div>
          </div>
          <div className="jp-stat-box">
            <div className="jp-stat-num" style={{ color: '#f59e0b' }}>{draftCount}</div>
            <div className="jp-stat-lbl">Bản nháp</div>
          </div>
          <div className="jp-stat-box">
            <div className="jp-stat-num" style={{ color: '#94a3b8' }}>{scorable.length - submittedCount - draftCount}</div>
            <div className="jp-stat-lbl">Chưa chấm</div>
          </div>
          <div className="jp-stat-box jp-stat-box--wide">
            <div className="jp-stat-lbl" style={{ marginBottom: 6 }}>Tiến độ tổng: {submittedCount}/{scorable.length}</div>
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

      {/* ─── Criteria Reference ─── */}
      <div className="jp-criteria-ref">
        <div className="jp-criteria-ref-title">Tiêu chí chấm điểm vòng này</div>
        <div className="jp-criteria-ref-list">
          {MOCK_CRITERIA.map(c => (
            <div key={c.id} className="jp-crit-chip">
              <span className="jp-crit-chip-name">{c.name}</span>
              <span className="jp-crit-chip-w">×{(c.weight * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Pool Sections ─── */}
      <div className="jp-pools space-y-5">
        {MOCK_POOLS.map(pool => {
          const poolSubmitted = pool.teams.filter(t => scores[t.id]?.status === 'submitted').length;
          const poolScorable = pool.teams.filter(t => t.status !== 'not_submitted').length;
          return (
            <div key={pool.id} className="jp-pool-card">
              <div className="jp-pool-header">
                <div className="jp-pool-title-group">
                  <h2 className="jp-pool-name">{pool.name}</h2>
                  <Tag>{pool.teams.length} đội</Tag>
                </div>
                <div className="jp-pool-progress">
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {poolSubmitted}/{poolScorable} đã nộp
                  </span>
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

              <div className="jp-team-list">
                {pool.teams.map(team => {
                  const sc = TEAM_STATUS_CFG[team.status] || TEAM_STATUS_CFG.not_submitted;
                  const myScore = scores[team.id];
                  const final = myScore?.status === 'submitted' ? calcTotal(myScore.criteria) : null;

                  return (
                    <div key={team.id} className="jp-team-row">
                      <div className="jp-team-left">
                        <div className="jp-team-avatar">{team.name.slice(-1)}</div>
                        <div className="jp-team-info">
                          <div className="jp-team-name">{team.name}</div>
                          <div className="jp-team-links">
                            <Tag color={sc.color} style={{ fontSize: '0.68rem' }}>{sc.label}</Tag>
                            {team.repoUrl && (
                              <a href={team.repoUrl} target="_blank" rel="noreferrer" className="jp-link jp-link--repo">🔗 Repo</a>
                            )}
                            {team.slideUrl && (
                              <a href={team.slideUrl} target="_blank" rel="noreferrer" className="jp-link jp-link--slide">📊 Slide</a>
                            )}
                            {!team.repoUrl && !team.slideUrl && team.status !== 'not_submitted' && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Chưa có tài liệu</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="jp-team-right">
                        {myScore?.status === 'submitted' && final !== null && (
                          <div className="jp-score-badge">
                            <span className="jp-score-num">{final.toFixed(1)}</span>
                            <span className="jp-score-denom">/10</span>
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

      {/* ─── Score Form Modal ─── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>⚖ Chấm điểm:</span>
            <span style={{ color: 'var(--cyan)' }}>{scoringTeam?.name}</span>
          </div>
        }
        open={!!scoringTeam}
        onCancel={() => setScoringTeam(null)}
        width={620}
        footer={null}
        destroyOnClose
      >
        {scoringTeam && (
          <div className="jp-score-form">
            {/* Quick links */}
            <div className="jp-score-links">
              {scoringTeam.repoUrl
                ? <a href={scoringTeam.repoUrl} target="_blank" rel="noreferrer" className="jp-score-link jp-score-link--repo">🔗 Mở Repo</a>
                : <span className="jp-no-link">Không có link repo</span>}
              {scoringTeam.slideUrl
                ? <a href={scoringTeam.slideUrl} target="_blank" rel="noreferrer" className="jp-score-link jp-score-link--slide">📊 Mở Slide</a>
                : <span className="jp-no-link">Không có slide</span>}
            </div>

            {/* Criteria scoring */}
            <div className="jp-crit-list">
              {MOCK_CRITERIA.map(c => (
                <div key={c.id} className="jp-crit-row">
                  <div className="jp-crit-meta">
                    <div className="jp-crit-header-row">
                      <span className="jp-crit-name">{c.name}</span>
                      <span className="jp-crit-weight-badge">×{(c.weight * 100).toFixed(0)}%</span>
                    </div>
                    <div className="jp-crit-desc">{c.description}</div>
                  </div>
                  <div className="jp-crit-input-row">
                    <InputNumber
                      min={0} max={c.maxScore} step={0.5} precision={1}
                      value={draft.criteria[c.id] ?? null}
                      onChange={v => setDraft(p => ({ ...p, criteria: { ...p.criteria, [c.id]: v } }))}
                      style={{ width: 90 }}
                      placeholder="0–10"
                    />
                    <span className="jp-crit-max">/ {c.maxScore}</span>
                    {draft.criteria[c.id] !== undefined && draft.criteria[c.id] !== null && (
                      <span className="jp-crit-contrib">
                        → {(draft.criteria[c.id] * c.weight).toFixed(2)} điểm
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Weighted total */}
            <div className="jp-total-box">
              <div className="jp-total-row">
                <span className="jp-total-label">Điểm tổng (quy đổi):</span>
                <span className="jp-total-value" style={{
                  color: weightedTotal >= 8 ? '#10b981' : weightedTotal >= 6 ? '#f59e0b' : weightedTotal > 0 ? '#ef4444' : 'var(--text-muted)'
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
            <div className="jp-comment-box">
              <label className="jp-comment-label">Nhận xét (không bắt buộc)</label>
              <textarea
                className="jp-comment-textarea"
                rows={3}
                placeholder="Nhận xét tổng quan về đội thi, điểm mạnh, điểm cần cải thiện..."
                value={draft.comment}
                onChange={e => setDraft(p => ({ ...p, comment: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="jp-form-actions">
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
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
