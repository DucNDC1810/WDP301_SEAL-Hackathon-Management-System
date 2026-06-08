import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Tag, Modal, Alert, Tooltip, message, Spin, Input } from 'antd';
import { useApi } from '../../../../hooks/useApi';

export default function JudgeAssignmentTab({ config, contestId, contest }) {
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const rounds = contest?.rounds
    ? contest.rounds.map(r => ({ id: r._id, name: r.name }))
    : (config?.tracks || []).flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name })));

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || null);
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
  const [newMentorPool, setNewMentorPool] = useState(null);
  const [newMentorTeam, setNewMentorTeam] = useState(null);

  const [saving, setSaving] = useState(false);

  // Fetch users + pools once
  useEffect(() => {
    if (!contestId) return;
    setLoadingUsers(true);
    Promise.all([
      request('/api/users'),
      request(`/api/pools/contests/${contestId}/pools`),
    ]).then(([usersData, poolsData]) => {
      setAllUsers(Array.isArray(usersData) ? usersData : (usersData?.data ?? []));
      setPools(Array.isArray(poolsData) ? poolsData : (poolsData?.data ?? []));
    }).catch(() => messageApi.error('Không thể tải danh sách người dùng'))
      .finally(() => setLoadingUsers(false));
  }, [contestId]);

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
  const poolOptions = pools.map(p => ({ value: p._id, label: p.pool_name }));

  const getTeamsInPool = (poolId) => {
    const pool = pools.find(p => p._id === poolId || p._id?.toString() === poolId);
    return (pool?.teams || []).map(t => ({ value: t._id || t, label: t.team_name || t }));
  };

  // Pool đã có judge
  const assignedPoolIds = new Set(judgeAssignments.map(a => a.poolId));

  // Kiểm tra user có đang là mentor trong pool đang chọn không (dựa vào assignment thực tế, không phải role)
  const isMentorOfPool = (userId, poolId) => {
    if (!userId || !poolId) return false;
    return mentorAssignments.some(
      a => a.mentorId === userId?.toString() && a.poolId === poolId?.toString()
    );
  };

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

  const addMentor = async () => {
    if (!newMentorId || !newMentorPool || !newMentorTeam) {
      messageApi.error('Vui lòng chọn mentor, bảng và đội!'); return;
    }
    setSaving(true);
    try {
      await request(`/api/mentor-assignments/contests/${contestId}/rounds/${selectedRound}`, {
        method: 'POST',
        body: { board_id: newMentorPool, team_id: newMentorTeam, mentor_id: newMentorId },
      });
      messageApi.success('Đã phân công mentor!');
      setShowMentorModal(false);
      setNewMentorId(null); setNewMentorPool(null); setNewMentorTeam(null);
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

  // Pool options cho judge — disable nếu đã có judge
  const judgePoolOptions = poolOptions.map(p => ({
    ...p,
    disabled: assignedPoolIds.has(p.value?.toString()),
    label: assignedPoolIds.has(p.value?.toString()) ? `${p.label} (đã có giám khảo)` : p.label,
  }));

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
              options={judgePoolOptions}
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
                onChange={setNewJudgeId}
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
        onCancel={() => { setShowMentorModal(false); setNewMentorId(null); setNewMentorPool(null); setNewMentorTeam(null); }}
        okText="Phân công"
        cancelText="Hủy"
        confirmLoading={saving}
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Chọn Mentor</label>
            <Select
              value={newMentorId}
              onChange={setNewMentorId}
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
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Bảng đấu</label>
            <Select
              value={newMentorPool}
              onChange={v => { setNewMentorPool(v); setNewMentorTeam(null); }}
              style={{ width: '100%' }}
              placeholder="Chọn bảng"
              options={poolOptions}
            />
          </div>

          {newMentorPool && (
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Đội thi</label>
              <Select
                value={newMentorTeam}
                onChange={setNewMentorTeam}
                style={{ width: '100%' }}
                placeholder="Chọn đội"
                options={getTeamsInPool(newMentorPool)}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
