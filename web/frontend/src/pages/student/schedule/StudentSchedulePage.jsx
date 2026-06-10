import { useEffect, useState } from 'react';
import { Button, Modal, message, Tag, Empty } from 'antd';
import { useApi } from '../../../hooks/useApi';
import '../student.css';

const fmtTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtDuration = (s, e) => {
  if (!s || !e) return '';
  const mins = Math.round((new Date(e) - new Date(s)) / 60000);
  return `${mins} phút`;
};

const Ico = ({ d, size = 14, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const CAL   = ['M8 2v3', 'M16 2v3', 'M3 7h18', 'M3 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H3z'];
const CHECK = ['M20 6L9 17l-5-5'];
const CLOCK = ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'];

export const StudentSchedulePage = () => {
  const { request } = useApi();
  const [messageApi, ctx] = message.useMessage();

  const [loading, setLoading]     = useState(true);
  const [team, setTeam]           = useState(null);
  const [contestId, setContestId] = useState(null);
  const [rounds, setRounds]       = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);

  const [slots, setSlots]         = useState([]);
  const [myBooking, setMyBooking] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [submissionDeadline, setSubmissionDeadline] = useState(null);

  const [booking, setBooking]     = useState(false);
  const [confirmSlot, setConfirmSlot] = useState(null);

  // Load team and contest
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const teamsRes = await request('/api/teams/me');
        const teams = Array.isArray(teamsRes) ? teamsRes : teamsRes?.data ?? [];
        if (!teams.length) { setLoading(false); return; }

        const t = teams[0];
        setTeam(t);
        const cid = t.contest_id?._id ?? t.contest_id;
        setContestId(cid);
        const contestRounds = t.contest_id?.rounds ?? [];
        setRounds(contestRounds);
        const active = contestRounds.find(r => r.is_active) ?? contestRounds[0];
        if (active) setSelectedRound(active);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load slots when round changes
  useEffect(() => {
    if (!selectedRound || !contestId) return;

    const dl = selectedRound.submission_deadline;
    const passed = !dl || new Date() > new Date(dl);
    setDeadlinePassed(passed);
    setSubmissionDeadline(dl);

    if (!passed) {
      setSlots([]);
      setMyBooking(null);
      return;
    }

    const load = async () => {
      setSlotsLoading(true);
      try {
        const data = await request(
          `/api/presentation-slots/my-pool?contest_id=${contestId}&round_id=${selectedRound._id}`
        );
        setSlots(data.slots ?? []);
        setMyBooking(data.myBooking ?? null);
      } catch (err) {
        if (err.status === 400) {
          setDeadlinePassed(false);
        }
        setSlots([]);
        setMyBooking(null);
      } finally {
        setSlotsLoading(false);
      }
    };
    load();
  }, [selectedRound, contestId]);

  const handleBook = async () => {
    if (!confirmSlot) return;
    setBooking(true);
    try {
      await request(`/api/presentation-slots/${confirmSlot._id}/book`, { method: 'POST' });
      messageApi.success('Đặt lịch thành công!');
      setMyBooking({ ...confirmSlot });
      setSlots(prev => prev.filter(s => s._id !== confirmSlot._id));
    } catch (err) {
      messageApi.error(err.message || 'Đặt lịch thất bại');
    } finally {
      setBooking(false);
      setConfirmSlot(null);
    }
  };

  if (loading) {
    return <div className="sp-loading"><div className="sp-spinner" /></div>;
  }

  if (!team) {
    return (
      <div className="sp-page">
        <h2 className="sp-page-title">Lịch trình bày</h2>
        <Empty description="Bạn cần có đội thi để xem lịch trình bày." />
      </div>
    );
  }

  const poolName = team.pool_id?.pool_name ?? null;

  return (
    <div className="sp-page">
      {ctx}
      <div className="sp-flex--between">
        <h2 className="sp-page-title">Lịch trình bày</h2>
        {poolName && (
          <span className="sp-badge sp-badge--cyan">
            <Ico d="M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z" size={11} />
            {poolName}
          </span>
        )}
      </div>

      {/* Round selector */}
      {rounds.length > 1 && (
        <div className="sp-flex sp-gap-2" style={{ flexWrap: 'wrap' }}>
          {rounds.map(r => (
            <button
              key={r._id}
              onClick={() => setSelectedRound(r)}
              className={`sp-btn sp-btn--sm${selectedRound?._id === r._id ? '' : ''}`}
              style={selectedRound?._id === r._id
                ? { background: 'var(--pg-accent-bg)', borderColor: 'var(--pg-accent)', color: 'var(--pg-accent)' }
                : {}}
            >
              {r.name || `Vòng ${r.sequence_order}`}
            </button>
          ))}
        </div>
      )}

      {/* Current booking card */}
      {myBooking && (
        <div className="sp-card" style={{ borderTopWidth: 2, borderTopColor: 'var(--pg-green)' }}>
          <div className="sp-flex sp-gap-3">
            <div className="sp-card-icon" style={{ background: 'rgba(34,197,94,.12)', color: 'var(--pg-green)' }}>
              <Ico d={CHECK} size={14} />
            </div>
            <div>
              <span className="sp-label">LỊCH ĐÃ ĐẶT</span>
              <div className="sp-flex sp-gap-3" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                <div>
                  <span className="sp-muted" style={{ fontSize: 11 }}>BẮT ĐẦU</span>
                  <div className="sp-strong" style={{ marginTop: 2 }}>{fmtTime(myBooking.start_time)}</div>
                </div>
                <div style={{ width: 1, background: 'var(--pg-border)', alignSelf: 'stretch' }} />
                <div>
                  <span className="sp-muted" style={{ fontSize: 11 }}>KẾT THÚC</span>
                  <div className="sp-strong" style={{ marginTop: 2 }}>{fmtTime(myBooking.end_time)}</div>
                </div>
                {myBooking.room && (
                  <>
                    <div style={{ width: 1, background: 'var(--pg-border)', alignSelf: 'stretch' }} />
                    <div>
                      <span className="sp-muted" style={{ fontSize: 11 }}>PHÒNG</span>
                      <div className="sp-strong" style={{ marginTop: 2 }}>{myBooking.room}</div>
                    </div>
                  </>
                )}
                <div>
                  <span className="sp-muted" style={{ fontSize: 11 }}>THỜI LƯỢNG</span>
                  <div className="sp-strong" style={{ marginTop: 2 }}>{fmtDuration(myBooking.start_time, myBooking.end_time)}</div>
                </div>
              </div>
              {myBooking.note && (
                <div className="sp-alert sp-alert--info" style={{ marginTop: 10 }}>
                  <span className="sp-alert-icon"><Ico d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={14} /></span>
                  <div className="sp-alert-body"><span className="sp-alert-desc">{myBooking.note}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deadline gate */}
      {!deadlinePassed && selectedRound && (
        <div className="sp-alert sp-alert--warning">
          <span className="sp-alert-icon"><Ico d={CLOCK} size={15} /></span>
          <div className="sp-alert-body">
            <span className="sp-alert-title">Chưa mở đăng ký lịch trình bày</span>
            <span className="sp-alert-desc">
              Đăng ký lịch chỉ mở sau hạn nộp bài:{' '}
              <strong style={{ color: 'var(--pg-amber)' }}>{fmtTime(submissionDeadline)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Available slots */}
      {deadlinePassed && !myBooking && (
        <div className="sp-table-wrap">
          <div className="sp-card-head">
            <div className="sp-flex sp-gap-2">
              <div className="sp-card-icon"><Ico d={CAL} size={14} /></div>
              <span className="sp-strong">Slot trống — {selectedRound?.name}</span>
            </div>
            <span className="sp-muted" style={{ fontSize: 12 }}>
              {slotsLoading ? 'Đang tải...' : `${slots.length} slot khả dụng`}
            </span>
          </div>

          {slotsLoading ? (
            <div className="sp-loading"><div className="sp-spinner" /></div>
          ) : slots.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có slot trống. Liên hệ admin để tạo thêm." />
            </div>
          ) : (
            <table className="sp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Thời gian</th>
                  <th>Thời lượng</th>
                  <th>Phòng</th>
                  <th>Ghi chú</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slots.map((s, i) => (
                  <tr key={s._id}>
                    <td style={{ color: 'var(--pg-muted)' }}>{i + 1}</td>
                    <td>
                      <div>{fmtTime(s.start_time)}</div>
                      <div style={{ fontSize: 11, color: 'var(--pg-muted)', marginTop: 2 }}>→ {fmtTime(s.end_time)}</div>
                    </td>
                    <td>
                      <span className="sp-badge sp-badge--cyan">{fmtDuration(s.start_time, s.end_time)}</span>
                    </td>
                    <td>{s.room || <span style={{ color: 'var(--pg-muted)' }}>—</span>}</td>
                    <td style={{ color: 'var(--pg-muted)', fontSize: 12 }}>{s.note || '—'}</td>
                    <td>
                      <button className="sp-btn sp-btn--sm sp-btn--primary"
                        onClick={() => setConfirmSlot(s)}>
                        Đặt lịch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Already booked — no available slots to show */}
      {deadlinePassed && myBooking && slots.length === 0 && (
        <div className="sp-alert sp-alert--info">
          <span className="sp-alert-icon"><Ico d={CHECK} size={14} /></span>
          <div className="sp-alert-body">
            <span className="sp-alert-title">Đội đã đặt lịch thành công</span>
            <span className="sp-alert-desc">Liên hệ admin nếu cần thay đổi lịch trình bày.</span>
          </div>
        </div>
      )}

      {/* No round */}
      {!selectedRound && (
        <Empty description="Không có vòng thi nào." />
      )}

      {/* Confirm modal */}
      <Modal
        title="Xác nhận đặt lịch"
        open={!!confirmSlot}
        onOk={handleBook}
        onCancel={() => setConfirmSlot(null)}
        okText="Xác nhận đặt"
        cancelText="Huỷ"
        confirmLoading={booking}
      >
        {confirmSlot && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              Bạn sẽ đặt slot trình bày sau. <strong style={{ color: '#f59e0b' }}>Chỉ admin mới có thể huỷ lịch sau khi đặt.</strong>
            </div>
            <div style={{ background: '#0c1524', border: '1px solid #162036', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="flex gap-3" style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px' }}>BẮT ĐẦU</div>
                  <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{fmtTime(confirmSlot.start_time)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px' }}>KẾT THÚC</div>
                  <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{fmtTime(confirmSlot.end_time)}</div>
                </div>
              </div>
              {confirmSlot.room && (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>Phòng: <strong style={{ color: '#c9d6e8' }}>{confirmSlot.room}</strong></div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
