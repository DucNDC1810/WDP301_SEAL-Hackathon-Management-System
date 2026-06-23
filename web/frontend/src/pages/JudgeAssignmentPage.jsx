import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { App } from 'antd';
import {
  getAssignedJudges,
  getAvailableJudges,
  assignJudges,
  removeJudge,
} from '../api/judgeAssignment.js';

// ─── Style tokens ─────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f1729 0%, #111827 60%, #0d1b2a 100%)',
    padding: '40px 24px',
    fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, sans-serif",
    color: '#e2e8f0',
  },
  container: {
    maxWidth: 1160,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #818cf8, #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    marginTop: 4,
    fontSize: '0.85rem',
    color: '#64748b',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  panel: {
    background: 'rgba(26, 35, 50, 0.92)',
    borderRadius: 14,
    border: '1px solid rgba(99,102,241,0.2)',
    boxShadow: '0 6px 30px rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  panelHead: {
    padding: '18px 22px 14px',
    borderBottom: '1px solid rgba(99,102,241,0.15)',
    background: 'linear-gradient(90deg, rgba(99,102,241,0.07) 0%, transparent 100%)',
  },
  panelTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    color: '#c7d2fe',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  panelSub: {
    marginTop: 5,
    fontSize: '0.78rem',
    color: '#475569',
  },
  panelBody: {
    padding: '16px 22px 22px',
  },
  infoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 8,
    background: 'rgba(56,189,248,0.08)',
    border: '1px solid rgba(56,189,248,0.25)',
    color: '#7dd3fc',
    fontSize: '0.78rem',
    fontWeight: 600,
    marginBottom: 14,
    width: '100%',
    boxSizing: 'border-box',
  },
  checkboxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 340,
    overflowY: 'auto',
    padding: '2px 0',
  },
  checkRow: (checked) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    border: `1px solid ${checked ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.12)'}`,
    background: checked ? 'rgba(99,102,241,0.1)' : 'rgba(15,23,42,0.5)',
    cursor: 'pointer',
    transition: 'all 0.18s',
    userSelect: 'none',
  }),
  checkbox: (checked) => ({
    width: 17,
    height: 17,
    borderRadius: 4,
    flexShrink: 0,
    border: `2px solid ${checked ? '#6366f1' : '#334155'}`,
    background: checked ? 'rgba(99,102,241,0.25)' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s',
  }),
  judgeInfo: {
    flex: 1,
    minWidth: 0,
  },
  judgeName: {
    fontSize: '0.88rem',
    fontWeight: 600,
    color: '#c7d2fe',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  judgeEmail: {
    fontSize: '0.76rem',
    color: '#475569',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  addBtn: (disabled) => ({
    marginTop: 14,
    width: '100%',
    padding: '11px 0',
    borderRadius: 9,
    border: 'none',
    background: disabled
      ? 'rgba(71,85,105,0.35)'
      : 'linear-gradient(90deg, #6366f1, #3b82f6)',
    color: disabled ? '#475569' : '#fff',
    fontSize: '0.92rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.22s',
    boxShadow: disabled ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  }),
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.84rem',
  },
  th: {
    textAlign: 'left',
    padding: '9px 10px',
    borderBottom: '1px solid rgba(99,102,241,0.15)',
    color: '#64748b',
    fontSize: '0.74rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  td: {
    padding: '11px 10px',
    borderBottom: '1px solid rgba(15,23,42,0.6)',
    verticalAlign: 'middle',
  },
  deleteBtn: {
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid rgba(239,68,68,0.35)',
    background: 'rgba(239,68,68,0.08)',
    color: '#f87171',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.18s',
  },
  emptyState: {
    padding: '32px 0',
    textAlign: 'center',
    color: '#334155',
    fontSize: '0.85rem',
  },
  spinner: {
    width: 22,
    height: 22,
    border: '3px solid rgba(99,102,241,0.2)',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    margin: '32px auto',
  },
  countBadge: (n) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    height: 22,
    padding: '0 7px',
    borderRadius: 999,
    background: n > 0 ? 'rgba(99,102,241,0.25)' : 'rgba(71,85,105,0.2)',
    color: n > 0 ? '#a5b4fc' : '#475569',
    fontSize: '0.74rem',
    fontWeight: 700,
  }),
};

// Inject keyframe once
if (!document.getElementById('jap-styles')) {
  const s = document.createElement('style');
  s.id = 'jap-styles';
  s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function JudgeAssignmentPage() {
  const { round_id } = useParams();
  const { message: msg, modal } = App.useApp();

  const [loading, setLoading]           = useState(true);
  const [assigned, setAssigned]         = useState([]);
  const [available, setAvailable]       = useState([]);
  const [selected, setSelected]         = useState(new Set()); // judge_ids to add
  const [submitting, setSubmitting]     = useState(false);
  const [deletingId, setDeletingId]     = useState(null);

  // ── Fetch both lists ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [assignedRes, availableRes] = await Promise.all([
        getAssignedJudges(round_id),
        getAvailableJudges(round_id),
      ]);
      const assignedList  = assignedRes.data?.judges  ?? [];
      const availableList = availableRes.data?.judges ?? [];

      setAssigned(assignedList);
      // Filter out already-assigned from available list
      const assignedIds = new Set(assignedList.map((j) => String(j.judge_id)));
      setAvailable(availableList.filter((j) => !assignedIds.has(String(j._id))));
      setSelected(new Set());
    } catch (err) {
      msg.error('Không thể tải dữ liệu phân công judge');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [round_id, msg]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Toggle checkbox ──────────────────────────────────────────────────────────
  const toggleSelect = (judgeId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(judgeId) ? next.delete(judgeId) : next.add(judgeId);
      return next;
    });
  };

  // ── Assign selected judges ───────────────────────────────────────────────────
  const handleAssign = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      // POST uses sync (replace-all) logic — send currently assigned + newly selected
      const existingIds = assigned.map((j) => String(j.judge_id));
      const newIds      = [...selected];
      const mergedIds   = [...new Set([...existingIds, ...newIds])];

      await assignJudges(round_id, mergedIds);
      msg.success(`Đã thêm ${selected.size} judge vào Chung kết`);
      await fetchAll();
    } catch (err) {
      const status = err.response?.status;
      if (status === 409 || (err.response?.data?.code === 11000)) {
        msg.warning('Một số judge đã được phân công (trùng lặp bị bỏ qua)');
        await fetchAll();
      } else {
        msg.error(err.response?.data?.message || 'Thêm judge thất bại');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Remove judge ─────────────────────────────────────────────────────────────
  const handleRemove = (judge) => {
    modal.confirm({
      title: 'Xác nhận xóa phân công',
      content: (
        <span>
          Xóa <strong style={{ color: '#c7d2fe' }}>{judge.full_name}</strong> khỏi
          Ban giám khảo Chung kết?
        </span>
      ),
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      onOk: async () => {
        setDeletingId(String(judge.judge_id));
        try {
          await removeJudge(round_id, judge.judge_id);
          msg.success(`Đã xóa ${judge.full_name} khỏi Chung kết`);
          await fetchAll();
        } catch (err) {
          msg.error(err.response?.data?.message || 'Xóa thất bại');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ── Page Header ── */}
        <div style={S.pageHeader}>
          <div>
            <h1 style={S.title}>⚖️ Phân công Judge — Chung kết</h1>
            <p style={S.subtitle}>
              Quản lý ban giám khảo độc lập cho vòng chung kết.
              Judge từ vòng Sơ loại sẽ không xuất hiện trong danh sách khả dụng.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={S.spinner} />
          </div>
        ) : (
          <div style={S.grid}>

            {/* ══ LEFT — Available judges ══════════════════════════════════ */}
            <div style={S.panel}>
              <div style={S.panelHead}>
                <div style={S.panelTitle}>
                  <span>👥 Judge khả dụng</span>
                  <span style={S.countBadge(available.length)}>{available.length}</span>
                </div>
                <div style={S.panelSub}>Chọn judge để thêm vào ban giám khảo Chung kết</div>
              </div>

              <div style={S.panelBody}>
                {/* Info badge */}
                <div style={S.infoBadge}>
                  🛡️ Panel độc lập — không có Judge từ vòng Sơ loại
                </div>

                {available.length === 0 ? (
                  <div style={S.emptyState}>
                    Không có judge khả dụng.
                    <br />
                    <span style={{ fontSize: '0.76rem', color: '#1e293b' }}>
                      Tất cả judge đã phân công vào Sơ loại hoặc Chung kết.
                    </span>
                  </div>
                ) : (
                  <>
                    <div style={S.checkboxList}>
                      {available.map((j) => {
                        const id      = String(j._id);
                        const checked = selected.has(id);
                        return (
                          <div
                            key={id}
                            style={S.checkRow(checked)}
                            onClick={() => toggleSelect(id)}
                          >
                            <div style={S.checkbox(checked)}>
                              {checked && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8"
                                  strokeWidth={3} width={10} height={10}>
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                            <div style={S.judgeInfo}>
                              <div style={S.judgeName}>{j.full_name}</div>
                              <div style={S.judgeEmail}>{j.email}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      style={S.addBtn(selected.size === 0 || submitting)}
                      disabled={selected.size === 0 || submitting}
                      onClick={handleAssign}
                      aria-label="Thêm judge vào Chung kết"
                    >
                      {submitting ? (
                        <>
                          <div style={{ ...S.spinner, width: 16, height: 16, margin: 0, borderWidth: 2 }} />
                          Đang thêm...
                        </>
                      ) : (
                        <>
                          ➕ Thêm {selected.size > 0 ? `${selected.size} judge` : ''} vào Chung kết
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ══ RIGHT — Assigned judges ══════════════════════════════════ */}
            <div style={S.panel}>
              <div style={S.panelHead}>
                <div style={S.panelTitle}>
                  <span>✅ Đã phân công</span>
                  <span style={S.countBadge(assigned.length)}>{assigned.length}</span>
                </div>
                <div style={S.panelSub}>Ban giám khảo chính thức của vòng Chung kết</div>
              </div>

              <div style={S.panelBody}>
                {assigned.length === 0 ? (
                  <div style={S.emptyState}>
                    Chưa có judge nào được phân công.
                    <br />
                    <span style={{ fontSize: '0.76rem' }}>
                      Chọn judge từ danh sách bên trái để thêm.
                    </span>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Tên</th>
                          <th style={S.th}>Email</th>
                          <th style={S.th}>Ngày assign</th>
                          <th style={S.th} />
                        </tr>
                      </thead>
                      <tbody>
                        {assigned.map((j) => {
                          const jid = String(j.judge_id);
                          return (
                            <tr key={jid} style={{ opacity: deletingId === jid ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                              <td style={S.td}>
                                <span style={{ fontWeight: 600, color: '#c7d2fe', fontSize: '0.86rem' }}>
                                  {j.full_name}
                                </span>
                              </td>
                              <td style={{ ...S.td, color: '#64748b', fontSize: '0.81rem' }}>
                                {j.email}
                              </td>
                              <td style={{ ...S.td, color: '#475569', fontSize: '0.79rem', whiteSpace: 'nowrap' }}>
                                {fmtDate(j.assigned_at)}
                              </td>
                              <td style={{ ...S.td, textAlign: 'right' }}>
                                <button
                                  style={S.deleteBtn}
                                  disabled={deletingId === jid}
                                  onClick={() => handleRemove(j)}
                                  aria-label={`Xóa ${j.full_name}`}
                                >
                                  🗑️ Xóa
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
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
