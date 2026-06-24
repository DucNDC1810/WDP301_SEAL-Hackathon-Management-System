import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';

const API_URL = import.meta.env.VITE_API_URL || '';
const hdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
});

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_COLORS = {
  FINISHED:       { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  color: '#10b981', label: 'FINISHED' },
  SCORING:        { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  color: '#f59e0b', label: 'SCORING'  },
  ACTIVE:         { bg: 'rgba(0,212,255,0.1)',   border: 'rgba(0,212,255,0.3)',   color: '#00d4ff', label: 'ACTIVE'   },
  PENDING_CONFIRM:{ bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.3)',  color: '#a855f7', label: 'PENDING'  },
  DRAFT:          { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', color: '#6b7280', label: 'DRAFT'    },
};

function StatusTag({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, padding: '2px 9px',
      borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

export default function AdminRBLPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState([]);

  const fetchRounds = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/rbl/rounds`, { headers: hdrs() });
      const data = await res.json();
      const list = (data.data ?? []).sort((a, b) => {
        if (a.status === 'FINISHED' && b.status !== 'FINISHED') return -1;
        if (b.status === 'FINISHED' && a.status !== 'FINISHED') return 1;
        return 0;
      });
      setRows(list);
    } catch {
      messageApi.error('Không thể tải danh sách vòng thi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

  const finishedCount = rows.filter(r => r.status === 'FINISHED').length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 60px' }}>
      {contextHolder}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: '1.5rem' }}>📐</span>
          <h1 style={{ fontWeight: 800, fontSize: '1.35rem', color: '#fff', margin: 0 }}>
            RBL Dashboard
          </h1>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Chọn một vòng thi đã kết thúc để xem báo cáo độ tin cậy chấm điểm (ICC & Krippendorff Alpha).
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng vòng thi', value: rows.length, color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)' },
          { label: 'Đã hoàn thành', value: finishedCount, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Có thể xem RBL', value: finishedCount, color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, minWidth: 140, padding: '16px 20px',
            borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`,
          }}>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: s.color }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 10, marginBottom: 20,
        background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)',
        fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)',
      }}>
        <span style={{ color: '#00d4ff' }}>🔒</span>
        Dashboard RBL chỉ khả dụng cho các vòng có trạng thái <strong style={{ color: '#10b981' }}>FINISHED</strong>.
        Dữ liệu được ẩn danh hoàn toàn.
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>
      ) : rows.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'rgba(255,255,255,0.02)', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.3)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có vòng thi nào</div>
          <div style={{ fontSize: '0.8rem' }}>Tạo hackathon và vòng thi để bắt đầu.</div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Cuộc thi', 'Vòng thi', 'Trạng thái', 'Kết thúc', ''].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const canView = r.status === 'FINISHED';
                return (
                  <tr
                    key={r.round_id}
                    style={{
                      borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: canView ? 'rgba(16,185,129,0.02)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = canView ? 'rgba(16,185,129,0.02)' : 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                      {r.contest_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>
                      {r.round_name}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusTag status={r.status} />
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                      {fmtDate(r.round_end)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        disabled={!canView}
                        onClick={() => navigate(`/admin/rbl/${r.round_id}/dashboard`)}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 8,
                          border: canView ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          background: canView ? 'rgba(0,212,255,0.1)' : 'transparent',
                          color: canView ? '#00d4ff' : 'rgba(255,255,255,0.2)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: canView ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {canView ? '📐 Xem RBL' : '🔒 Chưa kết thúc'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
