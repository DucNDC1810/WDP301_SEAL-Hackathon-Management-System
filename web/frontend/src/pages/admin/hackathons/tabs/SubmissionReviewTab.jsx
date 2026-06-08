import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Tag, Modal, Input, Alert, message, Spin } from 'antd';
import { useApi } from '../../../../hooks/useApi';

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
    ? contest.rounds.map(r => ({ id: r._id, name: r.name }))
    : (config?.tracks || []).flatMap(t => (t.rounds || []).map(r => ({ ...r, trackName: t.name })));

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id || null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('Tất cả');
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchSubmissions = useCallback(async (rid) => {
    if (!rid) return;
    setLoading(true);
    try {
      const data = await request(`/api/submissions?round_id=${rid}`);
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setSubmissions(list.map(s => ({
        id: s._id,
        teamId: (s.team_id?._id || s.team_id)?.toString(),
        teamName: s.team_id?.team_name || s.team_id?.name || '—',
        poolName: s.pool_id?.pool_name || s.pool_id?.name || '—',
        status: mapStatus(s.status),
        lateBy: s.late_by_minutes || 0,
        repoUrl: s.repo_url || s.github_url || null,
        slideUrl: s.slide_url || null,
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
        {pendingCount > 0 && (
          <Tag color="orange" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            {pendingCount} bài chờ duyệt
          </Tag>
        )}
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
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {filtered.map((sub, idx) => {
            const sc = STATUS_CFG[sub.status] || { label: sub.status, color: 'default' };
            const isPending = sub.status === 'late_pending' || sub.status === 'late';
            return (
              <div key={sub.id} className="px-5 py-4 flex items-start gap-4 flex-wrap"
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{sub.teamName}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub.poolName}</span>
                    <Tag color={sc.color} style={{ fontSize: '0.65rem' }}>{sc.label}</Tag>
                    {sub.lateBy > 0 && (
                      <Tag color="red" style={{ fontSize: '0.65rem' }}>
                        +{sub.lateBy < 60 ? `${sub.lateBy}p` : `${Math.floor(sub.lateBy / 60)}g${sub.lateBy % 60 ? sub.lateBy % 60 + 'p' : ''}`}
                      </Tag>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {sub.repoUrl && (
                      <a href={sub.repoUrl} target="_blank" rel="noreferrer"
                        className="text-xs underline" style={{ color: 'var(--cyan)' }}>📁 Repo</a>
                    )}
                    {sub.slideUrl && (
                      <a href={sub.slideUrl} target="_blank" rel="noreferrer"
                        className="text-xs underline" style={{ color: 'var(--cyan)' }}>📊 Slide</a>
                    )}
                    {sub.submittedAt && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  {sub.note && <p className="text-xs italic m-0" style={{ color: 'var(--text-muted)' }}>"{sub.note}"</p>}
                </div>
                {isPending && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="small" type="primary" onClick={() => { setSelected(sub); setReason(''); }}>Duyệt / Từ chối</Button>
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
            <div className="p-3 rounded-lg text-sm space-y-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Bảng: </span>{selected.poolName}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Trễ: </span>
                {selected.lateBy > 0
                  ? `${selected.lateBy < 60 ? selected.lateBy + ' phút' : Math.floor(selected.lateBy / 60) + ' giờ ' + (selected.lateBy % 60 || '') + (selected.lateBy % 60 ? ' phút' : '')}`
                  : 'Đúng giờ'}
              </div>
              {selected.repoUrl && <div><a href={selected.repoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>📁 Xem Repo</a></div>}
              {selected.slideUrl && <div><a href={selected.slideUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>📊 Xem Slide</a></div>}
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
    </div>
  );
}
