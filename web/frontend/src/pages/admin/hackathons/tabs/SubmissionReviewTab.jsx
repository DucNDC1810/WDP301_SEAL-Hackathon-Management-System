import { useState } from 'react';
import { Button, Tag, Modal, Input, Alert, message } from 'antd';

const { TextArea } = Input;

const MOCK_SUBMISSIONS = [
  { id: 's1', teamName: 'Team Alpha', pool: 'Bảng A', status: 'late_pending', lateBy: 72, repoUrl: 'https://github.com/alpha', slideUrl: 'https://drive.google.com/alpha', note: '' },
  { id: 's2', teamName: 'Team Beta',  pool: 'Bảng A', status: 'approved',     lateBy: 0,  repoUrl: 'https://github.com/beta',  slideUrl: null,                              note: 'Nộp đúng hạn' },
  { id: 's3', teamName: 'Team Gamma', pool: 'Bảng B', status: 'late_pending', lateBy: 130, repoUrl: null,                       slideUrl: 'https://slides.com/gamma',        note: '' },
  { id: 's4', teamName: 'Team Delta', pool: 'Bảng B', status: 'rejected',     lateBy: 200, repoUrl: 'https://github.com/delta', slideUrl: null,                              note: 'Trễ quá 3 tiếng, không có lý do hợp lệ' },
  { id: 's5', teamName: 'Team Zeta',  pool: 'Bảng C', status: 'approved',     lateBy: 45, repoUrl: 'https://github.com/zeta',  slideUrl: 'https://slides.com/zeta',         note: 'Có lý do hợp lệ (sự cố mạng)' },
];

const STATUS_CFG = {
  late_pending: { label: 'Chờ duyệt', color: 'orange' },
  approved:     { label: 'Đã duyệt',  color: 'green'  },
  rejected:     { label: 'Từ chối',   color: 'red'    },
};

const FILTERS = ['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'];
const FILTER_STATUS = { 'Chờ duyệt': 'late_pending', 'Đã duyệt': 'approved', 'Từ chối': 'rejected' };

function fmtLate(min) {
  if (!min) return null;
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}g${m}p` : `${h} giờ`;
}

export default function SubmissionReviewTab() {
  const [subs, setSubs]           = useState(MOCK_SUBMISSIONS);
  const [filter, setFilter]       = useState('Tất cả');
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [messageApi, contextHolder] = message.useMessage();

  const filtered = filter === 'Tất cả' ? subs : subs.filter(s => s.status === FILTER_STATUS[filter]);

  const doApprove = () => {
    setSubs(prev => prev.map(s => s.id === approving.id ? { ...s, status: 'approved', note: 'Đã được admin duyệt' } : s));
    setApproving(null);
    messageApi.success(`Đã duyệt bài nộp của "${approving.teamName}"!`);
  };

  const doReject = () => {
    if (!rejectReason.trim()) { messageApi.error('Vui lòng nhập lý do từ chối!'); return; }
    setSubs(prev => prev.map(s => s.id === rejecting.id ? { ...s, status: 'rejected', note: rejectReason } : s));
    setRejecting(null);
    setRejectReason('');
    messageApi.success(`Đã từ chối bài nộp của "${rejecting.teamName}"!`);
  };

  const pending = subs.filter(s => s.status === 'late_pending').length;

  return (
    <div className="p-6 space-y-5">
      {contextHolder}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold m-0" style={{ color: 'var(--text-primary)' }}>Duyệt Bài Nộp Trễ (LATE_PENDING)</h2>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
            Các đội nộp bài trễ cần admin xem xét và APPROVE / REJECT thủ công.
          </p>
        </div>
        {pending > 0 && <Tag color="orange" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>⏳ {pending} chờ duyệt</Tag>}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              background: filter === f ? 'rgba(0,212,255,0.15)' : 'transparent',
              color: filter === f ? 'var(--cyan)' : 'var(--text-secondary)',
              border: `1px solid ${filter === f ? 'var(--cyan)' : 'var(--border)'}`,
            }}>
            {f} {f !== 'Tất cả' && `(${subs.filter(s => FILTER_STATUS[f] === s.status).length})`}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm rounded-xl border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
            Không có bài nộp nào
          </div>
        )}
        {filtered.map(sub => {
          const sc = STATUS_CFG[sub.status];
          const isLate = sub.lateBy > 0;
          const isVeryLate = sub.lateBy > 60;
          return (
            <div key={sub.id} className="rounded-xl border p-4 space-y-3"
              style={{ background: 'var(--bg-card)', borderColor: sub.status === 'late_pending' ? 'rgba(245,158,11,0.3)' : 'var(--border)' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{sub.teamName}</span>
                    <Tag>{sub.pool}</Tag>
                    <Tag color={sc.color}>{sc.label}</Tag>
                    {isLate && (
                      <Tag color={isVeryLate ? 'red' : 'orange'} style={{ fontSize: '0.65rem' }}>
                        {isVeryLate ? '⚠ ' : ''}Trễ {fmtLate(sub.lateBy)}
                      </Tag>
                    )}
                  </div>
                  {sub.note && (
                    <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-muted)' }}>📝 {sub.note}</p>
                  )}
                </div>
                {sub.status === 'late_pending' && (
                  <div className="flex gap-2">
                    <Button type="primary" size="small" onClick={() => setApproving(sub)}>✓ Duyệt</Button>
                    <Button danger size="small" onClick={() => { setRejecting(sub); setRejectReason(''); }}>✕ Từ chối</Button>
                  </div>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                {sub.repoUrl
                  ? <a href={sub.repoUrl} target="_blank" rel="noreferrer"
                      className="text-xs font-semibold px-2 py-1 rounded"
                      style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.25)' }}>🔗 Repo</a>
                  : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Không có repo</span>}
                {sub.slideUrl
                  ? <a href={sub.slideUrl} target="_blank" rel="noreferrer"
                      className="text-xs font-semibold px-2 py-1 rounded"
                      style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--purple)', border: '1px solid rgba(168,85,247,0.25)' }}>📊 Slide</a>
                  : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Không có slide</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Approve Modal */}
      <Modal title="✓ Duyệt bài nộp" open={!!approving}
        onOk={doApprove} onCancel={() => setApproving(null)}
        okText="Xác nhận duyệt" okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
        cancelText="Hủy">
        <div className="py-2">
          <Alert type="success" showIcon
            message={`Duyệt bài nộp của "${approving?.teamName}"`}
            description={`Trễ ${fmtLate(approving?.lateBy) || '0 phút'}. Sau khi duyệt đội sẽ được tính điểm bình thường.`}
          />
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal title="✕ Từ chối bài nộp" open={!!rejecting}
        onOk={doReject} onCancel={() => { setRejecting(null); setRejectReason(''); }}
        okText="Xác nhận từ chối" okButtonProps={{ danger: true }} cancelText="Hủy">
        <div className="space-y-3 py-2">
          <Alert type="error" showIcon
            message={`Từ chối bài nộp của "${rejecting?.teamName}"`}
            description="Đội sẽ không được chấm điểm cho vòng này."
          />
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Lý do từ chối * <span style={{ color: '#f87171' }}>(bắt buộc)</span>
            </label>
            <TextArea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              status={!rejectReason.trim() ? 'error' : ''}
              placeholder="Nhập lý do từ chối (trễ quá giờ quy định, không có lý do hợp lệ...)..." />
            {!rejectReason.trim() && <p className="text-xs mt-1" style={{ color: '#f87171' }}>Lý do là bắt buộc</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
