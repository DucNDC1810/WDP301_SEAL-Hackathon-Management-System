import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Tag, Modal, Input, Alert, message, Spin, Popover } from 'antd';
import { useApi } from '../../../../hooks/useApi';
import RefreshButton from '../../../../components/RefreshButton';

const { TextArea } = Input;

const STATUS_CFG = {
  late_pending:  { label: 'Chờ duyệt',  color: 'orange' },
  approved:      { label: 'Đã duyệt',   color: 'green'  },
  rejected:      { label: 'Từ chối',    color: 'red'    },
  submitted:     { label: 'Đúng hạn',   color: 'blue'   },
  late:          { label: 'Nộp trễ',    color: 'orange' },
  not_submitted: { label: 'Không nộp',  color: 'default'},
};

const FILTERS = ['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'];
const FILTER_MAP = { 'Chờ duyệt': 'late_pending', 'Đã duyệt': 'approved', 'Từ chối': 'rejected' };

const mapStatus = (s) => {
  if (!s) return 'not_submitted';
  const m = {
    SUBMITTED: 'submitted',
    LATE: 'late',
    LATE_PENDING: 'late_pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  };
  return m[s] || s.toLowerCase();
};

export default function SubmissionReviewTab({ config, contestId, contest }) {
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const rounds = contest?.rounds
    ? contest.rounds.map(r => ({ id: r._id, name: r.name, submission_deadline: r.submission_deadline }))
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

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('Tất cả');
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [commitData, setCommitData] = useState({}); // { [submissionId]: { loading, count, contributors, error } }
  const [commitListModal, setCommitListModal] = useState(null); // { submissionId, teamName } | null
  const [commitList, setCommitList] = useState({ loading: false, commits: [], error: null });
  const [openPopoverId, setOpenPopoverId] = useState(null); // submissionId của Popover đang mở, chỉ 1 cái tại 1 thời điểm

  const fetchCommitCount = useCallback(async (submissionId) => {
    setCommitData(prev => ({ ...prev, [submissionId]: { loading: true } }));
    try {
      const res = await request(`/api/submissions/${submissionId}/commit-count`);
      const data = res?.data ?? res;
      setCommitData(prev => ({
        ...prev,
        [submissionId]: { loading: false, count: data.commit_count, contributors: data.contributors || [] },
      }));
    } catch (e) {
      setCommitData(prev => ({ ...prev, [submissionId]: { loading: false, error: e.message || 'Không thể lấy số commit' } }));
    }
  }, [request]);

  const openCommitList = useCallback(async (submissionId, teamName) => {
    setOpenPopoverId(null); // đóng Popover trước để không chồng lấn với Modal
    setCommitListModal({ submissionId, teamName });
    setCommitList({ loading: true, commits: [], error: null });
    try {
      const res = await request(`/api/submissions/${submissionId}/commits`);
      const data = res?.data ?? res;
      setCommitList({ loading: false, commits: data.commits || [], error: null });
    } catch (e) {
      setCommitList({ loading: false, commits: [], error: e.message || 'Không thể tải danh sách commit' });
    }
  }, [request]);

  const fetchSubmissions = useCallback(async (rid) => {
    if (!rid) return;
    setLoading(true);
    try {
      const data = await request(`/api/submissions?round_id=${rid}`);
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setSubmissions(list.map(s => ({
        id: s._id,
        teamId: (s.team_id?._id || s.team_id)?.toString(),
        teamName: s.team_name || s.team_id?.team_name || s.team_id?.name || '—',
        poolName: s.pool_name || s.pool_id?.pool_name || s.pool_id?.name || '—',
        status: mapStatus(s.status),
        lateBy: s.late_by_minutes || 0,
        repoUrl: s.repo_url || s.github_url || null,
        slideUrl: s.slide_url || null,
        demoUrl: s.demo_url || null,
        note: s.note || s.reason || '',
        submittedAt: s.submitted_at || s.createdAt,
      })));
    } catch {
      messageApi.error('Không thể tải danh sách bài nộp');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (selectedRound) fetchSubmissions(selectedRound);
  }, [selectedRound, fetchSubmissions]);

  const doReview = async (decision) => {
    if (!selected) return;
    if (decision === 'REJECT' && !reason.trim()) {
      messageApi.error('Nhập lý do từ chối!');
      return;
    }
    setProcessing(true);
    try {
      await request(`/api/submissions/${selected.id}/review`, {
        method: 'PATCH',
        body: { decision, reason: reason.trim() || undefined },
      });
      setSubmissions(prev => prev.map(s =>
        s.id === selected.id
          ? { ...s, status: decision === 'APPROVE' ? 'approved' : 'rejected', note: reason.trim() || s.note }
          : s
      ));
      setSelected(null);
      setReason('');
      messageApi.success(decision === 'APPROVE' ? '✓ Đã duyệt bài nộp' : '✓ Đã từ chối bài nộp');
    } catch (e) {
      messageApi.error(e.message || 'Không thể xử lý yêu cầu');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = submissions.filter(s => {
    if (filter === 'Tất cả') return true;
    return s.status === FILTER_MAP[filter];
  });

  const pendingCount = submissions.filter(s => s.status === 'late_pending').length;

  return (
    <div className="p-6 space-y-6">
      {contextHolder}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-primary)' }}>Duyệt Bài Nộp</h2>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
            Duyệt bài nộp trễ, xác nhận hoặc từ chối theo từng vòng thi.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RefreshButton onRefresh={() => fetchSubmissions(selectedRound)} />
          {pendingCount > 0 && (
            <Tag color="orange" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
              {pendingCount} bài chờ duyệt
            </Tag>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Vòng:</span>
          <Select value={selectedRound} onChange={v => { setSelectedRound(v); setSubmissions([]); }} style={{ width: 220 }}
            options={rounds.map(r => ({ value: r.id, label: r.trackName ? `${r.trackName} — ${r.name}` : r.name }))}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
              style={{
                borderColor: filter === f ? 'var(--cyan)' : 'var(--border)',
                background: filter === f ? 'rgba(0,212,255,0.12)' : 'transparent',
                color: filter === f ? 'var(--cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}>
              {f}
              {f === 'Chờ duyệt' && pendingCount > 0 && ` (${pendingCount})`}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}

      {!loading && filtered.length === 0 && (
        <div className="p-10 text-center text-sm rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          {submissions.length === 0 ? 'Chưa có bài nộp nào trong vòng này' : 'Không có bài nộp nào khớp với bộ lọc'}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((sub, idx) => {
            const sc = STATUS_CFG[sub.status] || { label: sub.status, color: 'default' };
            const isPending = sub.status === 'late_pending' || sub.status === 'late';
            const firstLetter = sub.teamName ? sub.teamName.trim().charAt(0).toUpperCase() : '?';
            
            const colors = [
              'linear-gradient(135deg, #00f0ff, #0072ff)',
              'linear-gradient(135deg, #d300c5, #0072ff)',
              'linear-gradient(135deg, #ff007f, #7f00ff)',
              'linear-gradient(135deg, #00f0ff, #7f00ff)',
              'linear-gradient(135deg, #ff8a00, #da1b60)',
            ];
            const colorIdx = firstLetter.charCodeAt(0) % colors.length;
            const avatarBg = colors[colorIdx];

            return (
              <div key={sub.id} className="p-5 flex items-start gap-4 flex-wrap rounded-xl border transition-all duration-200"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  borderColor: 'var(--border)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--cyan)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 240, 255, 0.08)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                }}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-md"
                  style={{ background: avatarBg }}>
                  {firstLetter}
                </div>

                {/* Info and Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{sub.teamName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                      {sub.poolName}
                    </span>
                    <Tag color={sc.color} style={{ fontSize: '0.7rem', padding: '1px 8px', borderRadius: 4 }}>{sc.label}</Tag>
                    {sub.lateBy > 0 && (
                      <Tag color="red" style={{ fontSize: '0.7rem', padding: '1px 8px', borderRadius: 4 }}>
                        Nộp trễ: {sub.lateBy < 60 ? `${sub.lateBy} phút` : `${Math.floor(sub.lateBy / 60)}g${sub.lateBy % 60 ? sub.lateBy % 60 + 'p' : ''}`}
                      </Tag>
                    )}
                  </div>

                  {/* Links as styled badges */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {sub.repoUrl && (
                      <a href={sub.repoUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-150"
                        style={{ 
                          color: 'var(--cyan)', 
                          borderColor: 'rgba(0, 240, 255, 0.3)', 
                          background: 'rgba(0, 240, 255, 0.05)',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.15)';
                          e.currentTarget.style.borderColor = 'var(--cyan)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                        }}
                      >
                        📁 Repository
                      </a>
                    )}
                    {sub.repoUrl && sub.repoUrl.toLowerCase().includes('github.com') && (
                      (() => {
                        const cd = commitData[sub.id];
                        if (cd?.loading) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border"
                              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                              ⏳ Đang tải...
                            </span>
                          );
                        }
                        if (cd?.error) {
                          return (
                            <button onClick={() => fetchCommitCount(sub.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer"
                              style={{ color: '#ff4d4f', borderColor: 'rgba(255,77,79,0.3)', background: 'rgba(255,77,79,0.05)' }}
                              title={cd.error}>
                              ⚠ Lỗi — thử lại
                            </button>
                          );
                        }
                        if (cd?.count != null) {
                          const contributors = cd.contributors || [];
                          const badge = (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border"
                              style={{
                                color: '#52c41a', borderColor: 'rgba(82,196,26,0.3)', background: 'rgba(82,196,26,0.05)',
                                cursor: contributors.length > 0 ? 'pointer' : 'default',
                              }}>
                              🔀 {cd.count} commit{cd.count === 1 ? '' : 's'}
                              {contributors.length > 0 && ` · ${contributors.length} người`}
                            </span>
                          );
                          if (contributors.length === 0) return badge;
                          return (
                            <Popover
                              key={`${sub.id}-contributors`}
                              trigger="click"
                              open={openPopoverId === sub.id}
                              onOpenChange={(nextOpen) => setOpenPopoverId(nextOpen ? sub.id : null)}
                              title="Commit theo thành viên"
                              content={
                                <div style={{ minWidth: 220 }}>
                                  {contributors.map((c, i) => (
                                    <div key={c.username || i} className="flex items-center justify-between gap-3"
                                      style={{ padding: '4px 0', fontSize: '0.8rem' }}>
                                      <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                        {c.avatar_url && (
                                          <img src={c.avatar_url} alt={c.username} width={20} height={20}
                                            style={{ borderRadius: '50%' }} />
                                        )}
                                        {c.profile_url ? (
                                          <a href={c.profile_url} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>
                                            {c.username}
                                          </a>
                                        ) : c.username}
                                      </span>
                                      <span style={{ fontWeight: 600, color: '#52c41a' }}>{c.commit_count}</span>
                                    </div>
                                  ))}
                                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, textAlign: 'center' }}>
                                    <a onClick={() => openCommitList(sub.id, sub.teamName)} style={{ color: 'var(--cyan)', cursor: 'pointer', fontSize: '0.78rem' }}>
                                      📜 Xem chi tiết lịch sử commit
                                    </a>
                                  </div>
                                </div>
                              }
                            >
                              {badge}
                            </Popover>
                          );
                        }
                        return (
                          <button onClick={() => fetchCommitCount(sub.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer"
                            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'transparent' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cyan)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                            🔀 Xem số commit
                          </button>
                        );
                      })()
                    )}
                    {sub.slideUrl && (
                      <a href={sub.slideUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-150"
                        style={{ 
                          color: '#ff8a00', 
                          borderColor: 'rgba(255, 138, 0, 0.3)', 
                          background: 'rgba(255, 138, 0, 0.05)',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(255, 138, 0, 0.15)';
                          e.currentTarget.style.borderColor = '#ff8a00';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255, 138, 0, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255, 138, 0, 0.3)';
                        }}
                      >
                        📊 Presentation Slide
                      </a>
                    )}
                    {sub.demoUrl && (
                      <a href={sub.demoUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-150"
                        style={{ 
                          color: '#d300c5', 
                          borderColor: 'rgba(211, 0, 197, 0.3)', 
                          background: 'rgba(211, 0, 197, 0.05)',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(211, 0, 197, 0.15)';
                          e.currentTarget.style.borderColor = '#d300c5';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(211, 0, 197, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(211, 0, 197, 0.3)';
                        }}
                      >
                        🎥 Demo Video
                      </a>
                    )}
                    {sub.submittedAt && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        ⏰ Nộp lúc: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>

                  {sub.note && (
                    <div className="p-3 rounded-lg text-xs italic border-l-2" 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.01)', 
                        borderColor: 'var(--cyan)', 
                        color: 'var(--text-secondary)' 
                      }}>
                      "{sub.note}"
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isPending && (
                  <div className="flex items-center self-center flex-shrink-0">
                    <Button 
                      type="primary" 
                      onClick={() => { setSelected(sub); setReason(''); }}
                      style={{
                        background: 'linear-gradient(135deg, var(--cyan), #0072ff)',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        height: 36,
                        boxShadow: '0 4px 10px rgba(0, 240, 255, 0.2)',
                      }}
                    >
                      Duyệt / Từ chối
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        title={`Xét duyệt: ${selected?.teamName}`}
        open={!!selected}
        onCancel={() => { setSelected(null); setReason(''); }}
        footer={null}
        width={480}
      >
        {selected && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl text-sm space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Bảng:</span> <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.poolName}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Trễ:</span> 
                <span className="font-semibold" style={{ color: selected.lateBy > 0 ? '#ff4d4f' : '#52c41a' }}>
                  {selected.lateBy > 0
                    ? `${selected.lateBy < 60 ? selected.lateBy + ' phút' : Math.floor(selected.lateBy / 60) + ' giờ ' + (selected.lateBy % 60 || '') + (selected.lateBy % 60 ? ' phút' : '')}`
                    : 'Đúng giờ'}
                </span>
              </div>
              <div className="border-t pt-3 flex gap-2 flex-wrap" style={{ borderColor: 'var(--border)' }}>
                {selected.repoUrl && (
                  <a href={selected.repoUrl} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 px-3 rounded-lg text-xs font-semibold border transition-all"
                     style={{ color: 'var(--cyan)', borderColor: 'rgba(0, 240, 255, 0.3)', background: 'rgba(0, 240, 255, 0.04)', textDecoration: 'none' }}
                     onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.04)'}>
                    📁 Repo
                  </a>
                )}
                {selected.slideUrl && (
                  <a href={selected.slideUrl} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 px-3 rounded-lg text-xs font-semibold border transition-all"
                     style={{ color: '#ff8a00', borderColor: 'rgba(255, 138, 0, 0.3)', background: 'rgba(255, 138, 0, 0.04)', textDecoration: 'none' }}
                     onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 138, 0, 0.1)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 138, 0, 0.04)'}>
                    📊 Slide
                  </a>
                )}
                {selected.demoUrl && (
                  <a href={selected.demoUrl} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 px-3 rounded-lg text-xs font-semibold border transition-all"
                     style={{ color: '#d300c5', borderColor: 'rgba(211, 0, 197, 0.3)', background: 'rgba(211, 0, 197, 0.04)', textDecoration: 'none' }}
                     onMouseEnter={e => e.currentTarget.style.background = 'rgba(211, 0, 197, 0.1)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'rgba(211, 0, 197, 0.04)'}>
                    🎥 Demo
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Lý do (bắt buộc khi từ chối)
              </label>
              <TextArea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Nhập lý do duyệt hoặc từ chối (optional cho Approve)..." />
            </div>
            <div className="flex gap-3">
              <Button type="primary" loading={processing} onClick={() => doReview('APPROVE')} style={{ flex: 1 }}>
                ✓ Duyệt
              </Button>
              <Button danger loading={processing} onClick={() => doReview('REJECT')} style={{ flex: 1 }}>
                ✗ Từ chối
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Commit History Modal */}
      <Modal
        title={`Lịch sử commit: ${commitListModal?.teamName || ''}`}
        open={!!commitListModal}
        onCancel={() => setCommitListModal(null)}
        footer={null}
        width={620}
      >
        {commitList.loading && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}

        {!commitList.loading && commitList.error && (
          <Alert type="error" showIcon message={commitList.error} />
        )}

        {!commitList.loading && !commitList.error && commitList.commits.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
            Chưa có commit nào trong repo này.
          </div>
        )}

        {!commitList.loading && !commitList.error && commitList.commits.length > 0 && (
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {commitList.commits.map((c, idx) => (
              <div key={c.sha || idx} className="flex items-start gap-3"
                style={{ padding: '10px 0', borderBottom: idx < commitList.commits.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {c.author_avatar ? (
                  <img src={c.author_avatar} alt={c.author_name} width={28} height={28} style={{ borderRadius: '50%', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)' }}>{c.message}</a>
                    ) : c.message}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    <span style={{ fontFamily: 'monospace' }}>{c.sha}</span>
                    {' · '}
                    {c.author_username ? (
                      <span style={{ color: 'var(--cyan)' }}>@{c.author_username}</span>
                    ) : c.author_name}
                    {c.committed_at && ` · ${new Date(c.committed_at).toLocaleString('vi-VN')}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
