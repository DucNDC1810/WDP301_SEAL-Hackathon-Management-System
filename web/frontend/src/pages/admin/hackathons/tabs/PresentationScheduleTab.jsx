import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Tag, Modal, message, Spin, Tooltip } from 'antd';
import { useApi } from '../../../../hooks/useApi';
import RefreshButton from '../../../../components/RefreshButton';

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

const exportCSV = (slots, roundName, poolName, contestTitle) => {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    [`Lịch thuyết trình — ${contestTitle ?? ''}`, '', `Vòng: ${roundName ?? ''}`, `Pool: ${poolName ?? ''}`],
    [],
    ['#', 'Thời gian bắt đầu', 'Kết thúc', 'Phòng', 'Đội đặt', 'Trạng thái', 'Ghi chú'],
    ...slots.map((s, i) => [
      i + 1,
      fmtTime(s.start_time),
      fmtTime(s.end_time),
      s.room || '',
      s.booked_team_id?.team_name ?? s.booked_team_id ?? '',
      { available: 'Trống', booked: 'Đã đặt', cancelled: 'Đã huỷ', completed: 'Hoàn tất' }[s.status] ?? s.status,
      s.note || '',
    ]),
  ];
  const csv = '﻿' + rows.map(r => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `lich-thuyet-trinh-${(roundName ?? 'round').replace(/\s+/g, '-')}-${(poolName ?? 'pool').replace(/\s+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

  const rounds = (contest?.rounds || []).filter(r => r.round_number > 1);
  const [selectedRound, setSelectedRound] = useState(rounds[0]?._id ?? null);

  // Sync selectedRound when rounds load/change
  useEffect(() => {
    if (rounds.length) {
      if (!selectedRound || !rounds.some(r => r._id === selectedRound)) {
        setSelectedRound(rounds[0]._id);
      }
    } else {
      setSelectedRound(null);
    }
  }, [rounds, selectedRound]);

  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(false);

  const [showSingle, setShowSingle] = useState(false);
  const [showBulk,   setShowBulk]   = useState(false);
  const [singleForm, setSingleForm] = useState(EMPTY_SINGLE);
  const [bulkForm,   setBulkForm]   = useState(EMPTY_BULK);
  const [submitting, setSubmitting] = useState(false);

  // Load slots
  const loadSlots = useCallback(async () => {
    if (!selectedRound) return;
    setLoading(true);
    try {
      const data = await request(
        `/api/presentation-slots?contest_id=${contestId}&round_id=${selectedRound}`
      );
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRound, contestId, request]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleCreateSingle = async () => {
    if (!singleForm.start_time || !singleForm.end_time)
      return messageApi.warning('Vui lòng nhập thời gian bắt đầu và kết thúc');
    setSubmitting(true);
    try {
      await request('/api/presentation-slots', {
        method: 'POST',
        body: { ...singleForm, contest_id: contestId, round_id: selectedRound, pool_id: null },
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
    const totalSlots = validRooms.length * bulkForm.count;
    try {
      const res = await request('/api/presentation-slots/bulk', {
        method: 'POST',
        body: {
          contest_id: contestId,
          round_id: selectedRound,
          pool_id: null,
          all_pools: false,
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

  const handleRandomAssign = () => {
    Modal.confirm({
      title: 'Random thứ tự thuyết trình?',
      content: 'Hệ thống sẽ xáo ngẫu nhiên toàn bộ đội vào các slot còn trống/đã đặt của vòng này. Nếu đã có đội đặt lịch trước đó, lịch cũ sẽ bị ghi đè.',
      okText: 'Random ngay', cancelText: 'Thôi',
      onOk: async () => {
        setSubmitting(true);
        try {
          const res = await request('/api/presentation-slots/random-assign', {
            method: 'POST',
            body: { contest_id: contestId, round_id: selectedRound },
          });
          messageApi.success(`Đã random xếp lịch cho ${res.assigned} đội`);
          loadSlots();
        } catch (err) {
          messageApi.error(err.message || 'Lỗi random xếp lịch');
        } finally {
          setSubmitting(false);
        }
      },
    });
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

        <div className="flex items-center gap-2 ml-auto">
          <RefreshButton onRefresh={loadSlots} />
          <Button
            disabled={!slots.length}
            onClick={() => {
              const roundName = rounds.find(r => r._id === selectedRound)?.name ?? selectedRound;
              exportCSV(slots, roundName, "", contest?.title);
            }}
          >
            Xuất lịch CSV
          </Button>
          <Button
            onClick={() => { setShowBulk(true); setBulkForm(EMPTY_BULK); }}
            disabled={!selectedRound}
          >
            Tạo nhiều slot
          </Button>
          <Button
            onClick={handleRandomAssign}
            disabled={!selectedRound || !slots.length}
            loading={submitting}
          >
            🎲 Random thứ tự thuyết trình
          </Button>
          <Button
            type="primary"
            onClick={() => { setShowSingle(true); setSingleForm(EMPTY_SINGLE); }}
            disabled={!selectedRound}
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
          Chưa có slot nào.{selectedRound ? ' Nhấn "+ Tạo slot" để bắt đầu.' : ' Chọn vòng để xem.'}
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
        const totalSlots = validRooms * bulkForm.count;
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
                {' '}({bulkForm.count} slot × {validRooms} phòng)
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
