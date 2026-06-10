import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Tag, Modal, message, Spin, Tooltip } from 'antd';
import { useApi } from '../../../../hooks/useApi';

const API = import.meta.env.VITE_API_URL || '';
const tok = () => localStorage.getItem('accessToken');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

const fmtTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_CFG = {
  available:  { label: 'Trống',     color: 'green'   },
  booked:     { label: 'Đã đặt',   color: 'blue'    },
  cancelled:  { label: 'Đã huỷ',   color: 'red'     },
  completed:  { label: 'Hoàn tất', color: 'purple'  },
};

const EMPTY_SINGLE = { start_time: '', end_time: '', room: '', note: '' };
const EMPTY_BULK   = {
  start_time: '', slot_duration_min: 20, break_duration_min: 5,
  count: 5, rooms: [''], note: '', all_pools: false,
};

export default function PresentationScheduleTab({ contestId, contest }) {
  const { request } = useApi();
  const [messageApi, ctx] = message.useMessage();

  const rounds = contest?.rounds ?? [];
  const [selectedRound, setSelectedRound] = useState(rounds[0]?._id ?? null);
  const [pools, setPools]     = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);

  const [showSingle, setShowSingle] = useState(false);
  const [showBulk,   setShowBulk]   = useState(false);
  const [singleForm, setSingleForm] = useState(EMPTY_SINGLE);
  const [bulkForm,   setBulkForm]   = useState(EMPTY_BULK);
  const [submitting, setSubmitting] = useState(false);

  // Load pools
  useEffect(() => {
    if (!contestId) return;
    setPoolLoading(true);
    fetch(`${API}/api/pools/contests/${contestId}/pools`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => {
        const list = d.data || d || [];
        setPools(list);
        if (list.length) setSelectedPool(list[0]._id);
      })
      .catch(() => {})
      .finally(() => setPoolLoading(false));
  }, [contestId]);

  // Load slots
  const loadSlots = useCallback(async () => {
    if (!selectedRound || !selectedPool) return;
    setLoading(true);
    try {
      const data = await request(
        `/api/presentation-slots?contest_id=${contestId}&round_id=${selectedRound}&pool_id=${selectedPool}`
      );
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRound, selectedPool, contestId, request]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleCreateSingle = async () => {
    if (!singleForm.start_time || !singleForm.end_time)
      return messageApi.warning('Vui lòng nhập thời gian bắt đầu và kết thúc');
    setSubmitting(true);
    try {
      await request('/api/presentation-slots', {
        method: 'POST',
        body: { ...singleForm, contest_id: contestId, round_id: selectedRound, pool_id: selectedPool },
      });
      messageApi.success('Tạo slot thành công');
      setShowSingle(false);
      setSingleForm(EMPTY_SINGLE);
      loadSlots();
    } catch (err) {
      messageApi.error(err.message || 'Lỗi tạo slot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkForm.start_time) return messageApi.warning('Vui lòng nhập thời gian bắt đầu');
    const validRooms = bulkForm.rooms.filter(r => r.trim());
    if (!validRooms.length) return messageApi.warning('Vui lòng nhập ít nhất 1 phòng');
    setSubmitting(true);
    const totalSlots = validRooms.length * bulkForm.count * (bulkForm.all_pools ? pools.length : 1);
    try {
      const res = await request('/api/presentation-slots/bulk', {
        method: 'POST',
        body: {
          contest_id: contestId,
          round_id: selectedRound,
          pool_id: selectedPool,
          all_pools: bulkForm.all_pools,
          start_time: bulkForm.start_time,
          slot_duration_min: bulkForm.slot_duration_min,
          break_duration_min: bulkForm.break_duration_min,
          rooms: validRooms,
          count: bulkForm.count,
          note: bulkForm.note,
        },
      });
      messageApi.success(`Đã tạo ${res.count ?? totalSlots} slot`);
      setShowBulk(false);
      setBulkForm(EMPTY_BULK);
      loadSlots();
    } catch (err) {
      messageApi.error(err.message || 'Lỗi tạo slot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (slotId) => {
    Modal.confirm({
      title: 'Huỷ slot này?',
      content: 'Slot và đội đã đặt sẽ bị huỷ. Không thể hoàn tác.',
      okText: 'Huỷ slot', okType: 'danger', cancelText: 'Thôi',
      onOk: async () => {
        try {
          await request(`/api/presentation-slots/${slotId}/cancel`, { method: 'DELETE' });
          messageApi.success('Đã huỷ slot');
          loadSlots();
        } catch (err) {
          messageApi.error(err.message || 'Lỗi huỷ slot');
        }
      },
    });
  };

  const round = rounds.find(r => r._id === selectedRound);

  return (
    <div style={{ padding: '0 0 32px' }}>
      {ctx}

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>Vòng:</span>
          <Select
            value={selectedRound}
            onChange={setSelectedRound}
            style={{ minWidth: 160 }}
            options={rounds.map(r => ({ value: r._id, label: r.name || `Round ${r.sequence_order}` }))}
            placeholder="Chọn vòng"
          />
        </div>

        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>Pool:</span>
          {poolLoading
            ? <Spin size="small" />
            : <Select
                value={selectedPool}
                onChange={setSelectedPool}
                style={{ minWidth: 150 }}
                options={pools.map(p => ({ value: p._id, label: p.pool_name }))}
                placeholder="Chọn pool"
              />
          }
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            onClick={() => { setShowBulk(true); setBulkForm(EMPTY_BULK); }}
            disabled={!selectedRound || !selectedPool}
          >
            Tạo nhiều slot
          </Button>
          <Button
            type="primary"
            onClick={() => { setShowSingle(true); setSingleForm(EMPTY_SINGLE); }}
            disabled={!selectedRound || !selectedPool}
          >
            + Tạo slot
          </Button>
        </div>
      </div>

      {/* Submission deadline info */}
      {round?.submission_deadline && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c9d6e8',
        }}>
          ⏰ Hạn nộp bài vòng này: <strong style={{ color: '#f59e0b' }}>{fmtTime(round.submission_deadline)}</strong>
          {' '}— Teams chỉ có thể đăng ký slot sau thời điểm này.
        </div>
      )}

      {/* Slots table */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
          <Spin size="large" />
        </div>
      ) : slots.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 0', color: '#4a6080', fontSize: 14,
          border: '1px dashed #162036', borderRadius: 12,
        }}>
          Chưa có slot nào.{selectedRound && selectedPool ? ' Nhấn "+ Tạo slot" để bắt đầu.' : ' Chọn vòng và pool để xem.'}
        </div>
      ) : (
        <div style={{ background: '#0c1524', border: '1px solid #162036', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a1220', borderBottom: '1px solid #162036' }}>
                {['#', 'Thời gian bắt đầu', 'Kết thúc', 'Phòng', 'Đội đặt', 'Trạng thái', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#3a5068', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((s, i) => (
                <tr key={s._id} style={{ borderBottom: '1px solid #0f1a2e', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0f1e30'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 14px', color: '#4a6080' }}>{i + 1}</td>
                  <td style={{ padding: '11px 14px', color: '#c9d6e8', whiteSpace: 'nowrap' }}>{fmtTime(s.start_time)}</td>
                  <td style={{ padding: '11px 14px', color: '#c9d6e8', whiteSpace: 'nowrap' }}>{fmtTime(s.end_time)}</td>
                  <td style={{ padding: '11px 14px', color: '#c9d6e8' }}>{s.room || <span style={{ color: '#3a5068' }}>—</span>}</td>
                  <td style={{ padding: '11px 14px', color: '#c9d6e8' }}>
                    {s.booked_team_id
                      ? <span style={{ color: '#00d4ff', fontWeight: 600 }}>{s.booked_team_id.team_name ?? s.booked_team_id}</span>
                      : <span style={{ color: '#3a5068' }}>Trống</span>}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <Tag color={STATUS_CFG[s.status]?.color ?? 'default'}>
                      {STATUS_CFG[s.status]?.label ?? s.status}
                    </Tag>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {s.status !== 'cancelled' && (
                      <Tooltip title="Huỷ slot">
                        <Button size="small" danger onClick={() => handleCancel(s._id)}>Huỷ</Button>
                      </Tooltip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {slots.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#4a6080' }}>
          Tổng: {slots.length} slot &nbsp;·&nbsp;
          Đã đặt: {slots.filter(s => s.status === 'booked').length} &nbsp;·&nbsp;
          Còn trống: {slots.filter(s => s.status === 'available').length} &nbsp;·&nbsp;
          Đã huỷ: {slots.filter(s => s.status === 'cancelled').length}
        </div>
      )}

      {/* ── Modal: Tạo 1 slot ── */}
      <Modal
        title="Tạo slot trình bày"
        open={showSingle}
        onOk={handleCreateSingle}
        onCancel={() => setShowSingle(false)}
        okText="Tạo slot"
        confirmLoading={submitting}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <label style={{ fontSize: 13 }}>
            <span style={{ display: 'block', marginBottom: 4, color: '#94a3b8' }}>Bắt đầu *</span>
            <input type="datetime-local" value={singleForm.start_time}
              onChange={e => setSingleForm(f => ({ ...f, start_time: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            <span style={{ display: 'block', marginBottom: 4, color: '#94a3b8' }}>Kết thúc *</span>
            <input type="datetime-local" value={singleForm.end_time}
              onChange={e => setSingleForm(f => ({ ...f, end_time: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            <span style={{ display: 'block', marginBottom: 4, color: '#94a3b8' }}>Phòng</span>
            <input value={singleForm.room} placeholder="Vd: Phòng 101, Zoom Link..."
              onChange={e => setSingleForm(f => ({ ...f, room: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            <span style={{ display: 'block', marginBottom: 4, color: '#94a3b8' }}>Ghi chú</span>
            <input value={singleForm.note} placeholder="Tuỳ chọn"
              onChange={e => setSingleForm(f => ({ ...f, note: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}
            />
          </label>
        </div>
      </Modal>

      {/* ── Modal: Tạo nhiều slot ── */}
      {(() => {
        const IS  = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' };
        const validRooms = bulkForm.rooms.filter(r => r.trim()).length || 1;
        const poolCount  = bulkForm.all_pools ? pools.length : 1;
        const totalSlots = validRooms * bulkForm.count * poolCount;
        return (
          <Modal
            title="Tạo nhiều slot (tự động)"
            open={showBulk}
            onOk={handleBulkCreate}
            onCancel={() => setShowBulk(false)}
            okText={`Tạo ${totalSlots} slot`}
            confirmLoading={submitting}
            width={540}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>

              {/* Preview */}
              <div style={{ padding: '10px 14px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12, color: '#94a3b8' }}>
                <strong style={{ color: '#00d4ff' }}>{totalSlots} slot</strong> sẽ được tạo
                {' '}({bulkForm.count} slot × {validRooms} phòng{bulkForm.all_pools ? ` × ${pools.length} pool` : ''})
              </div>

              {/* Start time */}
              <label style={{ fontSize: 13 }}>
                <span style={{ display: 'block', marginBottom: 4, color: '#94a3b8' }}>Bắt đầu slot đầu tiên *</span>
                <input type="datetime-local" value={bulkForm.start_time} style={IS}
                  onChange={e => setBulkForm(f => ({ ...f, start_time: e.target.value }))} />
              </label>

              {/* Duration + break + count */}
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ fontSize: 13, flex: 1 }}>
                  <span style={{ display: 'block', marginBottom: 4, color: '#94a3b8' }}>Thời lượng (phút)</span>
                  <input type="number" min={1} max={120} value={bulkForm.slot_duration_min} style={IS}
                    onChange={e => setBulkForm(f => ({ ...f, slot_duration_min: +e.target.value }))} />
                </label>
                <label style={{ fontSize: 13, flex: 1 }}>
                  <span style={{ display: 'block', marginBottom: 4, color: '#94a3b8' }}>Nghỉ giữa slot (phút)</span>
                  <input type="number" min={0} max={60} value={bulkForm.break_duration_min} style={IS}
                    onChange={e => setBulkForm(f => ({ ...f, break_duration_min: +e.target.value }))} />
                </label>
                <label style={{ fontSize: 13, flex: 1 }}>
                  <span style={{ display: 'block', marginBottom: 4, color: '#94a3b8' }}>Số slot / phòng</span>
                  <input type="number" min={1} max={100} value={bulkForm.count} style={IS}
                    onChange={e => setBulkForm(f => ({ ...f, count: +e.target.value }))} />
                </label>
              </div>

              {/* Rooms */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Phòng *</span>
                  <button onClick={() => setBulkForm(f => ({ ...f, rooms: [...f.rooms, ''] }))}
                    style={{ fontSize: 12, color: '#00d4ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    + Thêm phòng
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bulkForm.rooms.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6 }}>
                      <input value={r} placeholder={`Vd: Phòng ${101 + i}`} style={{ ...IS, flex: 1, width: 'auto' }}
                        onChange={e => setBulkForm(f => ({ ...f, rooms: f.rooms.map((x, j) => j === i ? e.target.value : x) }))} />
                      {bulkForm.rooms.length > 1 && (
                        <button onClick={() => setBulkForm(f => ({ ...f, rooms: f.rooms.filter((_, j) => j !== i) }))}
                          style={{ padding: '0 10px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* All pools toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <div onClick={() => setBulkForm(f => ({ ...f, all_pools: !f.all_pools }))}
                  style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s',
                    border: `2px solid ${bulkForm.all_pools ? '#00d4ff' : '#334155'}`,
                    background: bulkForm.all_pools ? 'rgba(0,212,255,.1)' : 'transparent',
                  }}>
                  {bulkForm.all_pools && <span style={{ color: '#00d4ff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: '#c9d6e8' }}>
                  Tạo cho <strong>tất cả pool</strong> ({pools.length} pool)
                </span>
              </label>

              {/* Note */}
              <label style={{ fontSize: 13 }}>
                <span style={{ display: 'block', marginBottom: 4, color: '#94a3b8' }}>Ghi chú</span>
                <input value={bulkForm.note} placeholder="Tuỳ chọn" style={IS}
                  onChange={e => setBulkForm(f => ({ ...f, note: e.target.value }))} />
              </label>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
