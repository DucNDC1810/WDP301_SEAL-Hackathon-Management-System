import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Modal, InputNumber, Tag, Alert, Progress, Tooltip, message, Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import '../mentor/JudgeScoringPage.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TEAM_STATUS_CFG = {
  submitted:     { label: 'Đã nộp',           color: 'green'   },
  not_submitted: { label: 'Chưa nộp bài',     color: 'default' },
  late_approved: { label: 'Trễ — Đã duyệt',   color: 'orange'  },
  late_pending:  { label: 'Trễ — Chờ duyệt',  color: 'orange'  },
  rejected:      { label: 'Bị từ chối',        color: 'red'     },
};

const mapSubStatus = (s) => {
  const m = { SUBMITTED: 'submitted', LATE: 'late_pending', LATE_PENDING: 'late_pending', APPROVED: 'late_approved', REJECTED: 'rejected' };
  return m[s] || 'not_submitted';
};

// Chỉ dùng để hiển thị label trạng thái nộp bài — không còn dùng để gate nút chấm
const canScore = (_status) => true;

function calcTotal(criteria, criteriaScores) {
  const weightSum = criteria.reduce((s, c) => s + c.weight, 0);
  if (weightSum === 0) return 0;
  const raw = criteria.reduce((s, c) => s + ((criteriaScores[c.id] || 0) * c.weight), 0) / weightSum;
  return Math.round(raw * 100) / 100;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function JudgeScoringPage() {
  const { contestId, roundId, poolId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(null);
  const [poolName, setPoolName] = useState('');
  const [roundActive, setRoundActive] = useState(false);
  const [criteria, setCriteria] = useState([]);
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState({});

  const [scoringTeam, setScoringTeam] = useState(null);
  const [draft, setDraft] = useState({ criteria: {}, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [contestData, poolsData, subsData, myScoresData] = await Promise.all([
          request(`/api/contests/${contestId}`),
          request(`/api/pools/contests/${contestId}/pools`),
          request(`/api/submissions?round_id=${roundId}`),
          request(`/api/scores/contests/${contestId}/rounds/${roundId}/my-scores`).catch(() => []),
        ]);

        const contest = contestData?.data ?? contestData;
        const roundObj = (contest?.rounds || []).find(r => r._id === roundId || r._id?.toString() === roundId);
        if (roundObj) {
          setRound({
            name: roundObj.name,
            contestName: contest.title,
            deadline: roundObj.submission_deadline,
            sequence_order: roundObj.round_number,
          });
          setRoundActive(!!roundObj.is_active);
          setCriteria((roundObj.score_criteria || []).map(c => ({
            id: c._id, name: c.name, weight: c.weight,
            maxScore: c.max_score, description: c.description || '',
          })));
        }

        // Chỉ lấy pool được phân công
        const allPools = Array.isArray(poolsData) ? poolsData : (poolsData?.data ?? []);
        const myPool = allPools.find(p => p._id?.toString() === poolId || p._id === poolId);
        if (myPool) setPoolName(myPool.pool_name || '');

        const subList = Array.isArray(subsData) ? subsData : (subsData?.data ?? []);
        const subMap = {};
        subList.forEach(sub => {
          const tid = (sub.team_id?._id || sub.team_id)?.toString();
          if (tid) subMap[tid] = { status: mapSubStatus(sub.status), repoUrl: sub.repo_url, slideUrl: sub.slide_url };
        });

        const myScoresList = Array.isArray(myScoresData) ? myScoresData : (myScoresData?.data ?? []);
        const scoresMap = {};
        myScoresList.forEach(sc => {
          const tid = (sc.team_id?._id || sc.team_id)?.toString();
          if (!tid) return;
          const criteriaByName = {};
          (sc.score_details || []).forEach(d => { criteriaByName[d.criteria_name] = d.score_value; });
          scoresMap[tid] = { _id: sc._id, status: sc.status, criteriaByName, comment: sc.comment || '' };
        });

        const poolTeams = (myPool?.teams || []).map(t => {
          const tid = (t?._id || t)?.toString();
          const sub = subMap[tid] || { status: 'not_submitted' };
          return { id: tid, name: t?.team_name || tid, repoUrl: sub.repoUrl, slideUrl: sub.slideUrl, status: sub.status };
        });

        setTeams(poolTeams);
        setScores(scoresMap);
      } catch {
        messageApi.error('Không thể tải dữ liệu chấm điểm');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [contestId, roundId, poolId]);

  const scorable = teams.filter(t => canScore(t.status));
  const submittedCount = Object.values(scores).filter(s => s.status === 'submitted').length;
  const draftCount = Object.values(scores).filter(s => s.status === 'draft').length;
  const progress = scorable.length > 0 ? Math.round((submittedCount / scorable.length) * 100) : 0;
  const allDone = submittedCount >= scorable.length && scorable.length > 0;

  const openForm = (team) => {
    if (roundActive) return;
    const existing = scores[team.id];
    if (existing) {
      const restoredCriteria = {};
      criteria.forEach(c => {
        const v = existing.criteriaByName?.[c.name];
        if (v !== undefined) restoredCriteria[c.id] = v;
      });
      setDraft({ criteria: restoredCriteria, comment: existing.comment || '' });
    } else {
      setDraft({ criteria: {}, comment: '' });
    }
    setScoringTeam(team);
  };

  const saveScore = async (status) => {
    if (status === 'submitted') {
      const allFilled = criteria.every(c => draft.criteria[c.id] !== undefined && draft.criteria[c.id] > 0);
      if (!allFilled) { messageApi.error('Vui lòng chấm đầy đủ tất cả tiêu chí!'); return; }
    }
    setSubmitting(true);
    try {
      const scoreDetails = criteria.map(c => ({
        criteria_name: c.name,
        score_value: draft.criteria[c.id] || 0,
        weight: c.weight,
        max_score: c.maxScore,
      }));
      const payload = {
        team_id: scoringTeam.id,
        contest_id: contestId,
        round_id: roundId,
        comment: draft.comment,
        score_details: scoreDetails,
        submit: status === 'submitted',
      };
      const existing = scores[scoringTeam.id];
      let result;
      if (existing?._id) {
        result = await request(`/api/scores/${existing._id}`, { method: 'PUT', body: payload });
      } else {
        result = await request('/api/scores', { method: 'POST', body: payload });
      }
      const scoreId = result?._id || existing?._id;
      const criteriaByName = {};
      criteria.forEach(c => { criteriaByName[c.name] = draft.criteria[c.id] || 0; });
      setScores(prev => ({ ...prev, [scoringTeam.id]: { _id: scoreId, status, criteriaByName, comment: draft.comment } }));
      setScoringTeam(null);
      messageApi.success(status === 'submitted' ? '✓ Đã nộp điểm chính thức!' : '💾 Đã lưu bản nháp!');
    } catch (e) {
      messageApi.error(e.message || 'Không thể lưu điểm');
    } finally {
      setSubmitting(false);
    }
  };

  const weightedTotal = calcTotal(criteria, draft.criteria);

  if (loading) {
    return (
      <div className="jp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="jp-page">
      {contextHolder}

      {/* Topbar */}
      <div className="jp-topbar">
        <div className="jp-topbar-left">
          <button className="jp-back-btn" onClick={() => navigate('/judge/dashboard')} title="Về trang chủ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} width={18} height={18}>
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div className="jp-brand">
            <span className="jp-brand-icon">⚖</span>
            <div>
              <div className="jp-brand-title">Judge Portal</div>
              <div className="jp-brand-sub">{round?.contestName || '...'}</div>
            </div>
          </div>
        </div>
        <div className="jp-topbar-right">
          <div className="jp-judge-chip">
            <div className="jp-judge-avatar">{(user?.full_name || 'J')[0]}</div>
            <div>
              <div className="jp-judge-name">{user?.full_name || 'Judge'}</div>
              <div className="jp-judge-email" style={{ color: '#00d4ff' }}>⚖ Giám khảo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Round header */}
      <div className="jp-round-header">
        <div className="jp-round-info">
          <div className="jp-round-seq">ROUND {round?.sequence_order || ''}</div>
          <h1 className="jp-round-name">{round?.name || 'Đang tải...'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <Tag color="purple" style={{ fontSize: '0.78rem' }}>Bảng: {poolName}</Tag>
            <Tag color="blue" style={{ fontSize: '0.78rem' }}>{teams.length} đội</Tag>
          </div>
          {round?.deadline && (
            <div className="jp-deadline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={14} height={14}>
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              Deadline: {new Date(round.deadline).toLocaleString('vi-VN')}
            </div>
          )}
        </div>
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
            <div className="jp-stat-lbl" style={{ marginBottom: 6 }}>Tiến độ: {submittedCount}/{scorable.length}</div>
            <Progress percent={progress} strokeColor={allDone ? '#10b981' : '#00d4ff'}
              trailColor="rgba(255,255,255,0.08)" strokeWidth={8} />
          </div>
        </div>
      </div>

      {/* Timing restriction banner */}
      {roundActive && (
        <Alert
          type="warning" showIcon
          message="Vòng thi đang diễn ra — chưa thể chấm điểm"
          description="Với vai trò Giám khảo, bạn chỉ có thể chấm điểm sau khi vòng thi kết thúc. Vui lòng quay lại sau."
          style={{ borderRadius: 12 }}
        />
      )}

      {!roundActive && allDone && scorable.length > 0 && (
        <Alert type="success" showIcon
          message="Bạn đã hoàn thành chấm điểm tất cả đội được giao!"
          style={{ borderRadius: 12 }} />
      )}

      {/* Criteria reference */}
      {criteria.length > 0 && (
        <div className="jp-criteria-ref">
          <div className="jp-criteria-ref-title">Tiêu chí chấm điểm vòng này</div>
          <div className="jp-criteria-ref-list">
            {criteria.map(c => (
              <div key={c.id} className="jp-crit-chip">
                <span className="jp-crit-chip-name">{c.name}</span>
                <span className="jp-crit-chip-w">×{(c.weight * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team list */}
      <div className="jp-pool-card">
        <div className="jp-pool-header">
          <div className="jp-pool-title-group">
            <h2 className="jp-pool-name">{poolName}</h2>
            <Tag>{teams.length} đội</Tag>
          </div>
          <div className="jp-pool-progress">
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {submittedCount}/{scorable.length} đã nộp điểm
            </span>
            <Progress
              percent={progress} size="small"
              strokeColor="#00d4ff" trailColor="rgba(255,255,255,0.08)"
              showInfo={false} style={{ width: 100 }}
            />
          </div>
        </div>

        <div className="jp-team-list">
          {teams.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              Bảng này chưa có đội nào
            </div>
          )}
          {teams.map(team => {
            const sc = TEAM_STATUS_CFG[team.status] || TEAM_STATUS_CFG.not_submitted;
            const myScore = scores[team.id];
            const final = myScore?.status === 'submitted'
              ? calcTotal(criteria, (() => {
                  const m = {};
                  criteria.forEach(c => { m[c.id] = myScore.criteriaByName?.[c.name] || 0; });
                  return m;
                })())
              : null;

            return (
              <div key={team.id} className="jp-team-row">
                <div className="jp-team-left">
                  <div className="jp-team-avatar">{(team.name || '?').slice(-1)}</div>
                  <div className="jp-team-info">
                    <div className="jp-team-name">{team.name}</div>
                    <div className="jp-team-links">
                      <Tag color={sc.color} style={{ fontSize: '0.68rem' }}>{sc.label}</Tag>
                      {team.repoUrl && <a href={team.repoUrl} target="_blank" rel="noreferrer" className="jp-link jp-link--repo">🔗 Repo</a>}
                      {team.slideUrl && <a href={team.slideUrl} target="_blank" rel="noreferrer" className="jp-link jp-link--slide">📊 Slide</a>}
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
                  {myScore?.status === 'draft' && <Tag color="orange" style={{ marginRight: 8 }}>Nháp</Tag>}

                  {roundActive ? (
                    <Tooltip title="Vòng thi chưa kết thúc">
                      <Button size="small" disabled>🔒 Chờ kết thúc</Button>
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

      {/* Score form modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>⚖ Chấm điểm:</span>
            <span style={{ color: 'var(--cyan)' }}>{scoringTeam?.name}</span>
          </div>
        }
        open={!!scoringTeam}
        onCancel={() => setScoringTeam(null)}
        width={620} footer={null} destroyOnClose
      >
        {scoringTeam && (
          <div className="jp-score-form">
            <div className="jp-score-links">
              {scoringTeam.repoUrl
                ? <a href={scoringTeam.repoUrl} target="_blank" rel="noreferrer" className="jp-score-link jp-score-link--repo">🔗 Mở Repo</a>
                : <span className="jp-no-link">Không có link repo</span>}
              {scoringTeam.slideUrl
                ? <a href={scoringTeam.slideUrl} target="_blank" rel="noreferrer" className="jp-score-link jp-score-link--slide">📊 Mở Slide</a>
                : <span className="jp-no-link">Không có slide</span>}
            </div>

            <div className="jp-crit-list">
              {criteria.map(c => (
                <div key={c.id} className="jp-crit-row">
                  <div className="jp-crit-meta">
                    <div className="jp-crit-header-row">
                      <span className="jp-crit-name">{c.name}</span>
                      <span className="jp-crit-weight-badge">×{(c.weight * 100).toFixed(0)}%</span>
                    </div>
                    {c.description && <div className="jp-crit-desc">{c.description}</div>}
                  </div>
                  <div className="jp-crit-input-row">
                    <InputNumber
                      min={0} max={c.maxScore} step={0.5} precision={1}
                      value={draft.criteria[c.id] ?? null}
                      onChange={v => setDraft(p => ({ ...p, criteria: { ...p.criteria, [c.id]: v } }))}
                      style={{ width: 90 }} placeholder="0–10"
                    />
                    <span className="jp-crit-max">/ {c.maxScore}</span>
                    {draft.criteria[c.id] !== undefined && draft.criteria[c.id] !== null && (
                      <span className="jp-crit-contrib">→ {(draft.criteria[c.id] * c.weight).toFixed(2)} điểm</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="jp-total-box">
              <div className="jp-total-row">
                <span className="jp-total-label">Điểm tổng (quy đổi):</span>
                <span className="jp-total-value" style={{
                  color: weightedTotal >= 8 ? '#10b981' : weightedTotal >= 6 ? '#f59e0b' : weightedTotal > 0 ? '#ef4444' : 'var(--text-muted)'
                }}>
                  {weightedTotal.toFixed(2)} / 10
                </span>
              </div>
              <Progress percent={Math.round(weightedTotal * 10)}
                strokeColor={weightedTotal >= 8 ? '#10b981' : weightedTotal >= 6 ? '#f59e0b' : '#ef4444'}
                trailColor="rgba(255,255,255,0.08)" size="small" showInfo={false} />
            </div>

            <div className="jp-comment-box">
              <label className="jp-comment-label">Nhận xét (không bắt buộc)</label>
              <textarea className="jp-comment-textarea" rows={3}
                placeholder="Nhận xét tổng quan về đội thi..."
                value={draft.comment}
                onChange={e => setDraft(p => ({ ...p, comment: e.target.value }))}
              />
            </div>

            <div className="jp-form-actions">
              <Button onClick={() => saveScore('draft')} loading={submitting}>💾 Lưu nháp</Button>
              <Button type="primary" onClick={() => saveScore('submitted')} loading={submitting} style={{ minWidth: 160 }}>
                ✓ Nộp điểm chính thức
              </Button>
            </div>

            {scores[scoringTeam?.id]?.status === 'submitted' && (
              <Alert type="success" showIcon
                message="Đội này đã có điểm chính thức. Bạn vẫn có thể sửa trước khi Admin khóa."
                style={{ marginTop: 8 }} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
