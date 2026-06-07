import { useState } from 'react';
import { Select, Button, Tag, Modal, Alert, Tooltip, message } from 'antd';

const MOCK_JUDGES = [
  { id: 'j1', name: 'Dr. Nguyễn Văn An',  type: 'INTERNAL', accepted: true  },
  { id: 'j2', name: 'TS. Trần Thị Bình',  type: 'INTERNAL', accepted: false },
  { id: 'j3', name: 'Mr. Lê Văn Cường',   type: 'EXTERNAL', accepted: true  },
  { id: 'j4', name: 'Ms. Phạm Thu Dung',  type: 'EXTERNAL', accepted: true  },
  { id: 'j5', name: 'Dr. Hoàng Minh Đức', type: 'INTERNAL', accepted: false },
];

const MOCK_MENTORS = [
  { id: 'm1', name: 'ThS. Ngô Quang Hải',   specialty: 'AI & ML'  },
  { id: 'm2', name: 'TS. Vũ Thị Lan',        specialty: 'Web3'     },
  { id: 'm3', name: 'Mr. Đinh Xuân Mạnh',    specialty: 'FinTech'  },
  { id: 'm4', name: 'Ms. Bùi Thị Ngọc',      specialty: 'UI/UX'    },
];

function detectConflicts(assignments) {
  const judgePoolMap = {};
  assignments.forEach(a => {
    if (!judgePoolMap[a.judgeId]) judgePoolMap[a.judgeId] = [];
    judgePoolMap[a.judgeId].push(a.pool);
  });
  const conflicts = new Set();
  Object.entries(judgePoolMap).forEach(([jId, pools]) => {
    if (pools.length > 1) conflicts.add(jId);
  });
  return conflicts;
}

export default function JudgeAssignmentTab({ config }) {
  const tracks = config?.tracks || [];
  const rounds = tracks.flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name, trackId: t.id })));
  const pools  = tracks.flatMap(t => (t.pools  || []).map(p => ({ ...p, trackName: t.name })));

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || null);
  const [judgeAssignments, setJudgeAssignments] = useState([
    { id: 'a1', judgeId: 'j1', judgeName: 'Dr. Nguyễn Văn An',  type: 'INTERNAL', pool: 'Bảng A', assignedAt: '2026-06-01T09:00:00', accepted: true  },
    { id: 'a2', judgeId: 'j2', judgeName: 'TS. Trần Thị Bình',  type: 'INTERNAL', pool: 'Bảng A', assignedAt: '2026-06-01T09:05:00', accepted: false },
    { id: 'a3', judgeId: 'j3', judgeName: 'Mr. Lê Văn Cường',   type: 'EXTERNAL', pool: 'Bảng B', assignedAt: '2026-06-01T09:10:00', accepted: true  },
    { id: 'a4', judgeId: 'j1', judgeName: 'Dr. Nguyễn Văn An',  type: 'INTERNAL', pool: 'Bảng B', assignedAt: '2026-06-01T09:15:00', accepted: true  },
  ]);
  const [mentorAssignments, setMentorAssignments] = useState([
    { id: 'm1', mentorId: 'm1', mentorName: 'ThS. Ngô Quang Hải', specialty: 'AI & ML', pool: 'Bảng A', assignedAt: '2026-06-01T10:00:00' },
    { id: 'm2', mentorId: 'm2', mentorName: 'TS. Vũ Thị Lan',     specialty: 'Web3',    pool: 'Bảng B', assignedAt: '2026-06-01T10:05:00' },
  ]);

  const [showJudgeModal, setShowJudgeModal]   = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [newJudgeId, setNewJudgeId]           = useState(null);
  const [newJudgePool, setNewJudgePool]       = useState(null);
  const [newMentorId, setNewMentorId]         = useState(null);
  const [newMentorPool, setNewMentorPool]     = useState(null);
  const [messageApi, contextHolder]           = message.useMessage();

  const conflicts = detectConflicts(judgeAssignments);

  const poolOptions = pools.map(p => ({ value: p.name || p.id, label: p.name || p.id }));

  const willConflict = newJudgeId && judgeAssignments.some(a => a.judgeId === newJudgeId && a.pool === newJudgePool);

  const addJudge = () => {
    if (!newJudgeId || !newJudgePool) { messageApi.error('Vui lòng chọn judge và bảng!'); return; }
    const j = MOCK_JUDGES.find(j => j.id === newJudgeId);
    setJudgeAssignments(prev => [...prev, {
      id: `a${Date.now()}`, judgeId: j.id, judgeName: j.name, type: j.type,
      pool: newJudgePool, assignedAt: new Date().toISOString(), accepted: j.accepted,
    }]);
    setShowJudgeModal(false); setNewJudgeId(null); setNewJudgePool(null);
    messageApi.success('Đã phân công judge!');
  };

  const addMentor = () => {
    if (!newMentorId || !newMentorPool) { messageApi.error('Vui lòng chọn mentor và bảng!'); return; }
    const m = MOCK_MENTORS.find(m => m.id === newMentorId);
    setMentorAssignments(prev => [...prev, {
      id: `m${Date.now()}`, mentorId: m.id, mentorName: m.name, specialty: m.specialty,
      pool: newMentorPool, assignedAt: new Date().toISOString(),
    }]);
    setShowMentorModal(false); setNewMentorId(null); setNewMentorPool(null);
    messageApi.success('Đã phân công mentor!');
  };

  const removeJudge = (id) => setJudgeAssignments(prev => prev.filter(a => a.id !== id));
  const removeMentor = (id) => setMentorAssignments(prev => prev.filter(a => a.id !== id));

  return (
    <div className="p-6 space-y-8">
      {contextHolder}

      {/* Round selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Vòng thi:</span>
        <Select value={selectedRound} onChange={setSelectedRound} style={{ width: 260 }}
          placeholder="Chọn vòng thi"
          options={rounds.map(r => ({ value: r.id, label: `${r.trackName} — ${r.name}` }))}
        />
      </div>

      {/* ─── Judge section ─── */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-base font-bold m-0" style={{ color: 'var(--text-primary)' }}>
            ⚖ Danh sách Judge ({judgeAssignments.length})
          </h3>
          <Button type="primary" size="small" onClick={() => setShowJudgeModal(true)}>+ Thêm Judge</Button>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          {judgeAssignments.length === 0
            ? <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có judge nào được phân công</div>
            : judgeAssignments.map((a, idx) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 flex-wrap"
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{a.judgeName}</span>
                    {!a.accepted && <Tag color="orange" style={{ fontSize: '0.65rem' }}>Chưa accept</Tag>}
                    {conflicts.has(a.judgeId) && (
                      <Tooltip title="Judge này được phân công nhiều bảng — có thể xung đột lịch">
                        <Tag color="red" style={{ fontSize: '0.65rem', cursor: 'default' }}>⚠ Conflict</Tag>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Tag color={a.type === 'INTERNAL' ? 'blue' : 'purple'} style={{ fontSize: '0.65rem' }}>{a.type}</Tag>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Bảng: <strong>{a.pool}</strong></span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(a.assignedAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
                <Button danger size="small" onClick={() => removeJudge(a.id)}>Xóa</Button>
              </div>
            ))
          }
        </div>
      </div>

      {/* ─── Mentor section ─── */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-base font-bold m-0" style={{ color: 'var(--text-primary)' }}>
            🎯 Danh sách Mentor ({mentorAssignments.length})
          </h3>
          <Button type="primary" size="small" onClick={() => setShowMentorModal(true)}>+ Thêm Mentor</Button>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          {mentorAssignments.length === 0
            ? <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có mentor nào được phân công</div>
            : mentorAssignments.map((a, idx) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 flex-wrap"
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{a.mentorName}</span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Tag color="cyan" style={{ fontSize: '0.65rem' }}>{a.specialty}</Tag>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Bảng: <strong>{a.pool}</strong></span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(a.assignedAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
                <Button danger size="small" onClick={() => removeMentor(a.id)}>Xóa</Button>
              </div>
            ))
          }
        </div>
      </div>

      {/* Add Judge Modal */}
      <Modal title="Phân công Judge" open={showJudgeModal}
        onOk={addJudge} onCancel={() => { setShowJudgeModal(false); setNewJudgeId(null); setNewJudgePool(null); }}
        okText="Phân công" cancelText="Hủy">
        <div className="space-y-4 py-2">
          {willConflict && (
            <Alert type="warning" showIcon message="Judge này đã được phân công bảng này — sẽ tạo bản ghi trùng." />
          )}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Chọn Judge</label>
            <Select value={newJudgeId} onChange={setNewJudgeId} style={{ width: '100%' }} placeholder="Tìm judge..."
              options={MOCK_JUDGES.map(j => ({
                value: j.id,
                label: <span>{j.name} <Tag color={j.type === 'INTERNAL' ? 'blue' : 'purple'} style={{ fontSize: '0.6rem' }}>{j.type}</Tag>{!j.accepted && <Tag color="orange" style={{ fontSize: '0.6rem' }}>Chưa accept</Tag>}</span>
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Bảng đấu</label>
            <Select value={newJudgePool} onChange={setNewJudgePool} style={{ width: '100%' }}
              placeholder="Chọn bảng" options={poolOptions.length ? poolOptions : [{ value: 'Bảng A', label: 'Bảng A' }, { value: 'Bảng B', label: 'Bảng B' }]}
            />
          </div>
        </div>
      </Modal>

      {/* Add Mentor Modal */}
      <Modal title="Phân công Mentor" open={showMentorModal}
        onOk={addMentor} onCancel={() => { setShowMentorModal(false); setNewMentorId(null); setNewMentorPool(null); }}
        okText="Phân công" cancelText="Hủy">
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Chọn Mentor</label>
            <Select value={newMentorId} onChange={setNewMentorId} style={{ width: '100%' }} placeholder="Tìm mentor..."
              options={MOCK_MENTORS.map(m => ({ value: m.id, label: `${m.name} (${m.specialty})` }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Bảng đấu</label>
            <Select value={newMentorPool} onChange={setNewMentorPool} style={{ width: '100%' }}
              placeholder="Chọn bảng" options={poolOptions.length ? poolOptions : [{ value: 'Bảng A', label: 'Bảng A' }, { value: 'Bảng B', label: 'Bảng B' }]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
