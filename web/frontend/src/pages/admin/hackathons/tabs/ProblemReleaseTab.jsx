import { useState, useEffect, useRef } from 'react';
import { Select, Button, Tag, Modal, Alert, message } from 'antd';

const INIT_POOLS = [
  {
    id: 'p1', name: 'Bảng A',
    problem_released_at: null,
    teams: [
      { id: 't1', name: 'Team Alpha',   status: 'pending' },
      { id: 't2', name: 'Team Beta',    status: 'pending' },
      { id: 't3', name: 'Team Gamma',   status: 'pending' },
    ],
  },
  {
    id: 'p2', name: 'Bảng B',
    problem_released_at: null,
    teams: [
      { id: 't4', name: 'Team Delta',   status: 'pending' },
      { id: 't5', name: 'Team Epsilon', status: 'pending' },
    ],
  },
  {
    id: 'p3', name: 'Bảng C',
    problem_released_at: null,
    teams: [
      { id: 't6', name: 'Team Zeta',    status: 'pending' },
      { id: 't7', name: 'Team Eta',     status: 'pending' },
      { id: 't8', name: 'Team Theta',   status: 'pending' },
    ],
  },
];

const TEAM_STATUS_CFG = {
  pending:       { label: 'Chờ nộp',       color: 'default' },
  on_time:       { label: 'Đúng giờ',      color: 'green'   },
  late:          { label: 'Nộp trễ',       color: 'orange'  },
  not_submitted: { label: 'Không nộp',     color: 'red'     },
  abandoned:     { label: 'Bỏ cuộc',       color: 'red'     },
};

function CountdownTimer({ releasedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!releasedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(releasedAt)) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [releasedAt]);

  if (!releasedAt) return null;

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = n => String(n).padStart(2, '0');
  const isLate = elapsed > 3600;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-bold" style={{ color: isLate ? '#f87171' : '#10b981' }}>
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
      {isLate && <Tag color="red" style={{ fontSize: '0.65rem' }}>⚠ TRỄ GIỜ</Tag>}
    </div>
  );
}

export default function ProblemReleaseTab({ config }) {
  const tracks = config?.tracks || [];
  const rounds = tracks.flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name })));

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || null);
  const [pools, setPools] = useState(INIT_POOLS);
  const [confirmPool, setConfirmPool] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  const doRelease = () => {
    setPools(prev => prev.map(p =>
      p.id === confirmPool.id ? { ...p, problem_released_at: new Date().toISOString() } : p
    ));
    setConfirmPool(null);
    messageApi.success(`Đã phát đề cho ${confirmPool.name}!`);
  };

  return (
    <div className="p-6 space-y-6">
      {contextHolder}

      <div>
        <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-primary)' }}>Phát Đề Bài</h2>
        <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
          Khi phát đề, hệ thống ghi nhận <code>problem_released_at</code>. Bài nộp sau 60 phút sẽ bị đánh dấu TRỄGIỜ.
        </p>
      </div>

      {/* Round selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Vòng thi:</span>
        <Select value={selectedRound} onChange={setSelectedRound} style={{ width: 260 }}
          options={rounds.length ? rounds.map(r => ({ value: r.id, label: `${r.trackName} — ${r.name}` }))
            : [{ value: 'demo', label: 'Vòng Ý Tưởng (demo)' }]}
        />
      </div>

      {/* Pool cards */}
      <div className="space-y-4">
        {pools.map(pool => {
          const released = !!pool.problem_released_at;
          return (
            <div key={pool.id} className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--bg-card)', borderColor: released ? 'rgba(16,185,129,0.3)' : 'var(--border)' }}>
              {/* Pool header */}
              <div className="flex items-center justify-between px-5 py-4 gap-3 flex-wrap"
                style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>{pool.name}</h3>
                  {released
                    ? <Tag color="green" style={{ fontSize: '0.7rem' }}>✓ Đã phát đề</Tag>
                    : <Tag color="default" style={{ fontSize: '0.7rem' }}>Chưa phát đề</Tag>
                  }
                </div>
                <div className="flex items-center gap-3">
                  {released && (
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Phát lúc: {new Date(pool.problem_released_at).toLocaleString('vi-VN')}
                    </div>
                  )}
                  <CountdownTimer releasedAt={pool.problem_released_at} />
                  {!released
                    ? <Button type="primary" size="small" onClick={() => setConfirmPool(pool)}>📤 Phát đề</Button>
                    : <Button size="small" disabled>Đã phát</Button>
                  }
                </div>
              </div>

              {/* Team list */}
              <div>
                {pool.teams.map((team, idx) => {
                  const sc = TEAM_STATUS_CFG[team.status];
                  return (
                    <div key={team.id} className="flex items-center justify-between px-5 py-2.5"
                      style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{team.name}</span>
                      <Tag color={sc.color} style={{ fontSize: '0.65rem' }}>{sc.label}</Tag>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Modal */}
      <Modal title="📤 Xác nhận phát đề"
        open={!!confirmPool} onOk={doRelease} onCancel={() => setConfirmPool(null)}
        okText="Phát đề ngay" cancelText="Hủy">
        <div className="py-2">
          <Alert type="warning" showIcon
            message={`Phát đề cho "${confirmPool?.name}"`}
            description="Sau khi phát, hệ thống ghi nhận problem_released_at. Bài nộp sau 60 phút sẽ bị đánh dấu TRỄGIỜ. Hành động không thể hoàn tác."
          />
        </div>
      </Modal>
    </div>
  );
}
