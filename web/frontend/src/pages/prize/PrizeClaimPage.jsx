import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPrizeClaim, submitPrizeClaim } from '../../api/prize';
import RefreshButton from '../../components/RefreshButton';

export default function PrizeClaimPage() {
  const { prize_id, team_id } = useParams();
  const navigate = useNavigate();

  const [claim,    setClaim]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [form,     setForm]     = useState({ contact_name: '', contact_email: '', bank_info: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitErr,  setSubmitErr]  = useState(null);
  const [submitted,  setSubmitted]  = useState(false);

  const fetchClaim = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPrizeClaim(prize_id, team_id);
      setClaim(res.data?.claim || null);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Đội của bạn không được trao giải này.');
      } else if (err.response?.status === 404) {
        setError('Không tìm thấy giải thưởng.');
      } else {
        setError(err.response?.data?.message || 'Lỗi tải dữ liệu');
      }
    } finally {
      setLoading(false);
    }
  }, [prize_id, team_id]);

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contact_name.trim() || !form.contact_email.trim() || !form.bank_info.trim()) {
      setSubmitErr('Vui lòng điền đầy đủ Họ tên, Email và Thông tin ngân hàng.');
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    try {
      await submitPrizeClaim(prize_id, { team_id, ...form });
      setSubmitted(true);
      setClaim({ ...form, status: 'PENDING', submitted_at: new Date().toISOString() });
    } catch (err) {
      setSubmitErr(err.response?.data?.message || 'Lỗi gửi thông tin. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: 'var(--cyan)', letterSpacing: 1, fontFamily: 'var(--font-display)' }}>ĐANG TẢI...</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={s.card}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🚫</span>
        <h2 style={{ color: '#ef4444', fontFamily: 'var(--font-display)', marginBottom: 12, fontSize: '1.2rem' }}>Không có quyền truy cập</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>{error}</p>
        <button style={s.backBtn} onClick={() => navigate(-1)}>Quay lại</button>
      </div>
    </div>
  );

  const hasClaim = !!claim;
  const displayData = hasClaim ? claim : form;

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <header style={{ marginBottom: 32 }}>
          <button onClick={() => navigate(-1)} style={s.backLink}>← Quay lại</button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="gradient-text glow-text" style={s.title}>
              {hasClaim ? 'Thông tin nhận thưởng' : 'Điền thông tin nhận thưởng'}
            </h1>
            <RefreshButton onRefresh={fetchClaim} />
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.9rem' }}>
            {hasClaim
              ? 'Thông tin của bạn đã được ghi nhận. Ban tổ chức sẽ liên hệ sớm.'
              : 'Vui lòng điền đầy đủ thông tin để nhận giải thưởng từ ban tổ chức.'}
          </p>
        </header>

        {/* Success banner */}
        {submitted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
            <span style={{ fontSize: '1.4rem' }}>✅</span>
            <div>
              <strong style={{ color: '#22c55e', display: 'block' }}>Gửi thành công!</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ban tổ chức sẽ liên hệ với bạn qua email đã đăng ký.</span>
            </div>
          </div>
        )}

        {/* Status badge (khi đã có claim) */}
        {hasClaim && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, background: claim.status === 'CONFIRMED' ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)', border: `1px solid ${claim.status === 'CONFIRMED' ? 'rgba(34,197,94,.3)' : 'rgba(245,158,11,.3)'}`, borderRadius: 8, padding: '7px 16px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: claim.status === 'CONFIRMED' ? '#22c55e' : '#f59e0b' }}>
              {claim.status === 'CONFIRMED' ? '✓ ĐÃ XÁC NHẬN' : '⏳ ĐANG CHỜ XÁC NHẬN'}
            </span>
            {claim.submitted_at && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                — Gửi lúc {new Date(claim.submitted_at).toLocaleString('vi-VN')}
              </span>
            )}
          </div>
        )}

        {/* Form / Read-only */}
        <div style={s.formCard}>
          {hasClaim ? (
            /* Read-only view */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Họ tên người nhận', value: displayData.contact_name },
                { label: 'Email liên hệ',     value: displayData.contact_email },
                { label: 'Thông tin ngân hàng', value: displayData.bank_info },
                { label: 'Ghi chú',            value: displayData.note || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={s.fieldLabel}>{label}</p>
                  <p style={s.fieldValue}>{value}</p>
                </div>
              ))}
            </div>
          ) : (
            /* Submit form */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { key: 'contact_name',  label: 'Họ tên người nhận *',   type: 'text',  placeholder: 'Nguyễn Văn A' },
                { key: 'contact_email', label: 'Email liên hệ *',        type: 'email', placeholder: 'example@email.com' },
                { key: 'bank_info',     label: 'Thông tin ngân hàng *',  type: 'text',  placeholder: 'STK 1234567890 — Ngân hàng Vietcombank — Nguyễn Văn A' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label style={s.fieldLabel}>{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    style={s.input}
                    required
                  />
                </div>
              ))}

              <div>
                <label style={s.fieldLabel}>Ghi chú</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Thông tin bổ sung (tuỳ chọn)..."
                  rows={3}
                  style={{ ...s.input, resize: 'vertical', minHeight: 80 }}
                />
              </div>

              {submitErr && (
                <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: '0.85rem' }}>
                  ✗ {submitErr}
                </div>
              )}

              <button type="submit" disabled={submitting} style={s.submitBtn}>
                {submitting ? 'Đang gửi...' : '📨 Gửi thông tin nhận thưởng'}
              </button>
            </form>
          )}
        </div>

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const s = {
  page:       { background: 'var(--bg-primary)', minHeight: '100vh', padding: '40px 24px', color: 'var(--text-primary)' },
  container:  { maxWidth: 640, margin: '0 auto' },
  center:     { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', padding: 24, textAlign: 'center' },
  card:       { background: 'rgba(0,240,255,.05)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 32px', maxWidth: 480, width: '100%', backdropFilter: 'blur(12px)' },
  spinner:    { width: 48, height: 48, border: '4px solid rgba(0,240,255,.1)', borderTop: '4px solid var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 },
  title:      { fontSize: '1.8rem', fontWeight: 800, letterSpacing: 2, fontFamily: 'var(--font-display)', textTransform: 'uppercase', margin: '8px 0 0' },
  backLink:   { background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.88rem', padding: 0, marginBottom: 12, display: 'block' },
  backBtn:    { background: 'var(--gradient-primary)', color: 'white', padding: '10px 24px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' },
  formCard:   { background: 'rgba(17,24,39,.6)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 24px', backdropFilter: 'blur(10px)' },
  fieldLabel: { margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--cyan)' },
  fieldValue: { margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', padding: '10px 14px', background: 'rgba(0,240,255,.03)', border: '1px solid rgba(0,240,255,.1)', borderRadius: 8 },
  input:      { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(17,24,39,.8)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  submitBtn:  { padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', background: 'var(--gradient-primary)', color: 'white', border: 'none', boxShadow: 'var(--shadow-cyan)', marginTop: 4 },
};
