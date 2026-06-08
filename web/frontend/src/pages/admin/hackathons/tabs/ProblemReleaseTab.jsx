import { useState, useEffect, useRef, useCallback } from 'react';
import { Select, Button, Tag, Modal, Alert, message, Spin } from 'antd';
import { useApi } from '../../../../hooks/useApi';

const TEAM_STATUS_CFG = {
  pending:       { label: 'Chờ nộp',       color: 'default' },
  on_time:       { label: 'Đúng giờ',      color: 'green'   },
  late:          { label: 'Nộp trễ',       color: 'orange'  },
  not_submitted: { label: 'Không nộp',     color: 'red'     },
  abandoned:     { label: 'Bỏ cuộc',       color: 'red'     },
};

// Map backend submission status → display status
const mapSubStatus = (s) => {
  if (!s) return 'pending';
  const m = { SUBMITTED: 'on_time', LATE: 'late', LATE_PENDING: 'late', APPROVED: 'on_time', REJECTED: 'not_submitted' };
  return m[s] || 'pending';
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

export default function ProblemReleaseTab({ config, contestId, contest }) {
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const rounds = contest?.rounds
    ? contest.rounds.map(r => ({ id: r._id, name: r.name, problem_released_at: r.problem_released_at }))
    : (config?.tracks || []).flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name })));

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || null);
  const [pools, setPools] = useState([]);
  const [teamSubmissions, setTeamSubmissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirmPool, setConfirmPool] = useState(null);
  const [releasing, setReleasing] = useState(false);

  // Track which rounds have been released (problem_released_at)
  const [releasedRounds, setReleasedRounds] = useState(() => {
    const map = {};
    (contest?.rounds || []).forEach(r => {
      if (r.problem_released_at) map[r._id] = r.problem_released_at;
    });
    return map;
  });

  const currentRound = rounds.find(r => r.id === selectedRound);

  const fetchData = useCallback(async (rid) => {
    if (!contestId || !rid) return;
    setLoading(true);
    try {
      const [poolsData, subsData] = await Promise.all([
        request(`/api/pools/contests/${contestId}/pools`),
        request(`/api/submissions?round_id=${rid}`),
      ]);
      const poolList = Array.isArray(poolsData) ? poolsData : (poolsData?.data ?? []);
      const subList = Array.isArray(subsData) ? subsData : (subsData?.data ?? []);

      // Build team → submission status map
      const subMap = {};
      subList.forEach(sub => {
        const tid = (sub.team_id?._id || sub.team_id)?.toString();
        if (tid) subMap[tid] = mapSubStatus(sub.status);
      });
      setTeamSubmissions(subMap);
      setPools(poolList);
    } catch {
      messageApi.error('Không thể tải dữ liệu bảng đấu');
    } finally {
      setLoading(false);
    }
  }, [contestId, request]);

  useEffect(() => {
    if (selectedRound) fetchData(selectedRound);
  }, [selectedRound, fetchData]);

  const doRelease = async () => {
    if (!confirmPool || !selectedRound) return;
    setReleasing(true);
    try {
      await request(`/api/contests/${contestId}/rounds/${selectedRound}/release-problem`, { method: 'POST' });
      const now = new Date().toISOString();
      setReleasedRounds(prev => ({ ...prev, [selectedRound]: now }));
      setConfirmPool(null);
      messageApi.success(`Đã phát đề cho vòng ${currentRound?.name}!`);
    } catch (e) {
      messageApi.error(e.message || 'Không thể phát đề');
    } finally {
      setReleasing(false);
    }
  };

  const releasedAt = releasedRounds[selectedRound] || currentRound?.problem_released_at;

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
          options={rounds.map(r => ({ value: r.id, label: r.trackName ? `${r.trackName} — ${r.name}` : r.name }))}
        />
      </div>

      {/* Release status for current round */}
      {releasedAt ? (
        <Alert type="success" showIcon
          message={`✓ Đã phát đề lúc: ${new Date(releasedAt).toLocaleString('vi-VN')}`}
          description={<CountdownTimer releasedAt={releasedAt} />}
        />
      ) : (
        <div className="flex items-center gap-3">
          <Alert type="info" showIcon message="Đề chưa được phát cho vòng này." style={{ flex: 1 }} />
          <Button type="primary" onClick={() => setConfirmPool(true)}>📤 Phát đề ngay</Button>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}

      {/* Pool cards */}
      {!loading && (
        <div className="space-y-4">
          {pools.length === 0 && (
            <div className="p-8 text-center text-sm rounded-xl border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
              Chưa có bảng đấu nào
            </div>
          )}
          {pools.map(pool => {
            const released = !!releasedAt;
            const teams = pool.teams || [];
            return (
              <div key={pool._id} className="rounded-xl border overflow-hidden"
                style={{ background: 'var(--bg-card)', borderColor: released ? 'rgba(16,185,129,0.3)' : 'var(--border)' }}>
                {/* Pool header */}
                <div className="flex items-center justify-between px-5 py-4 gap-3 flex-wrap"
                  style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>{pool.pool_name}</h3>
                    {released
                      ? <Tag color="green" style={{ fontSize: '0.7rem' }}>✓ Đã phát đề</Tag>
                      : <Tag color="default" style={{ fontSize: '0.7rem' }}>Chưa phát đề</Tag>
                    }
                  </div>
                  <div className="flex items-center gap-3">
                    {released && <CountdownTimer releasedAt={releasedAt} />}
                  </div>
                </div>

                {/* Team list */}
                <div>
                  {teams.length === 0 && (
                    <div className="px-5 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có đội trong bảng</div>
                  )}
                  {teams.map((team, idx) => {
                    const tid = (team._id || team)?.toString();
                    const status = teamSubmissions[tid] || 'pending';
                    const sc = TEAM_STATUS_CFG[status];
                    return (
                      <div key={tid} className="flex items-center justify-between px-5 py-2.5"
                        style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {team.team_name || tid}
                        </span>
                        <Tag color={sc.color} style={{ fontSize: '0.65rem' }}>{sc.label}</Tag>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Modal */}
      <Modal title="📤 Xác nhận phát đề"
        open={!!confirmPool} onOk={doRelease} onCancel={() => setConfirmPool(null)}
        okText="Phát đề ngay" cancelText="Hủy" confirmLoading={releasing}>
        <div className="py-2">
          <Alert type="warning" showIcon
            message={`Phát đề cho vòng "${currentRound?.name}"`}
            description="Sau khi phát, hệ thống ghi nhận problem_released_at. Bài nộp sau 60 phút sẽ bị đánh dấu TRỄGIỜ. Hành động không thể hoàn tác."
          />
        </div>
      </Modal>
    </div>
  );
}
