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

function CountdownTimer({ deadline, allSubmitted }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!deadline || allSubmitted) return;
    const tick = () => {
      const diff = Math.floor((new Date(deadline) - Date.now()) / 1000);
      setTimeLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, allSubmitted]);

  if (!deadline) return null;

  if (allSubmitted) {
    return (
      <div className="flex items-center gap-2">
        <Tag color="green" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>✓ ĐÃ HOÀN THÀNH NỘP BÀI</Tag>
      </div>
    );
  }

  const isOverdue = timeLeft <= 0;
  const absoluteTime = Math.abs(timeLeft);

  const h = Math.floor(absoluteTime / 3600);
  const m = Math.floor((absoluteTime % 3600) / 60);
  const s = absoluteTime % 60;
  const pad = n => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-bold animate-pulse" style={{ color: isOverdue ? '#ef4444' : '#10b981' }}>
        {isOverdue ? '-' : ''}{pad(h)}:{pad(m)}:{pad(s)}
      </span>
      {isOverdue ? (
        <Tag color="red" style={{ fontSize: '0.65rem' }}>⚠ QUÁ HẠN</Tag>
      ) : (
        <Tag color="green" style={{ fontSize: '0.65rem' }}>⏳ CÒN LẠI</Tag>
      )}
    </div>
  );
}

export default function ProblemReleaseTab({ config, contestId, contest }) {
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const rounds = contest?.rounds
    ? contest.rounds.map(r => ({
        id: r._id,
        name: r.name,
        is_active: r.is_active,
        problem_released_at: r.problem_released_at,
        submission_deadline: r.submission_deadline
      }))
    : (config?.tracks || []).flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name, is_active: r.is_active || r.active })));

  const [selectedRound, setSelectedRound] = useState(null);

  useEffect(() => {
    if (rounds.length) {
      const activeRounds = contest?.rounds ? contest.rounds.filter(r => r.is_active) : [];
      const defaultId = activeRounds[0]?._id || rounds[0]?.id || rounds[0]?._id;
      if (!selectedRound || !rounds.some(r => (r.id || r._id) === selectedRound)) {
        setSelectedRound(defaultId);
      }
    } else {
      setSelectedRound(null);
    }
  }, [rounds, selectedRound, contest]);

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
      const filteredPools = poolList.filter(p => p.round_id?.toString() === rid?.toString());
      setPools(filteredPools);
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

  const handleUpdateDriveLink = async (poolId, driveLink) => {
    try {
      await request(`/api/pools/${poolId}/drive-link`, {
        method: 'PATCH',
        body: { drive_link: driveLink }
      });
      messageApi.success('Cập nhật link Drive thành công!');
      if (selectedRound) fetchData(selectedRound);
    } catch (err) {
      messageApi.error(err.message || 'Lỗi khi cập nhật link Drive');
    }
  };

  const releasedAt = releasedRounds[selectedRound] || currentRound?.problem_released_at;

  // Kiểm tra pool nào chưa có drive_link
  const poolsMissingLink = pools.filter(p => !p.drive_link || !p.drive_link.trim());
  const canRelease = pools.length > 0 && poolsMissingLink.length === 0;

  const allTeamsInRound = pools.flatMap(p => p.teams || []);
  const allSubmittedInRound = allTeamsInRound.length > 0 && allTeamsInRound.every(team => {
    const tid = (team._id || team)?.toString();
    const status = teamSubmissions[tid] || 'pending';
    return status !== 'pending';
  });

  return (
    <div className="p-6 space-y-6">
      {contextHolder}

      <div>
        <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-primary)' }}>Phát Đề Bài</h2>
        <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
          Khi phát đề, hệ thống sẽ mở quyền xem đề bài cho thí sinh. Các bài nộp sau hạn nộp bài sẽ bị đánh dấu Nộp trễ (LATE_PENDING).
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
          description={
            <div className="flex flex-col gap-1 mt-1">
              {currentRound?.submission_deadline && (
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                  Hạn nộp bài của vòng: <strong style={{ color: 'var(--cyan)' }}>{new Date(currentRound.submission_deadline).toLocaleString('vi-VN')}</strong>
                </div>
              )}
              <CountdownTimer deadline={currentRound?.submission_deadline} allSubmitted={allSubmittedInRound} />
            </div>
          }
        />
      ) : !currentRound?.is_active ? (
        <div className="flex flex-col gap-3">
          <Alert
            type="warning"
            showIcon
            message="Vòng thi chưa được kích hoạt"
            description="Vòng thi này chưa được kích hoạt chính thức. Bạn cần phân công Giám khảo và xác nhận kích hoạt vòng thi trước khi phát đề bài."
          />
          <div className="flex justify-end gap-3">
            <Button
              type="primary"
              onClick={() => window.open(`/round/${selectedRound}/activate`, '_blank')}
            >
              ⚡ Kích hoạt Vòng thi ngay
            </Button>
            <Button type="primary" disabled title="Vòng thi chưa được kích hoạt">📤 Phát đề ngay</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {!canRelease && pools.length > 0 && (
            <Alert type="warning" showIcon
              message="Chưa thể phát đề"
              description={`Các bảng đấu sau chưa có link Google Drive: ${poolsMissingLink.map(p => p.pool_name).join(', ')}. Vui lòng vào tab "Bảng đấu" để nhập link trước.`}
            />
          )}
          {pools.length === 0 && (
            <Alert type="warning" showIcon
              message="Chưa có bảng đấu nào"
              description="Vui lòng tạo bảng đấu và nhập link Google Drive đề bài trước khi phát đề."
            />
          )}
          <div className="flex items-center gap-3">
            <Alert type="info" showIcon message="Đề chưa được phát cho vòng này." style={{ flex: 1 }} />
            <Button
              type="primary"
              onClick={() => setConfirmPool(true)}
              disabled={!canRelease}
              title={!canRelease ? 'Cần nhập link Google Drive cho tất cả bảng đấu trước khi phát đề' : ''}
            >
              📤 Phát đề ngay
            </Button>
          </div>
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
          {(() => {
            const isFinalRound = currentRound?.name?.toLowerCase().includes('chung kết') ||
                                 currentRound?.name?.toLowerCase().includes('final') ||
                                 currentRound?.name?.toLowerCase().includes('chung cuộc');

            if (isFinalRound && pools.length > 0) {
              const released = !!releasedAt;
              const allTeams = pools.flatMap(p => p.teams || []);
              const allSubmittedInRoundFinal = allTeams.length > 0 && allTeams.every(team => {
                const tid = (team._id || team)?.toString();
                const status = teamSubmissions[tid] || 'pending';
                return status !== 'pending';
              });
              return (
                <div className="rounded-xl border overflow-hidden"
                  style={{ background: 'var(--bg-card)', borderColor: released ? 'rgba(16,185,129,0.3)' : 'var(--border)' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 gap-3 flex-wrap"
                    style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>Danh sách Đội thi đấu Chung kết</h3>
                      {released
                        ? <Tag color="green" style={{ fontSize: '0.7rem' }}>✓ Đã phát đề</Tag>
                        : <Tag color="default" style={{ fontSize: '0.7rem' }}>Chưa phát đề</Tag>
                      }
                    </div>
                    <div className="flex items-center gap-3">
                      {released && <CountdownTimer deadline={currentRound?.submission_deadline} allSubmitted={allSubmittedInRoundFinal} />}
                    </div>
                  </div>

                  {/* Team list */}
                  <div>
                    {allTeams.length === 0 && (
                      <div className="px-5 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có đội thi đấu</div>
                    )}
                    {allTeams.map((team, idx) => {
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
            }

            return pools.map(pool => {
              const released = !!releasedAt;
              const teams = pool.teams || [];
              const poolSubmitted = teams.length > 0 && teams.every(team => {
                const tid = (team._id || team)?.toString();
                const status = teamSubmissions[tid] || 'pending';
                return status !== 'pending';
              });
              return (
                <div key={pool._id} className="rounded-xl border overflow-hidden"
                  style={{ background: 'var(--bg-card)', borderColor: released ? 'rgba(16,185,129,0.3)' : 'var(--border)' }}>
                  {/* Pool header */}
                  <div className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap"
                    style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                    <div className="flex items-center gap-3" style={{ minWidth: '150px' }}>
                      <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>{pool.pool_name}</h3>
                      {released
                        ? <Tag color="green" style={{ fontSize: '0.7rem' }}>✓ Đã phát đề</Tag>
                        : <Tag color="default" style={{ fontSize: '0.7rem' }}>Chưa phát đề</Tag>
                      }
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end flex-wrap">
                      {released && <CountdownTimer deadline={currentRound?.submission_deadline} allSubmitted={poolSubmitted} />}
                      
                      {/* Inline Drive link editor */}
                      <div className="flex items-center gap-2" style={{ minWidth: '260px', maxWidth: '350px', flex: 1 }}>
                        <input
                          type="url"
                          placeholder="Nhập Link Google Drive đề bài..."
                          value={pool.drive_link || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPools(prev => prev.map(p => p._id === pool._id ? { ...p, drive_link: val } : p));
                          }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            background: 'var(--bg-nest)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            flex: 1,
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateDriveLink(pool._id, pool.drive_link)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            background: 'var(--cyan)',
                            color: '#000',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Lưu
                        </button>
                      </div>
                      
                      {pool.drive_link && (
                        <a href={pool.drive_link} target="_blank" rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: released ? '#10b981' : '#60a5fa', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          📂 Mở Link
                        </a>
                      )}
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
            });
          })()}
        </div>
      )}

      {/* Confirm Modal */}
      <Modal title="📤 Xác nhận phát đề"
        open={!!confirmPool} onOk={doRelease} onCancel={() => setConfirmPool(null)}
        okText="Phát đề ngay" cancelText="Hủy" confirmLoading={releasing}>
        <div className="py-2">
          <Alert type="warning" showIcon
            message={`Phát đề cho vòng "${currentRound?.name}"`}
            description="Sau khi phát, hệ thống sẽ ghi nhận problem_released_at và mở hiển thị đề bài cho thí sinh. Các bài nộp sau hạn nộp bài sẽ bị đánh dấu Nộp trễ (LATE_PENDING). Hành động không thể hoàn tác."
          />
        </div>
      </Modal>
    </div>
  );
}
