import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Tag, Modal, Alert, Tooltip, message, Spin, Input } from 'antd';
import { useApi } from '../../../../hooks/useApi';
import RefreshButton from '../../../../components/RefreshButton';

export default function JudgeAssignmentTab({ config, contestId, contest }) {
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const rounds = contest?.rounds
    ? contest.rounds.map(r => ({ id: r._id, name: r.name }))
    : (config?.tracks || []).flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name })));

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
  const [allUsers, setAllUsers] = useState([]);
  const [judgeAssignments, setJudgeAssignments] = useState([]);
  const [mentorAssignments, setMentorAssignments] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Judge modal state
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [newJudgeId, setNewJudgeId] = useState(null);
  const [newJudgeExternalEmail, setNewJudgeExternalEmail] = useState('');
  const [newJudgePool, setNewJudgePool] = useState(null);
  const [newJudgeType, setNewJudgeType] = useState('INTERNAL');

  // Mentor modal state
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [newMentorId, setNewMentorId] = useState(null);
  const [newMentorPoolFilter, setNewMentorPoolFilter] = useState(null); // lọc danh sách đội theo bảng (tùy chọn)
  const [newMentorTeams, setNewMentorTeams] = useState([]); // multi-select, có thể chọn đội từ nhiều bảng khác nhau

  const [saving, setSaving] = useState(false);

  // Fetch users + pools once
  useEffect(() => {
    if (!contestId) return;
    setLoadingUsers(true);
    request('/api/users?limit=1000')
      .then(usersData => {
        setAllUsers(Array.isArray(usersData) ? usersData : (usersData?.data ?? []));
      })
      .catch(() => messageApi.error('Không thể tải danh sách người dùng'))
      .finally(() => setLoadingUsers(false));
  }, [contestId]);

  useEffect(() => {
    if (!contestId || !selectedRound) return;
    request(`/api/pools/contests/${contestId}/pools?round_id=${selectedRound}`)
      .then(poolsData => {
        setPools(Array.isArray(poolsData) ? poolsData : (poolsData?.data ?? []));
      })
      .catch(() => messageApi.error('Không thể tải danh sách bảng đấu'));
  }, [contestId, selectedRound]);

  const fetchAssignments = useCallback(async (rid) => {
    if (!contestId || !rid) return;
    setLoadingAssignments(true);
    try {
      const [judgeData, mentorData] = await Promise.all([
        request(`/api/contests/${contestId}/rounds/${rid}/judge-assignments`),
        request(`/api/mentor-assignments/contests/${contestId}/rounds/${rid}`),
      ]);
      const judgeList = Array.isArray(judgeData) ? judgeData : (judgeData?.data ?? []);
      const mentorList = Array.isArray(mentorData) ? mentorData : (mentorData?.data ?? []);

      setJudgeAssignments(judgeList.map(a => ({
        id: a._id,
        judgeId: (a.judge_id?._id || a.judge_id)?.toString(),
        judgeName: a.judge_id?.full_name || a.judge_id?.email || a.external_email || '—',
        judgeRoles: a.judge_id?.roles?.map(r => r.role_name) || [],
        type: a.judge_type || 'INTERNAL',
        invitationStatus: a.invitation_status || 'active',
        externalEmail: a.external_email,
        pool: a.pool_id?.pool_name || '—',
        poolId: (a.pool_id?._id || a.pool_id)?.toString(),
        assignedAt: a.created_at,
      })));

      setMentorAssignments(mentorList.map(a => ({
        id: a._id,
        mentorId: (a.mentor_id?._id || a.mentor_id)?.toString(),
        mentorName: a.mentor_id?.full_name || a.mentor_id?.email || '—',
        pool: a.board_id?.pool_name || '—',
        poolId: (a.board_id?._id || a.board_id)?.toString(),
        teamId: (a.team_id?._id || a.team_id)?.toString(),
        teamName: a.team_id?.team_name || '—',
        assignedAt: a.assigned_at,
      })));
    } catch {
      messageApi.error('Không thể tải phân công');
    } finally {
      setLoadingAssignments(false);
    }
  }, [contestId, request]);

  useEffect(() => {
    if (selectedRound) fetchAssignments(selectedRound);
  }, [selectedRound, fetchAssignments]);

  // Users có role judge hoặc mentor đều có thể làm judge
  const judgeOrMentorUsers = allUsers.filter(u =>
    u.roles?.some(r => r.role_name === 'judge' || r.role_name === 'mentor')
  );
  const mentors = allUsers.filter(u => u.roles?.some(r => r.role_name === 'mentor'));

  // Pool đã có judge
  const assignedPoolIds = new Set(judgeAssignments.map(a => a.poolId));

  // Kiểm tra user có đang là mentor trong pool đang chọn không (dựa vào assignment thực tế, không phải role)
  const isMentorOfPool = (userId, poolId) => {
    if (!userId || !poolId) return false;
    return mentorAssignments.some(
      a => a.mentorId === userId?.toString() && a.poolId === poolId?.toString()
    );
  };

  // Các bảng mà giám khảo đang chọn (nếu là mentor) đã phụ trách — không cho chọn để chấm cùng bảng
  const boardsMentoredByNewJudge = new Set(
    newJudgeId
      ? mentorAssignments.filter(a => a.mentorId === newJudgeId?.toString()).map(a => a.poolId)
      : []
  );
  const poolOptions = pools
    .filter(p => !boardsMentoredByNewJudge.has(p._id?.toString()))
    .map(p => ({ value: p._id, label: p.pool_name }));

  const resetJudgeModal = () => {
    setNewJudgeId(null);
    setNewJudgeExternalEmail('');
    setNewJudgePool(null);
    setNewJudgeType('INTERNAL');
  };

  const addJudge = async () => {
    if (newJudgeType === 'INTERNAL' && !newJudgeId) {
      messageApi.error('Vui lòng chọn giám khảo!'); return;
    }
    if (newJudgeType === 'EXTERNAL' && !newJudgeExternalEmail) {
      messageApi.error('Vui lòng nhập email của giám khảo ngoài!'); return;
    }
    if (!newJudgePool) {
      messageApi.error('Vui lòng chọn bảng đấu!'); return;
    }
    setSaving(true);
    try {
      const body = {
        pool_id: newJudgePool,
        judge_type: newJudgeType,
        ...(newJudgeType === 'INTERNAL'
          ? { judge_id: newJudgeId }
          : { external_email: newJudgeExternalEmail }),
      };
      const res = await request(
        `/api/contests/${contestId}/rounds/${selectedRound}/judge-assignments`,
        { method: 'POST', body }
      );
      const warnings = res?.warnings || [];
      if (warnings.length) warnings.forEach(w => messageApi.warning(w));
      else messageApi.success('Đã phân công giám khảo!');
      setShowJudgeModal(false);
      resetJudgeModal();
      fetchAssignments(selectedRound);
    } catch (e) {
      messageApi.error(e.message || 'Không thể phân công giám khảo');
    } finally {
      setSaving(false);
    }
  };

  const resetMentorModal = () => {
    setNewMentorId(null); setNewMentorPoolFilter(null); setNewMentorTeams([]);
  };

  // Danh sách tất cả đội (kèm bảng của đội) trên toàn bộ vòng thi — dùng để multi-select nhanh,
  // tránh việc phải mở lại modal cho từng bảng/đội khi có nhiều bảng thi
  const allTeamOptions = pools.flatMap(p =>
    (p.teams || []).map(t => ({
      value: (t._id || t)?.toString(),
      poolId: p._id,
      label: `${t.team_name || t} — ${p.pool_name}`,
    }))
  );

  // Mỗi mentor chỉ được phụ trách 1 đội / bảng — các đội khác trong cùng bảng phải có mentor khác
  const boardsAlreadyMentored = new Set(
    mentorAssignments.filter(a => a.mentorId === newMentorId?.toString()).map(a => a.poolId)
  );
  const selectedBoardIds = new Set(
    newMentorTeams
      .map(id => allTeamOptions.find(o => o.value === id)?.poolId)
      .filter(Boolean)
  );

  const teamOptionsWithLock = allTeamOptions.map(o => {
    const alreadySelected = newMentorTeams.includes(o.value);
    const boardTaken = boardsAlreadyMentored.has(o.poolId) || (!alreadySelected && selectedBoardIds.has(o.poolId));
    return {
      ...o,
      disabled: boardTaken,
      label: boardTaken ? `${o.label} (bảng đã có mentor này)` : o.label,
    };
  });
  const visibleTeamOptions = newMentorPoolFilter
    ? teamOptionsWithLock.filter(o => o.poolId === newMentorPoolFilter)
    : teamOptionsWithLock;

  // Chọn tất cả nhưng chỉ 1 đội/bảng, để đảm bảo các đội trong cùng bảng luôn có mentor khác nhau
  const selectAllTeams = () => {
    const covered = new Set(boardsAlreadyMentored);
    const picks = [];
    for (const o of visibleTeamOptions) {
      if (o.disabled || covered.has(o.poolId)) continue;
      picks.push(o.value);
      covered.add(o.poolId);
    }
    setNewMentorTeams(picks);
  };

  const addMentor = async () => {
    if (!newMentorId || newMentorTeams.length === 0) {
      messageApi.error('Vui lòng chọn mentor và ít nhất một đội!'); return;
    }
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        newMentorTeams.map(teamId => {
          const opt = allTeamOptions.find(o => o.value === teamId);
          return request(`/api/mentor-assignments/contests/${contestId}/rounds/${selectedRound}`, {
            method: 'POST',
            body: { board_id: opt?.poolId, team_id: teamId, mentor_id: newMentorId },
          });
        })
      );
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount === 0) {
        messageApi.success(`Đã phân công mentor cho ${newMentorTeams.length} đội!`);
      } else {
        messageApi.warning(`Thành công ${newMentorTeams.length - failedCount}/${newMentorTeams.length} đội (${failedCount} đội lỗi, có thể đã được phân công trước đó).`);
      }
      setShowMentorModal(false);
      resetMentorModal();
      fetchAssignments(selectedRound);
    } catch (e) {
      messageApi.error(e.message || 'Không thể phân công mentor');
    } finally {
      setSaving(false);
    }
  };

  const removeJudge = async (id) => {
    try {
      await request(`/api/judge-assignments/${id}`, { method: 'DELETE' });
      setJudgeAssignments(prev => prev.filter(a => a.id !== id));
      messageApi.success('Đã xóa phân công giám khảo');
    } catch (e) {
      messageApi.error(e.message || 'Không thể xóa phân công');
    }
  };

  const removeMentor = async (id) => {
    try {
      await request(`/api/mentor-assignments/${id}`, { method: 'DELETE' });
      setMentorAssignments(prev => prev.filter(a => a.id !== id));
      messageApi.success('Đã xóa phân công mentor');
    } catch (e) {
      messageApi.error(e.message || 'Không thể xóa phân công');
    }
  };

  // Pool options cho judge — không disable nữa để hỗ trợ phân công nhiều giám khảo
  const judgePoolOptions = poolOptions;

  return (
    <div className="p-6 space-y-8">
      {contextHolder}

      {/* Round selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Vòng thi:</span>
        <Select
          value={selectedRound}
          onChange={setSelectedRound}
          style={{ width: 260 }}
          placeholder="Chọn vòng thi"
          options={rounds.map(r => ({ value: r.id, label: r.trackName ? `${r.trackName} — ${r.name}` : r.name }))}
        />
        <RefreshButton onRefresh={() => fetchAssignments(selectedRound)} />
      </div>

      {loadingAssignments && <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}

      {/* ─── Judge section ─── */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-base font-bold m-0" style={{ color: 'var(--text-primary)' }}>
            ⚖ Giám khảo theo bảng ({judgeAssignments.length}/{pools.length})
          </h3>
          <Button type="primary" size="small" onClick={() => setShowJudgeModal(true)}>+ Thêm Giám khảo</Button>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          {judgeAssignments.length === 0
            ? <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có giám khảo nào được phân công</div>
            : judgeAssignments.map((a, idx) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 flex-wrap"
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {a.judgeName}
                    </span>
                    {a.judgeRoles.includes('mentor') && (
                      <Tag color="cyan" style={{ fontSize: '0.65rem' }}>Mentor làm Judge</Tag>
                    )}
                    {a.invitationStatus === 'pending_invite' && (
                      <Tag color="orange" style={{ fontSize: '0.65rem' }}>⏳ Chờ xác nhận</Tag>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Tag color={a.type === 'INTERNAL' ? 'blue' : 'purple'} style={{ fontSize: '0.65rem' }}>{a.type}</Tag>
                    {a.type === 'EXTERNAL' && a.externalEmail && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.externalEmail}</span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Bảng: <strong>{a.pool}</strong> · chấm tất cả đội trong bảng
                    </span>
                    {a.assignedAt && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(a.assignedAt).toLocaleString('vi-VN')}
                      </span>
                    )}
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
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Bảng: <strong>{a.pool}</strong></span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Đội: <strong>{a.teamName}</strong></span>
                    {a.assignedAt && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(a.assignedAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
                <Button danger size="small" onClick={() => removeMentor(a.id)}>Xóa</Button>
              </div>
            ))
          }
        </div>
      </div>

      {/* ─── Add Judge Modal ─── */}
      <Modal
        title="Phân công Giám khảo"
        open={showJudgeModal}
        onOk={addJudge}
        onCancel={() => { setShowJudgeModal(false); resetJudgeModal(); }}
        okText="Phân công"
        cancelText="Hủy"
        confirmLoading={saving}
      >
        <div className="space-y-4 py-2">
          <Alert
            type="info"
            showIcon
            message="Giám khảo sẽ chấm điểm tất cả đội trong bảng được chọn"
          />

          {/* 1. Chọn bảng TRƯỚC */}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Bảng đấu</label>
            <Select
              value={newJudgePool}
              onChange={v => { setNewJudgePool(v); setNewJudgeId(null); setNewJudgeExternalEmail(''); }}
              style={{ width: '100%' }}
              placeholder="Chọn bảng trước..."
              options={poolOptions}
            />
          </div>

          {/* 2. Chọn loại */}
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Loại</label>
            <Select
              value={newJudgeType}
              onChange={v => { setNewJudgeType(v); setNewJudgeId(null); setNewJudgeExternalEmail(''); }}
              style={{ width: '100%' }}
              disabled={!newJudgePool}
              options={[
                { value: 'INTERNAL', label: 'Nội bộ — chọn từ tài khoản có sẵn' },
                { value: 'EXTERNAL', label: 'Ngoài — mời qua email' },
              ]}
            />
          </div>

          {/* 3. Chọn giám khảo (tùy loại) */}
          {newJudgeType === 'INTERNAL' ? (
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Chọn Giám khảo
              </label>
              <Select
                value={newJudgeId}
                onChange={v => {
                  setNewJudgeId(v);
                  if (isMentorOfPool(v, newJudgePool)) setNewJudgePool(null);
                }}
                style={{ width: '100%' }}
                placeholder={newJudgePool ? 'Tìm theo tên hoặc email...' : 'Chọn bảng trước'}
                disabled={!newJudgePool}
                loading={loadingUsers}
                showSearch
                optionLabelProp="title"
                filterOption={(input, opt) =>
                  (opt.searchtext || '').toLowerCase().includes(input.toLowerCase())
                }
                options={judgeOrMentorUsers.map(u => {
                  const uid = u._id?.toString();
                  const blocked = isMentorOfPool(uid, newJudgePool);
                  return {
                    value: u._id,
                    title: u.full_name || u.email,
                    searchtext: `${u.full_name || ''} ${u.email || ''}`,
                    disabled: blocked,
                    label: (
                      <div style={{ opacity: blocked ? 0.45 : 1 }}>
                        <div style={{ fontWeight: 500 }}>
                          {u.full_name || u.email}
                          {blocked && (
                            <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#ef4444', fontWeight: 400 }}>
                              (Đang mentor bảng này)
                            </span>
                          )}
                        </div>
                        {u.email && <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{u.email}</div>}
                      </div>
                    ),
                  };
                })}
              />
              {judgeOrMentorUsers.length === 0 && !loadingUsers && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Chưa có tài khoản nào có role Judge hoặc Mentor.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Email Giám khảo ngoài
              </label>
              <Input
                type="email"
                value={newJudgeExternalEmail}
                onChange={e => setNewJudgeExternalEmail(e.target.value)}
                placeholder="vd: expert@company.com"
                disabled={!newJudgePool}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Hệ thống sẽ gửi email mời. Tài khoản tự tạo sau khi họ xác nhận.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ─── Add Mentor Modal ─── */}
      <Modal
        title="Phân công Mentor"
        open={showMentorModal}
        onOk={addMentor}
        onCancel={() => { setShowMentorModal(false); resetMentorModal(); }}
        okText={newMentorTeams.length > 1 ? `Phân công (${newMentorTeams.length} đội)` : 'Phân công'}
        cancelText="Hủy"
        confirmLoading={saving}
        width={560}
      >
        <div className="space-y-4 py-2">
          <Alert
            type="info"
            showIcon
            message="Có thể chọn nhiều đội cùng lúc (kể cả ở nhiều bảng khác nhau) để phân công 1 mentor cho tất cả trong một lần, không cần lặp lại từng bảng."
          />

          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Chọn Mentor</label>
            <Select
              value={newMentorId}
              onChange={v => { setNewMentorId(v); setNewMentorTeams([]); }}
              style={{ width: '100%' }}
              placeholder="Tìm theo tên hoặc email..."
              loading={loadingUsers}
              showSearch
              optionLabelProp="title"
              filterOption={(input, opt) =>
                (opt.searchtext || '').toLowerCase().includes(input.toLowerCase())
              }
              options={mentors.map(m => ({
                value: m._id,
                title: m.full_name || m.email,
                searchtext: `${m.full_name || ''} ${m.email || ''}`,
                label: (
                  <div>
                    <div style={{ fontWeight: 500 }}>{m.full_name || m.email}</div>
                    {m.email && <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{m.email}</div>}
                  </div>
                ),
              }))}
            />
            {mentors.length === 0 && !loadingUsers && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Chưa có tài khoản nào có role Mentor.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Lọc theo bảng <span style={{ fontWeight: 400, opacity: 0.6 }}>(tùy chọn — chỉ để tìm đội nhanh hơn)</span>
            </label>
            <Select
              value={newMentorPoolFilter}
              onChange={setNewMentorPoolFilter}
              style={{ width: '100%' }}
              placeholder="Tất cả các bảng"
              allowClear
              options={poolOptions}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Đội thi</label>
              <Button
                size="small"
                type="link"
                disabled={!newMentorId}
                style={{ padding: 0, height: 'auto' }}
                onClick={selectAllTeams}
              >
                Chọn tất cả {newMentorPoolFilter ? 'trong bảng' : ''} (mỗi bảng 1 đội)
              </Button>
            </div>
            <Select
              mode="multiple"
              value={newMentorTeams}
              onChange={setNewMentorTeams}
              style={{ width: '100%' }}
              placeholder={newMentorId ? 'Chọn một hoặc nhiều đội...' : 'Chọn mentor trước'}
              disabled={!newMentorId}
              showSearch
              allowClear
              maxTagCount="responsive"
              filterOption={(input, opt) => (opt?.label || '').toLowerCase().includes(input.toLowerCase())}
              options={visibleTeamOptions}
            />
            <p className="text-xs mt-1" style={{ color: newMentorTeams.length > 0 ? 'var(--cyan)' : 'var(--text-muted)' }}>
              {newMentorTeams.length > 0
                ? `Đã chọn ${newMentorTeams.length} đội.`
                : 'Mỗi mentor chỉ được phụ trách 1 đội / bảng — các đội đã có mentor này ở bảng khác sẽ bị khóa.'}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
