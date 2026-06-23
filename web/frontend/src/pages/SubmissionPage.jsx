import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { App } from 'antd';
import { getSubmission, submitWork } from '../api/submission.js';
import { getRoundSetup } from '../api/round.js';
import DeadlineCountdown from '../components/DeadlineCountdown.jsx';

// ─── Inline styles (no external CSS dependency) ──────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f1729 0%, #111827 60%, #0d1b2a 100%)',
    padding: '40px 20px',
    fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, sans-serif",
    color: '#e2e8f0',
  },
  card: {
    maxWidth: 780,
    margin: '0 auto',
    background: 'rgba(26, 35, 50, 0.9)',
    borderRadius: 16,
    border: '1px solid rgba(99,102,241,0.25)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
    overflow: 'hidden',
  },
  header: {
    padding: '28px 36px 20px',
    borderBottom: '1px solid rgba(99,102,241,0.18)',
    background: 'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, transparent 100%)',
  },
  title: {
    margin: 0,
    fontSize: '1.55rem',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #818cf8, #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    marginTop: 6,
    fontSize: '0.88rem',
    color: '#64748b',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  body: {
    padding: '28px 36px 36px',
  },
  lockedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 20px',
    borderRadius: 10,
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.4)',
    marginBottom: 28,
    color: '#fca5a5',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 999,
    background: 'rgba(239,68,68,0.2)',
    border: '1px solid rgba(239,68,68,0.5)',
    color: '#f87171',
    fontWeight: 700,
    fontSize: '0.8rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  successBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 999,
    background: 'rgba(16,185,129,0.15)',
    border: '1px solid rgba(16,185,129,0.4)',
    color: '#34d399',
    fontWeight: 700,
    fontSize: '0.8rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  infoRow: {
    fontSize: '0.86rem',
    color: '#64748b',
    marginBottom: 6,
  },
  section: {
    marginBottom: 24,
  },
  criteriaCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    border: '1px solid rgba(99,102,241,0.15)',
    padding: '20px 22px',
    marginBottom: 14,
    transition: 'border-color 0.2s',
  },
  criteriaLabel: {
    fontSize: '0.98rem',
    fontWeight: 600,
    color: '#c7d2fe',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  weightBadge: {
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    background: 'rgba(99,102,241,0.2)',
    color: '#818cf8',
    letterSpacing: '0.03em',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginBottom: 5,
    fontWeight: 500,
  },
  input: (locked) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 13px',
    borderRadius: 8,
    border: '1px solid rgba(99,102,241,0.25)',
    background: locked ? 'rgba(15,23,42,0.4)' : 'rgba(15,23,42,0.8)',
    color: locked ? '#475569' : '#e2e8f0',
    fontSize: '0.88rem',
    outline: 'none',
    cursor: locked ? 'not-allowed' : 'text',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    marginBottom: 10,
  }),
  textarea: (locked) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 13px',
    borderRadius: 8,
    border: '1px solid rgba(99,102,241,0.15)',
    background: locked ? 'rgba(15,23,42,0.4)' : 'rgba(15,23,42,0.6)',
    color: locked ? '#475569' : '#cbd5e1',
    fontSize: '0.85rem',
    outline: 'none',
    resize: 'vertical',
    minHeight: 70,
    cursor: locked ? 'not-allowed' : 'text',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  }),
  submitBtn: (locked, loading) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '13px 0',
    borderRadius: 10,
    border: 'none',
    background: locked || loading
      ? 'rgba(71,85,105,0.4)'
      : 'linear-gradient(90deg, #6366f1, #3b82f6)',
    color: locked || loading ? '#475569' : '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: locked || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.25s',
    letterSpacing: '0.02em',
    marginTop: 10,
    boxShadow: locked || loading ? 'none' : '0 4px 18px rgba(99,102,241,0.35)',
  }),
  divider: {
    height: 1,
    background: 'rgba(99,102,241,0.12)',
    margin: '22px 0',
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    fontSize: '0.9rem',
    color: '#64748b',
    gap: 10,
  },
  spinner: {
    width: 22,
    height: 22,
    border: '3px solid rgba(99,102,241,0.25)',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// ─── Keyframes injected once ──────────────────────────────────────────────────
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .submission-criteria-card:hover { border-color: rgba(99,102,241,0.35) !important; }
  .submission-input:focus { border-color: rgba(99,102,241,0.6) !important; }
  .submission-textarea:focus { border-color: rgba(99,102,241,0.4) !important; }
`;
if (!document.head.querySelector('#submission-page-styles')) {
  styleSheet.id = 'submission-page-styles';
  document.head.appendChild(styleSheet);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubmissionPage() {
  const { round_id, team_id } = useParams();
  const { message: msgApi, modal } = App.useApp();

  // State
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting]  = useState(false);
  const [error, setError]           = useState(null);

  const [submission, setSubmission]  = useState(null);
  const [deadline, setDeadline]     = useState(null);
  const [isLocked, setIsLocked]     = useState(false);

  const [criteria, setCriteria]     = useState([]);
  const [form, setForm]             = useState({}); // { [criteria_id]: { file_url, note } }

  const hasFetched = useRef(false);

  // ── Fetch submission + round setup ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, setupRes] = await Promise.all([
        getSubmission(round_id, team_id),
        getRoundSetup(round_id),
      ]);

      const { submission: sub, deadline: dl, is_locked } = subRes.data;
      const { criteria: criteriaList } = setupRes.data;

      setSubmission(sub);
      setDeadline(dl);
      setIsLocked(is_locked);
      setCriteria(criteriaList || []);

      // Pre-populate form with existing submission data
      const initialForm = {};
      (criteriaList || []).forEach((c) => {
        const existing = sub?.criteria_submissions?.find(
          (cs) => String(cs.criteria_id) === String(c._id)
        );
        initialForm[c._id] = {
          file_url: existing?.file_url || '',
          note: existing?.note || '',
        };
      });
      setForm(initialForm);
    } catch (err) {
      console.error('[SubmissionPage] fetchData error:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [round_id, team_id]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, [fetchData]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleFieldChange = (criteriaId, field, value) => {
    setForm((prev) => ({
      ...prev,
      [criteriaId]: { ...(prev[criteriaId] || {}), [field]: value },
    }));
  };

  const handleSubmit = () => {
    if (isLocked) return;
    modal.confirm({
      title: 'Xác nhận nộp bài',
      content: 'Bạn có chắc muốn nộp bài không? Bài đã nộp có thể được cập nhật trước khi hết hạn.',
      okText: 'Nộp bài',
      cancelText: 'Huỷ',
      okButtonProps: { style: { background: '#6366f1', borderColor: '#6366f1' } },
      onOk: async () => {
        setSubmitting(true);
        try {
          const criteria_submissions = criteria.map((c) => ({
            criteria_id: c._id,
            criteria_name: c.name,
            file_url: form[c._id]?.file_url || '',
            note: form[c._id]?.note || '',
          }));

          const res = await submitWork(round_id, team_id, { criteria_submissions });
          setSubmission(res.data.submission);
          msgApi.success('✅ Nộp bài thành công!');
          // Refetch to get fresh is_locked status
          await fetchData();
        } catch (err) {
          const errCode = err.response?.data?.error;
          if (errCode === 'DEADLINE_PASSED') {
            msgApi.error('🔒 Đã quá hạn nộp bài. Bài nộp bị từ chối.');
            setIsLocked(true);
          } else {
            msgApi.error('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
          }
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.loadingState}>
            <div style={S.spinner} />
            <span>Đang tải dữ liệu vòng thi...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ ...S.loadingState, color: '#f87171' }}>
            ⚠️ {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* ── Header ── */}
        <div style={S.header}>
          <h1 style={S.title}>📋 Nộp Bài Chung Kết</h1>
          <p style={S.subtitle}>
            Vòng thi chung kết — Điền đầy đủ thông tin theo từng tiêu chí và nhấn Nộp bài trước khi hết hạn.
          </p>
          <div style={S.meta}>
            {isLocked ? (
              <span style={S.badge}>🔒 REJECTED — Đã quá hạn nộp bài</span>
            ) : submission ? (
              <span style={S.successBadge}>✅ ĐÃ NỘP BÀI</span>
            ) : (
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Chưa nộp bài</span>
            )}
            {deadline && !isLocked && (
              <DeadlineCountdown
                deadline={deadline}
                onExpired={() => {
                  setIsLocked(true);
                  window.location.reload();
                }}
              />
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={S.body}>
          {/* Locked banner */}
          {isLocked && (
            <div style={S.lockedBanner}>
              🚫
              <span>
                Form đã bị khoá — Đã quá hạn nộp bài.
                {submission
                  ? ` Bài đã nộp lúc ${formatDate(submission.submitted_at)}.`
                  : ' Không có bài nộp.'}
              </span>
            </div>
          )}

          {/* Submission time info */}
          <div style={S.section}>
            <div style={S.infoRow}>
              📅 Hạn nộp bài:{' '}
              <strong style={{ color: '#c7d2fe' }}>{formatDate(deadline)}</strong>
            </div>
            {submission && (
              <div style={S.infoRow}>
                🕐 Đã nộp lúc:{' '}
                <strong style={{ color: '#34d399' }}>{formatDate(submission.submitted_at)}</strong>
              </div>
            )}
            {!submission && isLocked && (
              <div style={{ ...S.infoRow, color: '#f87171' }}>
                ❌ Không có bài nộp
              </div>
            )}
          </div>

          <div style={S.divider} />

          {/* ── Criteria form ── */}
          {criteria.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>
              Vòng thi chưa có tiêu chí chấm điểm. Vui lòng liên hệ ban tổ chức.
            </div>
          ) : (
            <div style={S.section}>
              {criteria.map((c, idx) => (
                <div
                  key={c._id}
                  style={S.criteriaCard}
                  className="submission-criteria-card"
                >
                  <div style={S.criteriaLabel}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: 'rgba(99,102,241,0.2)',
                        color: '#818cf8',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    {c.name}
                    {c.weight != null && (
                      <span style={S.weightBadge}>
                        {Math.round(c.weight * 100)}%
                      </span>
                    )}
                  </div>

                  {c.description && (
                    <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b' }}>
                      {c.description}
                    </p>
                  )}

                  {/* File URL / Link */}
                  <label style={S.label} htmlFor={`file-url-${c._id}`}>
                    📎 Link file / URL nộp bài
                  </label>
                  <input
                    id={`file-url-${c._id}`}
                    type="url"
                    placeholder="https://drive.google.com/... hoặc URL repo"
                    value={form[c._id]?.file_url || ''}
                    onChange={(e) => handleFieldChange(c._id, 'file_url', e.target.value)}
                    disabled={isLocked}
                    style={S.input(isLocked)}
                    className="submission-input"
                  />

                  {/* Note / Description */}
                  <label style={S.label} htmlFor={`note-${c._id}`}>
                    📝 Ghi chú (tuỳ chọn)
                  </label>
                  <textarea
                    id={`note-${c._id}`}
                    placeholder="Mô tả ngắn về nội dung bài nộp cho tiêu chí này..."
                    value={form[c._id]?.note || ''}
                    onChange={(e) => handleFieldChange(c._id, 'note', e.target.value)}
                    disabled={isLocked}
                    style={S.textarea(isLocked)}
                    className="submission-textarea"
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Submit button ── */}
          {criteria.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={isLocked || submitting}
              style={S.submitBtn(isLocked, submitting)}
              aria-label="Nộp bài chung kết"
            >
              {submitting ? (
                <>
                  <div style={{ ...S.spinner, width: 18, height: 18 }} />
                  Đang nộp bài...
                </>
              ) : isLocked ? (
                '🔒 Form đã khoá — Hết hạn nộp bài'
              ) : submission ? (
                '🔄 Cập nhật bài nộp'
              ) : (
                '🚀 Nộp bài'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
