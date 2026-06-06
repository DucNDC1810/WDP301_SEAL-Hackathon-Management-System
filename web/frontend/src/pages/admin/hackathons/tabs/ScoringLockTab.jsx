import { useState } from 'react';
import { Select, Button, Tag, Modal, Input, Alert, Progress, message } from 'antd';

const { TextArea } = Input;

const MOCK_PROGRESS = {
  r1: [
    { judgeId: 'j1', name: 'Dr. Nguyễn Văn An',  type: 'INTERNAL', scored: 3, total: 3 },
    { judgeId: 'j2', name: 'TS. Trần Thị Bình',  type: 'INTERNAL', scored: 2, total: 3 },
    { judgeId: 'j3', name: 'Mr. Lê Văn Cường',   type: 'EXTERNAL', scored: 3, total: 3 },
  ],
  r2: [
    { judgeId: 'j1', name: 'Dr. Nguyễn Văn An',  type: 'INTERNAL', scored: 0, total: 2 },
    { judgeId: 'j4', name: 'Ms. Phạm Thu Dung',  type: 'EXTERNAL', scored: 0, total: 2 },
  ],
};

const AUDIT_INIT = [
  { id: 1, roundName: 'Vòng Thử nghiệm', lockedAt: '2026-05-20T15:00:00', lockedBy: 'Admin', type: 'normal', reason: null },
];

export default function ScoringLockTab({ config }) {
  const tracks = config?.tracks || [];
  const rounds = tracks.flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name })));

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || 'r1');
  const [locked, setLocked]               = useState({});
  const [showForce, setShowForce]         = useState(false);
  const [forceReason, setForceReason]     = useState('');
  const [auditLog, setAuditLog]           = useState(AUDIT_INIT);
  const [showAudit, setShowAudit]         = useState(false);
  const [messageApi, contextHolder]       = message.useMessage();

  const judgeProgress = MOCK_PROGRESS[selectedRound] || [];
  const allDone = judgeProgress.length > 0 && judgeProgress.every(j => j.scored >= j.total);
  const totalScored = judgeProgress.reduce((s, j) => s + j.scored, 0);
  const totalPossible = judgeProgress.reduce((s, j) => s + j.total, 0);
  const overallPct = totalPossible > 0 ? Math.round((totalScored / totalPossible) * 100) : 0;
  const isLocked = !!locked[selectedRound];
  const currentRound = rounds.find(r => r.id === selectedRound);

  const doNormalLock = () => {
    Modal.confirm({
      title: '🔒 Khóa chấm điểm',
      content: `Khóa vòng "${currentRound?.name || selectedRound}"? Sau khi khóa, judge không thể sửa điểm.`,
      okText: 'Khóa chính thức',
      cancelText: 'Hủy',
      onOk: () => {
        const entry = { id: Date.now(), roundName: currentRound?.name || selectedRound, lockedAt: new Date().toISOString(), lockedBy: 'Admin', type: 'normal', reason: null };
        setLocked(prev => ({ ...prev, [selectedRound]: entry }));
        setAuditLog(prev => [...prev, entry]);
        messageApi.success('✓ Đã khóa chấm điểm!');
      },
    });
  };

  const doForceLock = () => {
    if (!forceReason.trim()) { messageApi.error('Vui lòng nhập lý do force-lock!'); return; }
    const entry = { id: Date.now(), roundName: currentRound?.name || selectedRound, lockedAt: new Date().toISOString(), lockedBy: 'Admin', type: 'force', reason: forceReason };
    setLocked(prev => ({ ...prev, [selectedRound]: entry }));
    setAuditLog(prev => [...prev, entry]);
    setShowForce(false);
    setForceReason('');
    messageApi.warning('⚠ Force-lock đã được áp dụng!');
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
        <Select value={selectedRound} onChange={setSelectedRound} style={{ width: 260 }}
          options={rounds.length
            ? rounds.map(r => ({ value: r.id, label: `${r.trackName} — ${r.name}` }))
            : [{ value: 'r1', label: 'Vòng Ý Tưởng (demo)' }, { value: 'r2', label: 'Vòng Prototype (demo)' }]}
        />
      </div>

      {/* Lock status banner */}
      {isLocked && (
        <Alert
          type={locked[selectedRound].type === 'force' ? 'warning' : 'success'}
          showIcon
          message={`${locked[selectedRound].type === 'force' ? '⚠ Force-locked' : '✓ Đã khóa chính thức'} — ${new Date(locked[selectedRound].lockedAt).toLocaleString('vi-VN')}`}
          description={locked[selectedRound].reason ? `Lý do: ${locked[selectedRound].reason}` : undefined}
        />
      )}

      {/* Overall progress */}
      <div className="rounded-xl border p-4 space-y-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Tiến độ tổng</span>
          <span className="text-sm font-bold" style={{ color: allDone ? '#10b981' : 'var(--cyan)' }}>
            {totalScored}/{totalPossible} lượt chấm
          </span>
        </div>
        <Progress percent={overallPct} strokeColor={allDone ? '#10b981' : '#00d4ff'} trailColor="rgba(255,255,255,0.08)" />
      </div>

      {/* Per-judge progress */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>Tiến độ từng Judge</h3>
        </div>
        {judgeProgress.length === 0 && (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu chấm điểm cho vòng này</div>
        )}
        {judgeProgress.map((j, idx) => {
          const pct = j.total > 0 ? Math.round((j.scored / j.total) * 100) : 0;
          const done = j.scored >= j.total;
          return (
            <div key={j.judgeId} className="flex items-center gap-4 px-4 py-3 flex-wrap"
              style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--cyan)' }}>
                {j.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{j.name}</span>
                  <Tag color={j.type === 'INTERNAL' ? 'blue' : 'purple'} style={{ fontSize: '0.65rem' }}>{j.type}</Tag>
                  <Tag color={done ? 'green' : 'orange'} style={{ fontSize: '0.65rem' }}>{done ? '✓ Hoàn thành' : 'Chưa xong'}</Tag>
                </div>
                <Progress percent={pct} size="small" strokeColor={done ? '#10b981' : '#f59e0b'}
                  trailColor="rgba(255,255,255,0.08)" format={() => `${j.scored}/${j.total}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      {!isLocked && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="primary"
            disabled={!allDone || judgeProgress.length === 0}
            onClick={doNormalLock}
            title={!allDone ? 'Chờ tất cả judge hoàn thành' : ''}
          >
            🔒 Khóa chấm điểm
          </Button>
          {!allDone && (
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
        okText="Force-lock" okButtonProps={{ danger: true }} cancelText="Hủy">
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
          {auditLog.length === 0 && <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có lịch sử</p>}
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
