import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Tag, Modal, Input, Alert, Progress, message, Spin } from 'antd';
import { useApi } from '../../../../hooks/useApi';

const { TextArea } = Input;

export default function ScoringLockTab({ config, contestId, contest }) {
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const rounds = contest?.rounds
    ? contest.rounds.map(r => ({ id: r._id, name: r.name, scoring_locked: r.scoring_locked, force_lock_reason: r.force_lock_reason }))
    : (config?.tracks || []).flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name })));

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || null);
  const [judgeProgress, setJudgeProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lockedRounds, setLockedRounds] = useState(() => {
    const map = {};
    (contest?.rounds || []).forEach(r => {
      if (r.scoring_locked) {
        map[r._id] = { type: r.force_lock_reason ? 'force' : 'normal', reason: r.force_lock_reason || null, lockedAt: r.updated_at };
      }
    });
    return map;
  });

  const [showForce, setShowForce] = useState(false);
  const [forceReason, setForceReason] = useState('');
  const [showAudit, setShowAudit] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [locking, setLocking] = useState(false);

  const fetchProgress = useCallback(async (rid) => {
    if (!contestId || !rid) return;
    setLoading(true);
    try {
      const data = await request(`/api/contests/${contestId}/rounds/${rid}/judge-completion`);
      const judges = Array.isArray(data?.data) ? data.data : [];
      setJudgeProgress(judges.map(j => ({
        judgeId: j.judge_id,
        name: j.judge_name || '—',
        type: 'INTERNAL',
        scored: j.scored || 0,
        total: j.total || 0,
      })));
    } catch {
      // Fallback to aggregate progress
      try {
        const progress = await request(`/api/scores/contests/${contestId}/rounds/${rid}/progress`);
        if (progress) {
          setJudgeProgress([{
            judgeId: 'aggregate',
            name: 'Tổng cộng',
            type: 'AGGREGATE',
            scored: progress.done || 0,
            total: progress.total || 0,
          }]);
        }
      } catch {
        setJudgeProgress([]);
      }
    } finally {
      setLoading(false);
    }
  }, [contestId, request]);

  useEffect(() => {
    if (selectedRound) fetchProgress(selectedRound);
  }, [selectedRound, fetchProgress]);

  const allDone = judgeProgress.length > 0 && judgeProgress.every(j => j.scored >= j.total && j.total > 0);
  const totalScored = judgeProgress.reduce((s, j) => s + j.scored, 0);
  const totalPossible = judgeProgress.reduce((s, j) => s + j.total, 0);
  const overallPct = totalPossible > 0 ? Math.round((totalScored / totalPossible) * 100) : 0;
  const isLocked = !!lockedRounds[selectedRound];
  const currentRound = rounds.find(r => r.id === selectedRound);

  const doLock = async (force = false) => {
    if (force && !forceReason.trim()) { messageApi.error('Vui lòng nhập lý do force-lock!'); return; }
    setLocking(true);
    try {
      const body = force
        ? { force: true, force_lock_reason: forceReason }
        : { force: false };
      const result = await request(`/api/contests/${contestId}/rounds/${selectedRound}/lock-scoring`, {
        method: 'POST',
        body,
      });
      const now = new Date().toISOString();
      const entry = {
        id: Date.now(),
        roundName: currentRound?.name || selectedRound,
        lockedAt: now,
        lockedBy: 'Admin',
        type: force ? 'force' : 'normal',
        reason: force ? forceReason : null,
      };
      setLockedRounds(prev => ({ ...prev, [selectedRound]: entry }));
      setAuditLog(prev => [...prev, entry]);
      if (force) { setShowForce(false); setForceReason(''); }
      messageApi.success(force ? '⚠ Force-lock đã được áp dụng!' : '✓ Đã khóa chấm điểm!');
    } catch (e) {
      messageApi.error(e.message || 'Không thể khóa chấm điểm');
    } finally {
      setLocking(false);
    }
  };

  const doNormalLock = () => {
    Modal.confirm({
      title: '🔒 Khóa chấm điểm',
      content: `Khóa vòng "${currentRound?.name || selectedRound}"? Sau khi khóa, judge không thể sửa điểm.`,
      okText: 'Khóa chính thức', cancelText: 'Hủy',
      onOk: () => doLock(false),
    });
  };

  const doForceLock = () => {
    if (!forceReason.trim()) { messageApi.error('Vui lòng nhập lý do force-lock!'); return; }
    doLock(true);
  };

  return (
    <div className="p-6 space-y-6">
      {contextHolder}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-primary)' }}>Khóa Chấm Điểm</h2>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
            Lock bình thường chỉ khả dụng khi tất cả judge hoàn thành. Force-lock cho phép khóa sớm.
          </p>
        </div>
        <Button size="small" onClick={() => setShowAudit(true)}>📋 Audit Log ({auditLog.length})</Button>
      </div>

      {/* Round selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Vòng thi:</span>
        <Select value={selectedRound} onChange={v => { setSelectedRound(v); setJudgeProgress([]); }} style={{ width: 260 }}
          options={rounds.map(r => ({ value: r.id, label: r.trackName ? `${r.trackName} — ${r.name}` : r.name }))}
        />
      </div>

      {/* Lock status banner */}
      {isLocked && (
        <Alert
          type={lockedRounds[selectedRound].type === 'force' ? 'warning' : 'success'}
          showIcon
          message={`${lockedRounds[selectedRound].type === 'force' ? '⚠ Force-locked' : '✓ Đã khóa chính thức'} — ${lockedRounds[selectedRound].lockedAt ? new Date(lockedRounds[selectedRound].lockedAt).toLocaleString('vi-VN') : ''}`}
          description={lockedRounds[selectedRound].reason ? `Lý do: ${lockedRounds[selectedRound].reason}` : undefined}
        />
      )}

      {/* Overall progress */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
      ) : (
        <div className="rounded-xl border p-4 space-y-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Tiến độ tổng</span>
            <span className="text-sm font-bold" style={{ color: allDone ? '#10b981' : 'var(--cyan)' }}>
              {totalScored}/{totalPossible} lượt chấm
            </span>
          </div>
          <Progress percent={overallPct} strokeColor={allDone ? '#10b981' : '#00d4ff'} trailColor="rgba(255,255,255,0.08)" />
        </div>
      )}

      {/* Per-judge progress */}
      {!loading && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>Tiến độ từng Judge</h3>
          </div>
          {judgeProgress.length === 0 && (
            <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu chấm điểm cho vòng này</div>
          )}
          {judgeProgress.map((j, idx) => {
            const pct = j.total > 0 ? Math.round((j.scored / j.total) * 100) : 0;
            const done = j.scored >= j.total && j.total > 0;
            return (
              <div key={j.judgeId} className="flex items-center gap-4 px-4 py-3 flex-wrap"
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--cyan)' }}>
                  {(j.name || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{j.name}</span>
                    {j.type !== 'AGGREGATE' && (
                      <Tag color={j.type === 'INTERNAL' ? 'blue' : 'purple'} style={{ fontSize: '0.65rem' }}>{j.type}</Tag>
                    )}
                    <Tag color={done ? 'green' : 'orange'} style={{ fontSize: '0.65rem' }}>{done ? '✓ Hoàn thành' : 'Chưa xong'}</Tag>
                  </div>
                  <Progress percent={pct} size="small" strokeColor={done ? '#10b981' : '#f59e0b'}
                    trailColor="rgba(255,255,255,0.08)" format={() => `${j.scored}/${j.total}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      {!isLocked && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="primary"
            disabled={!allDone || judgeProgress.length === 0}
            onClick={doNormalLock}
            loading={locking}
            title={!allDone ? 'Chờ tất cả judge hoàn thành' : ''}
          >
            🔒 Khóa chấm điểm
          </Button>
          {!allDone && judgeProgress.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              (Disabled — còn {judgeProgress.filter(j => j.scored < j.total).length} judge chưa hoàn thành)
            </span>
          )}
          <Button danger onClick={() => { setShowForce(true); setForceReason(''); }}>
            ⚡ Force-lock
          </Button>
        </div>
      )}

      {/* Force-lock Modal */}
      <Modal title="⚡ Force-lock chấm điểm" open={showForce}
        onOk={doForceLock} onCancel={() => setShowForce(false)}
        okText="Force-lock" okButtonProps={{ danger: true }} cancelText="Hủy" confirmLoading={locking}>
        <div className="space-y-3 py-2">
          <Alert type="error" showIcon
            message="Force-lock sẽ khóa ngay lập tức"
            description="Một số judge chưa hoàn thành chấm điểm. Điểm của các đội chưa được chấm đầy đủ sẽ bị tính thiếu."
          />
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Lý do force-lock * <span style={{ color: '#f87171' }}>(bắt buộc)</span>
            </label>
            <TextArea rows={3} value={forceReason} onChange={e => setForceReason(e.target.value)}
              status={!forceReason.trim() ? 'error' : ''}
              placeholder="Nhập lý do (hết thời gian, judge vắng mặt, tình huống khẩn cấp...)..." />
            {!forceReason.trim() && <p className="text-xs mt-1" style={{ color: '#f87171' }}>Lý do là bắt buộc</p>}
          </div>
        </div>
      </Modal>

      {/* Audit Log Modal */}
      <Modal title="📋 Audit Log — Lịch sử khóa chấm điểm"
        open={showAudit} onCancel={() => setShowAudit(false)} footer={null} width={640}>
        <div className="space-y-2 py-2">
          {auditLog.length === 0 && <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có lịch sử trong phiên này</p>}
          {auditLog.map(entry => (
            <div key={entry.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{entry.roundName}</span>
                <Tag color={entry.type === 'force' ? 'red' : 'green'} style={{ fontSize: '0.65rem' }}>
                  {entry.type === 'force' ? 'Force-lock' : 'Normal'}
                </Tag>
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {new Date(entry.lockedAt).toLocaleString('vi-VN')} — {entry.lockedBy}
              </div>
              {entry.reason && <div className="text-xs mt-1" style={{ color: '#f59e0b' }}>Lý do: {entry.reason}</div>}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
