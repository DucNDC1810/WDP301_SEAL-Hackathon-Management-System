import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Modal, InputNumber, Tag, Alert, Progress, Tooltip, message, Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

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

const canScore = (_status) => true;

function calcTotal(criteria, criteriaScores) {
  const weightSum = criteria.reduce((s, c) => s + c.weight, 0);
  if (weightSum === 0) return 0;
  const raw = criteria.reduce((s, c) => s + ((criteriaScores[c.id] || 0) * c.weight), 0) / weightSum;
  return Math.round(raw * 100) / 100;
}

export default function JudgeDashboardPage() {
  const { contestId, roundId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [pools, setPools] = useState([]);
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
          const crits = (roundObj.score_criteria || []).map(c => ({
            id: c._id,
            name: c.name,
            weight: c.weight,
            maxScore: c.max_score,
            description: c.description || '',
          }));
          setCriteria(crits);
        }

        const allPools = Array.isArray(poolsData) ? poolsData : (poolsData?.data ?? []);
        const subList = Array.isArray(subsData) ? subsData : (subsData?.data ?? []);
        const subMap = {};
        subList.forEach(sub => {
          const tid = (sub.team_id?._id || sub.team_id)?.toString();
          if (tid) subMap[tid] = {
            status: mapSubStatus(sub.status),
            repoUrl: sub.repo_url,
            slideUrl: sub.slide_url,
          };
        });

        const myScoresList = Array.isArray(myScoresData) ? myScoresData : (myScoresData?.data ?? []);
        const scoresMap = {};
        myScoresList.forEach(sc => {
          const tid = (sc.team_id?._id || sc.team_id)?.toString();
          if (!tid) return;
          const criteriaMap = {};
          (sc.score_details || []).forEach(d => { criteriaMap[d.criteria_name] = d.score_value; });
          scoresMap[tid] = {
            _id: sc._id,
            status: sc.status,
            criteriaByName: criteriaMap,
            comment: sc.comment || '',
          };
        });

        const poolsWithTeams = allPools.map(p => ({
          id: p._id,
          name: p.pool_name,
          teams: (p.teams || []).map(t => {
            const tid = (t?._id || t)?.toString();
            const sub = subMap[tid] || { status: 'not_submitted' };
            return { id: tid, name: t?.team_name || tid, repoUrl: sub.repoUrl, slideUrl: sub.slideUrl, status: sub.status };
          }),
        }));

        setPools(poolsWithTeams);
        setScores(scoresMap);
      } catch {
        messageApi.error('Không thể tải dữ liệu chấm điểm');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [contestId, roundId]);

  const allTeams = pools.flatMap(p => p.teams);
  const scorable = allTeams.filter(t => canScore(t.status));
  const submittedCount = Object.values(scores).filter(s => s.status === 'submitted').length;
  const draftCount = Object.values(scores).filter(s => s.status === 'draft').length;
  const progress = scorable.length > 0 ? Math.round((submittedCount / scorable.length) * 100) : 0;
  const allDone = submittedCount >= scorable.length && scorable.length > 0;

  const openForm = (team) => {
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
      if (!allFilled) { messageApi.error('Vui lòng chấm đầy đủ tất cả tiêu chí trước khi nộp!'); return; }
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

      setScores(prev => ({
        ...prev,
        [scoringTeam.id]: { _id: scoreId, status, criteriaByName, comment: draft.comment },
      }));

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
      <div className="flex items-center justify-center min-h-screen bg-[#060b16]">
        <Spin size="large" />
      </div>
    );
  }

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
              <div className="text-[0.72rem] text-white/40">{round?.contestName || '...'}</div>
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
            <div className="text-[0.68rem] font-bold text-[#00d4ff] tracking-widest mb-1">ROUND {round?.sequence_order || ''}</div>
            <h1 className="text-xl font-extrabold text-white mb-1">{round?.name || 'Đang tải...'}</h1>
            {round?.deadline && (
              <div className="flex items-center gap-1.5 text-[0.78rem] text-white/40">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={14} height={14}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                Deadline: {new Date(round.deadline).toLocaleString('vi-VN')}
              </div>
            )}
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

        {allDone && scorable.length > 0 && (
          <Alert
            type="success" showIcon
            message="Bạn đã hoàn thành chấm điểm tất cả đội được giao! Admin có thể tiến hành khóa chấm điểm."
            style={{ borderRadius: 12 }}
          />
        )}

        {/* Criteria Reference */}
        {criteria.length > 0 && (
          <div className="bg-white/[0.025] border border-white/7 rounded-xl px-4 py-3">
            <div className="text-[0.72rem] font-bold text-white/40 uppercase tracking-wide mb-2">Tiêu chí chấm điểm vòng này</div>
            <div className="flex flex-wrap gap-2">
              {criteria.map(c => (
                <div key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)]">
                  <span className="text-[0.8rem] text-white/70 font-medium">{c.name}</span>
                  <span className="text-[0.7rem] font-bold text-[#00d4ff]">×{(c.weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pool Sections */}
        <div className="flex flex-col gap-5">
          {pools.length === 0 && (
            <div className="text-center py-10 text-white/40">
              Chưa có bảng đấu nào được tạo cho cuộc thi này.
            </div>
          )}
          {pools.map(pool => {
            const poolSubmitted = pool.teams.filter(t => scores[t.id]?.status === 'submitted').length;
            const poolScorable = pool.teams.filter(t => canScore(t.status)).length;
            return (
              <div key={pool.id} className="bg-white/[0.025] border border-white/7 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-white text-[0.95rem] m-0">{pool.name}</h2>
                    <Tag style={{ fontSize: '0.72rem' }}>{pool.teams.length} đội</Tag>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[0.75rem] text-white/40">{poolSubmitted}/{poolScorable} đã nộp</span>
                    <Progress
                      percent={poolScorable > 0 ? Math.round((poolSubmitted / poolScorable) * 100) : 0}
                      size="small" strokeColor="#00d4ff" trailColor="rgba(255,255,255,0.08)"
                      showInfo={false} style={{ width: 100 }}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  {pool.teams.map((team, ti) => {
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
                      <div
                        key={team.id}
                        className={`flex items-center justify-between px-4 py-3 gap-3 hover:bg-white/[0.02] transition-colors ${ti > 0 ? 'border-t border-white/5' : ''}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] flex items-center justify-center font-bold text-[#00d4ff] text-[0.85rem] flex-shrink-0">
                            {(team.name || '?').slice(-1)}
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
                            </div>
                          </div>
                        </div>

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
                          <Button
                            type={myScore?.status === 'submitted' ? 'default' : 'primary'}
                            size="small"
                            onClick={() => openForm(team)}
                          >
                            {myScore?.status === 'submitted' ? '✓ Xem / Sửa'
                              : myScore?.status === 'draft' ? '📝 Tiếp tục'
                              : '⚖ Chấm điểm'}
                          </Button>
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
            <div className="flex items-center gap-3 flex-wrap">
              {scoringTeam.repoUrl
                ? <a href={scoringTeam.repoUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] text-sm no-underline hover:bg-[rgba(0,212,255,0.15)]">🔗 Mở Repo</a>
                : <span className="text-sm text-white/30">Không có link repo</span>}
              {scoringTeam.slideUrl
                ? <a href={scoringTeam.slideUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.2)] text-[#a855f7] text-sm no-underline hover:bg-[rgba(168,85,247,0.15)]">📊 Mở Slide</a>
                : <span className="text-sm text-white/30">Không có slide</span>}
            </div>

            <div className="flex flex-col gap-3">
              {criteria.map(c => (
                <div key={c.id} className="bg-white/[0.02] border border-white/7 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white/85 text-[0.88rem]">{c.name}</span>
                    <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full bg-[rgba(0,212,255,0.1)] text-[#00d4ff]">×{(c.weight * 100).toFixed(0)}%</span>
                  </div>
                  {c.description && <div className="text-[0.75rem] text-white/40 mb-2.5">{c.description}</div>}
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
                trailColor="rgba(255,255,255,0.08)" size="small" showInfo={false}
              />
            </div>

            <div>
              <label className="block text-[0.75rem] font-semibold text-white/40 mb-2 uppercase tracking-wide">Nhận xét (không bắt buộc)</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/25 outline-none resize-none focus:border-[rgba(0,212,255,0.4)] transition-colors"
                rows={3}
                placeholder="Nhận xét tổng quan về đội thi..."
                value={draft.comment}
                onChange={e => setDraft(p => ({ ...p, comment: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button onClick={() => saveScore('draft')} loading={submitting}>💾 Lưu nháp</Button>
              <Button type="primary" onClick={() => saveScore('submitted')} loading={submitting} style={{ minWidth: 160 }}>
                ✓ Nộp điểm chính thức
              </Button>
            </div>

            {scores[scoringTeam?.id]?.status === 'submitted' && (
              <Alert type="success" showIcon
                message="Đội này đã có điểm chính thức. Bạn vẫn có thể sửa trước khi Admin khóa chấm điểm."
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
