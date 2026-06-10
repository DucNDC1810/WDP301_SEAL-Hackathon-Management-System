import { useEffect, useState } from 'react';
import { Modal, message, Empty } from 'antd';
import { useApi } from '../../../hooks/useApi';

const fmtTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

const card = { background: '#0c1524', border: '1px solid #162036', borderRadius: 12, padding: '20px 24px' };
const labelStyle = { fontSize: '0.72rem', fontWeight: 700, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 };
const gradTitle = { background: 'linear-gradient(90deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' };
const btnSm = { display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:6, border:'1px solid #00d4ff40', background:'transparent', color:'#00d4ff', fontSize:'0.78rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit' };
const btnPrimary = { ...btnSm, background:'linear-gradient(135deg,#00d4ff,#0099cc)', color:'#060b16', borderColor:'transparent' };
const cardIcon = { width:28, height:28, borderRadius:6, background:'#00d4ff14', display:'flex', alignItems:'center', justifyContent:'center', color:'#00d4ff', flexShrink:0 };
const badgeCyan = { display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:4, fontSize:'0.72rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', background:'#00d4ff14', color:'#00d4ff', border:'1px solid #00d4ff40' };

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
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedRound || !contestId) return;
    const dl = selectedRound.submission_deadline;
    const passed = !dl || new Date() > new Date(dl);
    setDeadlinePassed(passed);
    setSubmissionDeadline(dl);

    if (!passed) { setSlots([]); setMyBooking(null); return; }

    const load = async () => {
      setSlotsLoading(true);
      try {
        const data = await request(`/api/presentation-slots/my-pool?contest_id=${contestId}&round_id=${selectedRound._id}`);
        setSlots(data.slots ?? []);
        setMyBooking(data.myBooking ?? null);
      } catch (err) {
        if (err.status === 400) setDeadlinePassed(false);
        setSlots([]); setMyBooking(null);
      } finally { setSlotsLoading(false); }
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
    } finally { setBooking(false); setConfirmSlot(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#162036] border-t-[#00d4ff] animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col gap-5 p-7 bg-[#060b16] min-h-full">
        <h2 className="text-2xl font-extrabold m-0" style={gradTitle}>Lịch trình bày</h2>
        <Empty description="Bạn cần có đội thi để xem lịch trình bày." />
      </div>
    );
  }

  const poolName = team.pool_id?.pool_name ?? null;

  return (
    <div className="flex flex-col gap-5 p-7 bg-[#060b16] min-h-full">
      {ctx}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold m-0" style={gradTitle}>Lịch trình bày</h2>
        {poolName && (
          <span style={badgeCyan}>
            <Ico d="M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z" size={11} />
            {poolName}
          </span>
        )}
      </div>

      {rounds.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {rounds.map(r => (
            <button
              key={r._id}
              onClick={() => setSelectedRound(r)}
              style={selectedRound?._id === r._id
                ? { ...btnSm, background: '#00d4ff14', borderColor: '#00d4ff', color: '#00d4ff' }
                : btnSm}
            >
              {r.name || `Vòng ${r.sequence_order}`}
            </button>
          ))}
        </div>
      )}

      {myBooking && (
        <div style={{ ...card, borderTopWidth: 2, borderTopColor: '#22c55e' }}>
          <div className="flex gap-3">
            <div style={{ ...cardIcon, background: 'rgba(34,197,94,.12)', color: '#22c55e' }}>
              <Ico d={CHECK} size={14} />
            </div>
            <div>
              <span style={labelStyle}>LỊCH ĐÃ ĐẶT</span>
              <div className="flex flex-wrap gap-3 mt-2">
                <div>
                  <span style={{ ...labelStyle, fontSize: 11 }}>BẮT ĐẦU</span>
                  <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{fmtTime(myBooking.start_time)}</div>
                </div>
                <div style={{ width: 1, background: '#162036', alignSelf: 'stretch' }} />
                <div>
                  <span style={{ ...labelStyle, fontSize: 11 }}>KẾT THÚC</span>
                  <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{fmtTime(myBooking.end_time)}</div>
                </div>
                {myBooking.room && (
                  <>
                    <div style={{ width: 1, background: '#162036', alignSelf: 'stretch' }} />
                    <div>
                      <span style={{ ...labelStyle, fontSize: 11 }}>PHÒNG</span>
                      <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{myBooking.room}</div>
                    </div>
                  </>
                )}
                <div>
                  <span style={{ ...labelStyle, fontSize: 11 }}>THỜI LƯỢNG</span>
                  <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{fmtDuration(myBooking.start_time, myBooking.end_time)}</div>
                </div>
              </div>
              {myBooking.note && (
                <div className="flex gap-[10px] items-start mt-[10px] p-3 rounded-lg" style={{ background: '#00d4ff14', border: '1px solid #00d4ff40' }}>
                  <span className="flex-shrink-0 mt-[1px]"><Ico d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={14} /></span>
                  <span style={{ color: '#4a6080', fontSize: '0.78rem' }}>{myBooking.note}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!deadlinePassed && selectedRound && (
        <div className="flex gap-[10px] items-start p-3 rounded-lg" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)' }}>
          <span className="flex-shrink-0 mt-[1px] text-[#f59e0b]"><Ico d={CLOCK} size={15} /></span>
          <div className="flex flex-col gap-[2px]">
            <span style={{ fontWeight: 600, color: '#c9d6e8' }}>Chưa mở đăng ký lịch trình bày</span>
            <span style={{ color: '#4a6080', fontSize: '0.78rem' }}>
              Đăng ký lịch chỉ mở sau hạn nộp bài:{' '}
              <strong style={{ color: '#f59e0b' }}>{fmtTime(submissionDeadline)}</strong>
            </span>
          </div>
        </div>
      )}

      {deadlinePassed && !myBooking && (
        <div style={{ background: '#0c1524', border: '1px solid #162036', borderRadius: 12, overflow: 'hidden' }}>
          <div className="flex items-center justify-between px-4 py-[14px]" style={{ borderBottom: '1px solid #162036' }}>
            <div className="flex items-center gap-2">
              <div style={cardIcon}><Ico d={CAL} size={14} /></div>
              <span style={{ color: '#c9d6e8', fontWeight: 600 }}>Slot trống — {selectedRound?.name}</span>
            </div>
            <span style={{ color: '#4a6080', fontSize: 12 }}>
              {slotsLoading ? 'Đang tải...' : `${slots.length} slot khả dụng`}
            </span>
          </div>

          {slotsLoading ? (
            <div className="flex items-center justify-center min-h-[120px]">
              <div className="w-8 h-8 rounded-full border-2 border-[#162036] border-t-[#00d4ff] animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <div className="py-8 text-center">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có slot trống. Liên hệ admin để tạo thêm." />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: '#0a1220', borderBottom: '1px solid #162036' }}>
                  {['#', 'Thời gian', 'Thời lượng', 'Phòng', 'Ghi chú', ''].map((h, i) => (
                    <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((s, i) => (
                  <tr key={s._id} style={{ borderBottom: '1px solid #0f1a2e' }}>
                    <td style={{ padding: '12px 16px', color: '#4a6080' }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px', color: '#c9d6e8' }}>
                      <div>{fmtTime(s.start_time)}</div>
                      <div style={{ fontSize: 11, color: '#4a6080', marginTop: 2 }}>→ {fmtTime(s.end_time)}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}><span style={badgeCyan}>{fmtDuration(s.start_time, s.end_time)}</span></td>
                    <td style={{ padding: '12px 16px', color: '#c9d6e8' }}>{s.room || <span style={{ color: '#4a6080' }}>—</span>}</td>
                    <td style={{ padding: '12px 16px', color: '#4a6080', fontSize: 12 }}>{s.note || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button style={btnPrimary} onClick={() => setConfirmSlot(s)}>Đặt lịch</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {deadlinePassed && myBooking && slots.length === 0 && (
        <div className="flex gap-[10px] items-start p-3 rounded-lg" style={{ background: '#00d4ff14', border: '1px solid #00d4ff40' }}>
          <span className="flex-shrink-0 mt-[1px] text-[#00d4ff]"><Ico d={CHECK} size={14} /></span>
          <div className="flex flex-col gap-[2px]">
            <span style={{ fontWeight: 600, color: '#c9d6e8' }}>Đội đã đặt lịch thành công</span>
            <span style={{ color: '#4a6080', fontSize: '0.78rem' }}>Liên hệ admin nếu cần thay đổi lịch trình bày.</span>
          </div>
        </div>
      )}

      {!selectedRound && <Empty description="Không có vòng thi nào." />}

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
            <div style={{ background: '#0c1524', border: '1px solid #162036', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px' }}>BẮT ĐẦU</div>
                <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{fmtTime(confirmSlot.start_time)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px' }}>KẾT THÚC</div>
                <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{fmtTime(confirmSlot.end_time)}</div>
              </div>
              {confirmSlot.room && (
                <div>
                  <div style={{ fontSize: 11, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px' }}>PHÒNG</div>
                  <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{confirmSlot.room}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
