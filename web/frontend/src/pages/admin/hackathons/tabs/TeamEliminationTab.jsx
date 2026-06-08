import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Tag, Modal, Input, Alert, message, Spin, Tooltip } from 'antd';
import { useApi } from '../../../../hooks/useApi';

const { TextArea } = Input;

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function TeamEliminationTab({ config, contestId, contest }) {
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const rounds = contest?.rounds
    ? contest.rounds.map(r => ({ id: r._id, name: r.name }))
    : (config?.tracks || []).flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name })));

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditLog, setAuditLog] = useState([]);

  const fetchTeams = useCallback(async (rid) => {
    if (!contestId || !rid) return;
    setLoading(true);
    try {
      // Try rankings endpoint first; fall back to all teams
      let list = [];
      try {
        const rankings = await request(`/api/contests/${contestId}/rounds/${rid}/rankings`);
        list = Array.isArray(rankings) ? rankings : (rankings?.data ?? []);
        list = list.map((item, idx) => ({
          id: (item.team_id?._id || item.team_id || item._id)?.toString(),
          name: item.team_id?.team_name || item.team_id?.name || item.team_name || item.name || '—',
          poolName: item.pool_id?.pool_name || item.pool_name || '—',
          score: typeof item.total_score === 'number' ? item.total_score : (item.score ?? null),
          eliminated: item.is_eliminated || item.eliminated || false,
          eliminatedAt: item.eliminated_at || null,
          eliminationReason: item.elimination_reason || null,
          rank: item.rank || idx + 1,
        }));
      } catch {
        // Fallback: get all teams for this contest
        const allTeams = await request(`/api/teams/contests/${contestId}/all`);
        const teamList = Array.isArray(allTeams) ? allTeams : (allTeams?.data ?? []);
        list = teamList.map((t, idx) => ({
          id: (t._id || t.id)?.toString(),
          name: t.team_name || t.name || '—',
          poolName: t.pool_id?.pool_name || '—',
          score: null,
          eliminated: t.is_eliminated || false,
          eliminatedAt: t.eliminated_at || null,
          eliminationReason: t.elimination_reason || null,
          rank: idx + 1,
        }));
      }
      setTeams(list);
    } catch {
      messageApi.error('Không thể tải danh sách đội');
    } finally {
      setLoading(false);
    }
  }, [contestId, request]);

  useEffect(() => {
    if (selectedRound) fetchTeams(selectedRound);
  }, [selectedRound, fetchTeams]);

  const doEliminate = async () => {
    if (!target) return;
    if (!reason.trim()) { messageApi.error('Vui lòng nhập lý do!'); return; }
    setProcessing(true);
    try {
      await request(`/api/teams/${target.id}/eliminate`, {
        method: 'PATCH',
        body: { reason: reason.trim() },
      });
      const now = new Date().toISOString();
      setTeams(prev => prev.map(t =>
        t.id === target.id
          ? { ...t, eliminated: true, eliminatedAt: now, eliminationReason: reason.trim() }
          : t
      ));
      setAuditLog(prev => [{
        id: Date.now(), teamName: target.name, reason: reason.trim(), at: now,
      }, ...prev]);
      setTarget(null);
      setReason('');
      messageApi.success(`Đã loại ${target.name} khỏi cuộc thi`);
    } catch (e) {
      messageApi.error(e.message || 'Không thể loại đội');
    } finally {
      setProcessing(false);
    }
  };

  const doRestore = async (team) => {
    Modal.confirm({
      title: 'Khôi phục đội?',
      content: `Khôi phục "${team.name}" để tiếp tục tham gia?`,
      okText: 'Khôi phục', cancelText: 'Hủy',
      onOk: async () => {
        try {
          await request(`/api/teams/${team.id}/eliminate`, {
            method: 'PATCH',
            body: { restore: true },
          });
          setTeams(prev => prev.map(t =>
            t.id === team.id ? { ...t, eliminated: false, eliminatedAt: null, eliminationReason: null } : t
          ));
          messageApi.success(`Đã khôi phục ${team.name}`);
        } catch {
          // Restore may not be supported — update local only
          setTeams(prev => prev.map(t =>
            t.id === team.id ? { ...t, eliminated: false, eliminatedAt: null, eliminationReason: null } : t
          ));
          messageApi.info(`Đã khôi phục ${team.name} (local)`);
        }
      },
    });
  };

  const active = teams.filter(t => !t.eliminated).sort((a, b) => {
    if (a.score !== null && b.score !== null) return b.score - a.score;
    return 0;
  }).map((t, i) => ({ ...t, rank: i + 1 }));

  const eliminated = teams.filter(t => t.eliminated);

  return (
    <div className="p-6 space-y-6">
      {contextHolder}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-primary)' }}>Loại Đội</h2>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
            Loại đội vi phạm hoặc không đủ điều kiện tiếp tục thi đấu.
          </p>
        </div>
        <Button size="small" onClick={() => setShowAudit(true)}>📋 Audit Log ({auditLog.length})</Button>
      </div>

      {/* Round selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Vòng thi:</span>
        <Select value={selectedRound} onChange={v => { setSelectedRound(v); setTeams([]); }} style={{ width: 260 }}
          options={rounds.map(r => ({ value: r.id, label: r.trackName ? `${r.trackName} — ${r.name}` : r.name }))}
        />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}

      {!loading && (
        <>
          {/* Active teams leaderboard */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.1)' }}>
              <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>
                Bảng xếp hạng ({active.length} đội)
              </h3>
            </div>

            {active.length === 0 && (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Chưa có dữ liệu đội thi
              </div>
            )}

            {active.map((team, idx) => (
              <div key={team.id} className="flex items-center gap-4 px-5 py-3 flex-wrap"
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="w-10 text-center flex-shrink-0">
                  {MEDAL[team.rank]
                    ? <span style={{ fontSize: '1.2rem' }}>{MEDAL[team.rank]}</span>
                    : <span className="font-bold text-sm" style={{ color: 'var(--text-muted)' }}>#{team.rank}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{team.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{team.poolName}</div>
                </div>
                {team.score !== null && (
                  <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--cyan)' }}>
                    {typeof team.score === 'number' ? team.score.toFixed(1) : team.score}
                  </div>
                )}
                <Button size="small" danger
                  onClick={() => { setTarget(team); setReason(''); }}>
                  Loại
                </Button>
              </div>
            ))}
          </div>

          {/* Eliminated teams */}
          {eliminated.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <h3 className="text-sm font-bold m-0" style={{ color: '#f87171' }}>Đội đã bị loại ({eliminated.length})</h3>
              </div>
              {eliminated.map((team, idx) => (
                <div key={team.id} className="flex items-center gap-4 px-5 py-3 flex-wrap"
                  style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none', opacity: 0.7 }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm line-through" style={{ color: 'var(--text-muted)' }}>{team.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {team.eliminatedAt ? new Date(team.eliminatedAt).toLocaleString('vi-VN') : ''}
                      {team.eliminationReason ? ` — ${team.eliminationReason}` : ''}
                    </div>
                  </div>
                  <Tag color="red" style={{ fontSize: '0.65rem' }}>Đã loại</Tag>
                  <Tooltip title="Khôi phục đội (nếu backend hỗ trợ)">
                    <Button size="small" onClick={() => doRestore(team)}>Khôi phục</Button>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Eliminate Modal */}
      <Modal
        title={`⚠ Loại đội: ${target?.name}`}
        open={!!target}
        onOk={doEliminate}
        onCancel={() => { setTarget(null); setReason(''); }}
        okText="Xác nhận loại" okButtonProps={{ danger: true }}
        cancelText="Hủy" confirmLoading={processing}
      >
        <div className="space-y-3 py-2">
          <Alert type="error" showIcon
            message={`Loại "${target?.name}" khỏi cuộc thi`}
            description="Đội bị loại sẽ không được tiếp tục tham gia. Hành động này có thể được khôi phục nếu backend hỗ trợ."
          />
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Lý do vi phạm / loại <span style={{ color: '#f87171' }}>*</span>
            </label>
            <TextArea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              status={!reason.trim() ? 'error' : ''}
              placeholder="Vi phạm quy chế, gian lận, không đủ thành viên,..." />
          </div>
        </div>
      </Modal>

      {/* Audit Log Modal */}
      <Modal title="📋 Audit Log — Lịch sử loại đội"
        open={showAudit} onCancel={() => setShowAudit(false)} footer={null} width={560}>
        <div className="space-y-2 py-2">
          {auditLog.length === 0 && <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có lịch sử trong phiên này</p>}
          {auditLog.map(entry => (
            <div key={entry.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{entry.teamName}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(entry.at).toLocaleString('vi-VN')}</div>
              <div className="text-xs mt-0.5" style={{ color: '#f87171' }}>Lý do: {entry.reason}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
