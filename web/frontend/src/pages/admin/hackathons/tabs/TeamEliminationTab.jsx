import { useState } from 'react';
import { Button, Tag, Modal, Input, Alert, Table, message } from 'antd';

const { TextArea } = Input;

const INIT_TEAMS = [
  { id: 't1', name: 'Team Alpha',   pool: 'Bảng A', track: 'AI & ML',    score: 91.5, eliminated: false, violation: null, eliminatedAt: null },
  { id: 't2', name: 'Team Beta',    pool: 'Bảng A', track: 'AI & ML',    score: 87.2, eliminated: false, violation: null, eliminatedAt: null },
  { id: 't3', name: 'Team Gamma',   pool: 'Bảng B', track: 'AI & ML',    score: 85.0, eliminated: false, violation: null, eliminatedAt: null },
  { id: 't4', name: 'Team Delta',   pool: 'Bảng B', track: 'Web3',       score: 82.3, eliminated: false, violation: null, eliminatedAt: null },
  { id: 't5', name: 'Team Epsilon', pool: 'Bảng C', track: 'Web3',       score: 79.8, eliminated: false, violation: null, eliminatedAt: null },
  { id: 't6', name: 'Team Zeta',    pool: 'Bảng C', track: 'Web3',       score: 77.1, eliminated: false, violation: null, eliminatedAt: null },
  { id: 't7', name: 'Team Eta',     pool: 'Bảng A', track: 'AI & ML',    score: 74.5, eliminated: false, violation: null, eliminatedAt: null },
  { id: 't8', name: 'Team Theta',   pool: 'Bảng B', track: 'AI & ML',    score: 71.0, eliminated: false, violation: null, eliminatedAt: null },
];

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_COLOR = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

function rankedActive(teams) {
  return teams
    .filter(t => !t.eliminated)
    .sort((a, b) => b.score - a.score)
    .map((t, i) => ({ ...t, rank: i + 1 }));
}

export default function TeamEliminationTab() {
  const [teams, setTeams]       = useState(INIT_TEAMS);
  const [target, setTarget]     = useState(null);
  const [reason, setReason]     = useState('');
  const [auditLog, setAuditLog] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const ranked   = rankedActive(teams);
  const eliminated = teams.filter(t => t.eliminated);

  const doEliminate = () => {
    if (!reason.trim()) { messageApi.error('Vui lòng nhập lý do vi phạm!'); return; }
    const now = new Date().toISOString();
    setTeams(prev => prev.map(t =>
      t.id === target.id ? { ...t, eliminated: true, violation: reason, eliminatedAt: now } : t
    ));
    setAuditLog(prev => [...prev, { teamId: target.id, teamName: target.name, reason, eliminatedAt: now, performedBy: 'Admin' }]);
    setTarget(null); setReason('');
    messageApi.success(`Đã loại "${target.name}"! Leaderboard đã cập nhật.`);
  };

  const doRestore = (teamId, teamName) => {
    Modal.confirm({
      title: `Khôi phục "${teamName}"?`,
      content: 'Đội sẽ được đưa trở lại leaderboard và xếp hạng lại tự động.',
      okText: 'Khôi phục', cancelText: 'Hủy',
      onOk: () => {
        setTeams(prev => prev.map(t =>
          t.id === teamId ? { ...t, eliminated: false, violation: null, eliminatedAt: null } : t
        ));
        messageApi.success('Đã khôi phục đội!');
      },
    });
  };

  const lbColumns = [
    {
      title: 'Hạng', dataIndex: 'rank', width: 70,
      render: rank => (
        <div className="flex items-center justify-center w-9 h-9 rounded-full font-bold"
          style={{ background: MEDAL_COLOR[rank] ? `${MEDAL_COLOR[rank]}22` : 'transparent', color: MEDAL_COLOR[rank] || 'var(--text-secondary)', fontSize: rank <= 3 ? '1.1rem' : '0.9rem' }}>
          {MEDAL[rank] || `#${rank}`}
        </div>
      ),
    },
    {
      title: 'Đội thi', key: 'team',
      render: (_, r) => (
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{r.name}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.pool} · {r.track}</div>
        </div>
      ),
    },
    {
      title: 'Điểm số', dataIndex: 'score',
      render: s => <span className="font-bold text-base" style={{ color: 'var(--cyan)' }}>{s.toFixed(1)}</span>,
    },
    {
      title: 'Thao tác', key: 'action',
      render: (_, r) => (
        <Button danger size="small" onClick={() => { setTarget(r); setReason(''); }}>⛔ Loại đội</Button>
      ),
    },
  ];

  const auditColumns = [
    { title: 'Đội', dataIndex: 'teamName', render: n => <span className="font-bold">{n}</span> },
    { title: 'Lý do vi phạm', dataIndex: 'reason' },
    { title: 'Thời gian', dataIndex: 'eliminatedAt', render: d => new Date(d).toLocaleString('vi-VN') },
    { title: 'Thực hiện bởi', dataIndex: 'performedBy' },
  ];

  return (
    <div className="p-6 space-y-6">
      {contextHolder}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-primary)' }}>Leaderboard & Loại đội vi phạm</h2>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
            Chọn đội và nhập lý do vi phạm để loại. Leaderboard tự cập nhật sau mỗi lần ELIMINATE.
          </p>
        </div>
        {auditLog.length > 0 && (
          <Button onClick={() => setShowAudit(true)}>📋 Audit Log ({auditLog.length})</Button>
        )}
      </div>

      {/* Active leaderboard */}
      <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>
            🏆 Leaderboard hiện tại ({ranked.length} đội)
          </h3>
          <Tag color="green" style={{ fontSize: '0.7rem' }}>Tự cập nhật sau ELIMINATE</Tag>
        </div>
        <Table dataSource={ranked} columns={lbColumns} rowKey="id" size="small" pagination={false}
          locale={{ emptyText: 'Không còn đội nào trong leaderboard' }} />
      </div>

      {/* Eliminated teams */}
      {eliminated.length > 0 && (
        <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-bold m-0" style={{ color: '#f87171' }}>⛔ Đội bị loại ({eliminated.length})</h3>
          </div>
          {eliminated.map((team, idx) => (
            <div key={team.id} className="p-4 flex items-center justify-between gap-4"
              style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-sm" style={{ color: '#f87171' }}>{team.name}</span>
                  <Tag color="red">ELIMINATED</Tag>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{team.pool} · {team.track}</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Lý do: {team.violation}
                  {team.eliminatedAt && <span> · {new Date(team.eliminatedAt).toLocaleString('vi-VN')}</span>}
                </div>
              </div>
              <Button size="small" onClick={() => doRestore(team.id, team.name)}>Khôi phục</Button>
            </div>
          ))}
        </div>
      )}

      {/* Eliminate Modal */}
      <Modal title="⛔ Loại đội vi phạm" open={!!target}
        onOk={doEliminate} onCancel={() => { setTarget(null); setReason(''); }}
        okText="Xác nhận loại đội" okButtonProps={{ danger: true }} cancelText="Hủy">
        <div className="space-y-4 py-2">
          <Alert type="error" showIcon
            message={`Loại "${target?.name}" khỏi giải đấu`}
            description="Đội sẽ bị loại vĩnh viễn. Leaderboard sẽ được xếp hạng lại ngay lập tức. Hành động có thể khôi phục bằng nút 'Khôi phục'."
          />
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              Lý do vi phạm * <span style={{ color: '#f87171' }}>(bắt buộc)</span>
            </label>
            <TextArea rows={3} placeholder="Gian lận, vi phạm quy chế, sử dụng tài nguyên bên ngoài..."
              value={reason} onChange={e => setReason(e.target.value)}
              status={!reason.trim() ? 'error' : ''} />
            {!reason.trim() && <p className="text-xs mt-1 m-0" style={{ color: '#f87171' }}>Lý do vi phạm là bắt buộc</p>}
          </div>
        </div>
      </Modal>

      {/* Audit Log Modal */}
      <Modal title="📋 Audit Log — Lịch sử loại đội"
        open={showAudit} onCancel={() => setShowAudit(false)} footer={null} width={700}>
        <Table dataSource={auditLog} columns={auditColumns} rowKey={(_, i) => i}
          size="small" pagination={false} />
      </Modal>
    </div>
  );
}
