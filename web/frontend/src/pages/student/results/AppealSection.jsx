import { useEffect, useState } from 'react';
import { Button, Input, Modal, Tag, message } from 'antd';
import { useApi } from '../../../hooks/useApi';

// Note: ai_classification / ai_reason are internal organiser triage hints on the
// Appeal model and are intentionally never read or rendered here.
const STATUS_META = {
  pending: { label: 'Đang chờ xử lý', color: 'warning' },
  reviewing: { label: 'Đang xem xét', color: 'processing' },
  resolved_valid: { label: 'Được chấp nhận', color: 'success' },
  resolved_invalid: { label: 'Bị từ chối', color: 'default' },
};

const fmt = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const AppealSection = ({ contestId, roundId, roundName, teamId, C }) => {
  const { request } = useApi();
  const [appeals, setAppeals] = useState([]);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  // GET /api/appeals/contests/:contestId/my requires team_id as a query param
  // (backend filters by team_id + contestId) — omitting it would return every
  // team's appeals for the contest, not just this team's.
  const myAppealsUrl = `/api/appeals/contests/${contestId}/my?team_id=${teamId}`;

  useEffect(() => {
    if (!contestId || !teamId) return;
    request(myAppealsUrl)
      .then((res) => setAppeals(Array.isArray(res) ? res : res?.data ?? []))
      .catch(() => setAppeals([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, teamId, roundId]);

  const mine = appeals.filter((a) => String(a.round_id) === String(roundId));
  const active = mine.find((a) => a.status === 'pending' || a.status === 'reviewing');

  const submit = async () => {
    if (!content.trim()) {
      message.warning('Vui lòng nhập nội dung khiếu nại');
      return;
    }
    setSending(true);
    try {
      await request('/api/appeals', {
        method: 'POST',
        body: { team_id: teamId, contest_id: contestId, round_id: roundId, content: content.trim() },
      });
      message.success('Đã gửi khiếu nại. Ban tổ chức sẽ xem xét và phản hồi.');
      setOpen(false);
      setContent('');
      const res = await request(myAppealsUrl);
      setAppeals(Array.isArray(res) ? res : res?.data ?? []);
    } catch (err) {
      // Backend returns a specific message (e.g. "Đội đã có khiếu nại đang xử lý")
      // when an active appeal already exists for this round — surface it as-is
      // instead of a generic failure.
      message.error(err.message || 'Không thể gửi khiếu nại');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ borderTop: `1px solid ${C.line2}`, paddingTop: 14, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.6px', color: C.muted, textTransform: 'uppercase' }}>
          Khiếu nại điểm
        </span>
        {!active && (
          <Button size="small" onClick={() => setOpen(true)}>
            Gửi khiếu nại
          </Button>
        )}
      </div>

      {mine.length === 0 ? (
        <div style={{ marginTop: 8, fontSize: 12.5, color: C.dim }}>
          Nếu đội cho rằng điểm vòng này chưa chính xác, bạn có thể gửi khiếu nại để ban tổ chức xem xét.
        </div>
      ) : (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mine.map((a) => {
            const meta = STATUS_META[a.status] ?? { label: a.status, color: 'default' };
            return (
              <div key={a._id} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <Tag color={meta.color}>{meta.label}</Tag>
                  <span style={{ fontSize: 11, color: C.dim }}>{fmt(a.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>{a.content}</div>
                {a.resolved_at && (
                  <div style={{ marginTop: 6, fontSize: 11.5, color: C.muted }}>
                    Đã xử lý ngày {fmt(a.resolved_at)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        title={`Khiếu nại điểm — ${roundName}`}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        okText="Gửi khiếu nại"
        cancelText="Huỷ"
        confirmLoading={sending}
      >
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
          Mô tả cụ thể điều đội cho rằng chưa chính xác. Mỗi vòng chỉ gửi được một khiếu nại tại một thời điểm.
        </p>
        <Input.TextArea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ví dụ: tiêu chí Kỹ thuật của đội chưa được tính phần tối ưu hoá truy vấn…"
          maxLength={2000}
          showCount
        />
      </Modal>
    </div>
  );
};
