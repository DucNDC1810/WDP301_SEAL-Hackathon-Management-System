import { useEffect, useState, useCallback } from 'react';
import { message, Modal, Empty } from 'antd';
import { useApi } from '../../../hooks/useApi';
import '../student.css';

const Ico = ({ d, size = 14, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const UPLOAD = ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'];
const LINK   = ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'];
const CLOCK  = ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'];
const CHECK  = ['M20 6L9 17l-5-5'];
const WARN   = ['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'];
const EYE    = ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'];
const CAL    = ['M8 2v3', 'M16 2v3', 'M3 7h18', 'M3 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H3z'];

const STATUS_CFG = {
  SUBMITTED:     { label: 'Đã nộp đúng hạn',      cls: 'sp-badge--green',  icon: CHECK },
  LATE_PENDING:  { label: 'Nộp trễ — Chờ duyệt',  cls: 'sp-badge--orange', icon: CLOCK },
  LATE_APPROVED: { label: 'Nộp trễ — Đã duyệt',   cls: 'sp-badge--gold',   icon: CHECK },
  REJECTED:      { label: 'Bị từ chối',            cls: 'sp-badge--red',    icon: WARN  },
};

const fmtDate = (d) => {
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

function Countdown({ deadline }) {
  const [diff, setDiff] = useState(null);

  useEffect(() => {
    const tick = () => setDiff(new Date(deadline) - new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (diff === null) return null;
  if (diff <= 0) return <span className="sp-badge sp-badge--red"><Ico d={WARN} size={11} />Đã qua deadline</span>;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const urgent = diff < 3600000;

  return (
    <span className={`sp-badge ${urgent ? 'sp-badge--red' : 'sp-badge--cyan'}`}
      style={{ fontFamily: 'monospace', fontSize: 12 }}>
      <Ico d={CLOCK} size={11} />
      {h > 0 && `${h}h `}{pad(m)}m {pad(s)}s còn lại
    </span>
  );
}

const EMPTY_FORM = { repo_url: '', slide_url: '', demo_url: '', is_accessible: true };

export const StudentSubmitPage = () => {
  const { request } = useApi();
  const [messageApi, ctx] = message.useMessage();

  const [loading, setLoading]         = useState(true);
  const [team, setTeam]               = useState(null);
  const [contestId, setContestId]     = useState(null);
  const [activeRound, setActiveRound] = useState(null);
  const [submission, setSubmission]   = useState(null);
  const [subLoading, setSubLoading]   = useState(false);

  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Schedule state
  const [slots, setSlots]             = useState([]);
  const [myBooking, setMyBooking]     = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [confirmSlot, setConfirmSlot]   = useState(null);
  const [booking, setBooking]           = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Load team + active round
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await request('/api/teams/me');
        const teams = Array.isArray(res) ? res : res?.data ?? [];
        if (!teams.length) { setLoading(false); return; }
        const t = teams[0];
        setTeam(t);
        const cid = t.contest_id?._id ?? t.contest_id;
        setContestId(cid);
        if (!cid) { setLoading(false); return; }
        const contest = await request(`/api/contests/${cid}`);
        const contestData = contest?.data ?? contest;
        const rounds = contestData?.rounds ?? [];
        const active = rounds.find((r) => r.is_active);
        setActiveRound(active ?? null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load latest submission
  const loadSubmission = useCallback(async (roundId, teamId) => {
    setSubLoading(true);
    try {
      const data = await request(`/api/submissions?round_id=${roundId}`);
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const mine = list.find((s) => {
        const sid = s.team_id?._id ?? s.team_id;
        return sid?.toString() === teamId?.toString();
      });
      if (mine) {
        setSubmission(mine);
        setForm({
          repo_url: mine.repo_url ?? '',
          slide_url: mine.slide_url ?? '',
          demo_url: mine.demo_url ?? '',
          is_accessible: mine.is_accessible ?? true,
        });
      }
    } catch {
      // ignore
    } finally {
      setSubLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (!activeRound || !team) return;
    (async () => { await loadSubmission(activeRound._id, team._id); })();
  }, [activeRound, team, loadSubmission]);

  // Load slots after deadline
  useEffect(() => {
    if (!activeRound || !contestId) return;
    const passed = activeRound.submission_deadline
      ? new Date() > new Date(activeRound.submission_deadline)
      : false;

    const load = async () => {
      setSlotsLoading(true);
      try {
        if (passed) {
          // Past deadline: only fetch existing booking, no available slots
          const data = await request(
            `/api/presentation-slots/my-booking?contest_id=${contestId}&round_id=${activeRound._id}`
          );
          setMyBooking(data.booking ?? null);
          setSlots([]);
        } else if (submission) {
          // Has submission + before deadline: fetch available slots + booking
          const data = await request(
            `/api/presentation-slots/my-pool?contest_id=${contestId}&round_id=${activeRound._id}`
          );
          setSlots(data.slots ?? []);
          setMyBooking(data.myBooking ?? null);
        }
      } catch {
        setSlots([]);
        setMyBooking(null);
      } finally {
        setSlotsLoading(false);
      }
    };
    load();
  }, [activeRound, contestId, submission, request]);

  const validate = () => {
    const e = {};
    if (!form.repo_url.trim()) {
      e.repo_url = 'Vui lòng nhập link repository';
    } else if (!/github\.com|gitlab\.com/i.test(form.repo_url)) {
      e.repo_url = 'Chỉ chấp nhận GitHub hoặc GitLab';
    }
    if (!form.slide_url.trim()) {
      e.slide_url = 'Vui lòng nhập link slide';
    }
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); setShowConfirm(false); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await request('/api/submissions', {
        method: 'POST',
        body: {
          team_id: team._id,
          round_id: activeRound._id,
          repo_url: form.repo_url.trim(),
          slide_url: form.slide_url.trim(),
          demo_url: form.demo_url.trim() || undefined,
          is_accessible: form.is_accessible,
        },
      });
      messageApi.success(submission ? 'Cập nhật bài nộp thành công!' : 'Nộp bài thành công!');
      setShowConfirm(false);
      await loadSubmission(activeRound._id, team._id);
    } catch (err) {
      messageApi.error(err.message || 'Lỗi khi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleCancelBooking = async () => {
    if (!myBooking) return;
    setCancelling(true);
    try {
      await request(`/api/presentation-slots/${myBooking._id}/cancel-booking`, { method: 'DELETE' });
      messageApi.success('Hủy lịch thành công!');
      setMyBooking(null);
      setShowCancelConfirm(false);
      // reload slots
      const data = await request(
        `/api/presentation-slots/my-pool?contest_id=${contestId}&round_id=${activeRound._id}`
      );
      setSlots(data.slots ?? []);
    } catch (err) {
      messageApi.error(err.message || 'Hủy lịch thất bại');
    } finally {
      setCancelling(false);
    }
  };

  const isPastDeadline = activeRound?.submission_deadline
    ? new Date() > new Date(activeRound.submission_deadline)
    : false;

  if (loading) {
    return <div className="sp-loading"><div className="sp-spinner" /></div>;
  }

  if (!team) {
    return (
      <div className="sp-page">
        <h2 className="sp-page-title">Nộp bài</h2>
        <div className="sp-alert sp-alert--warning">
          <span className="sp-alert-icon"><Ico d={WARN} size={15} /></span>
          <div className="sp-alert-body">
            <span className="sp-alert-title">Bạn chưa có đội thi</span>
            <span className="sp-alert-desc">Vào tab Đội thi để tạo hoặc tham gia đội.</span>
          </div>
        </div>
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="sp-page">
        <h2 className="sp-page-title">Nộp bài</h2>
        <div className="sp-alert sp-alert--info">
          <span className="sp-alert-icon"><Ico d={CLOCK} size={15} /></span>
          <div className="sp-alert-body">
            <span className="sp-alert-title">Hiện chưa có vòng thi nào đang diễn ra</span>
            <span className="sp-alert-desc">Bài nộp chỉ được nhận khi có vòng thi active.</span>
          </div>
        </div>
      </div>
    );
  }

  const statusCfg = submission ? (STATUS_CFG[submission.status] ?? STATUS_CFG.SUBMITTED) : null;

  return (
    <div className="sp-page">
      {ctx}

      {/* Header */}
      <div className="sp-flex--between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <h2 className="sp-page-title">Nộp bài</h2>
        {activeRound.submission_deadline && (
          <Countdown deadline={activeRound.submission_deadline} />
        )}
      </div>

      {/* Two-column layout */}
      <div style={{ position: 'relative' }}>

      {/* LEFT 60% — submission */}
      <div style={{ width: '60%', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Round info */}
      <div className="sp-card" style={{ borderTopWidth: 2, borderTopColor: 'var(--pg-accent)' }}>
        <div className="sp-flex sp-gap-3" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <span className="sp-label">VÒNG ĐANG DIỄN RA</span>
            <div className="sp-strong" style={{ fontSize: '1rem', marginTop: 4 }}>{activeRound.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="sp-label">HẠN NỘP BÀI</span>
            <div className="sp-strong" style={{ marginTop: 4, color: isPastDeadline ? 'var(--pg-red)' : 'var(--pg-text2)' }}>
              {fmtDate(activeRound.submission_deadline)}
            </div>
          </div>
        </div>
      </div>

      {/* Late submission warning */}
      {isPastDeadline && (
        <div className="sp-alert sp-alert--warning">
          <span className="sp-alert-icon"><Ico d={WARN} size={15} /></span>
          <div className="sp-alert-body">
            <span className="sp-alert-title">Đã qua hạn nộp bài</span>
            <span className="sp-alert-desc">
              Bài nộp lúc này sẽ được đánh dấu <strong>nộp trễ</strong> và cần admin phê duyệt trước khi được tính điểm.
            </span>
          </div>
        </div>
      )}

      {/* Current submission status */}
      {subLoading ? (
        <div className="sp-loading" style={{ minHeight: 60 }}><div className="sp-spinner" /></div>
      ) : submission && (
        <div className="sp-card" style={{ borderTopWidth: 2, borderTopColor: submission.status === 'SUBMITTED' || submission.status === 'LATE_APPROVED' ? 'var(--pg-green)' : submission.status === 'REJECTED' ? 'var(--pg-red)' : 'var(--pg-amber)' }}>
          <div className="sp-flex--between" style={{ marginBottom: 14 }}>
            <span className="sp-label">BÀI NỘP HIỆN TẠI</span>
            <span className={`sp-badge ${statusCfg.cls}`}>
              <Ico d={statusCfg.icon} size={11} />
              {statusCfg.label}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="sp-flex sp-gap-2">
              <span className="sp-muted" style={{ minWidth: 90, flexShrink: 0 }}>Repository</span>
              <a href={submission.repo_url} target="_blank" rel="noopener noreferrer"
                className="sp-accent" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                <Ico d={LINK} size={12} /> {submission.repo_url}
              </a>
            </div>
            <div className="sp-flex sp-gap-2">
              <span className="sp-muted" style={{ minWidth: 90, flexShrink: 0 }}>Slide</span>
              <a href={submission.slide_url} target="_blank" rel="noopener noreferrer"
                className="sp-accent" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                <Ico d={LINK} size={12} /> {submission.slide_url}
              </a>
            </div>
            {submission.demo_url && (
              <div className="sp-flex sp-gap-2">
                <span className="sp-muted" style={{ minWidth: 90, flexShrink: 0 }}>Demo</span>
                <a href={submission.demo_url} target="_blank" rel="noopener noreferrer"
                  className="sp-accent" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                  <Ico d={LINK} size={12} /> {submission.demo_url}
                </a>
              </div>
            )}
            <div className="sp-flex sp-gap-2">
              <span className="sp-muted" style={{ minWidth: 90, flexShrink: 0 }}>Nộp lúc</span>
              <span className="sp-text">{fmtDate(submission.submitted_at)}</span>
            </div>
            {submission.status === 'LATE_PENDING' && (
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--pg-amber)' }}>
                Trễ {submission.late_duration} phút so với deadline
              </div>
            )}
            {submission.status === 'REJECTED' && (
              <div className="sp-alert sp-alert--warning" style={{ marginTop: 4 }}>
                <span className="sp-alert-icon"><Ico d={WARN} size={13} /></span>
                <div className="sp-alert-body">
                  <span className="sp-alert-title">Lý do từ chối</span>
                  <span className="sp-alert-desc">{submission.reason ?? 'Không có lý do cụ thể'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit / Update form */}
      <div className="sp-table-wrap">
        <div className="sp-card-head">
          <div className="sp-flex sp-gap-2">
            <div className="sp-card-icon"><Ico d={UPLOAD} size={14} /></div>
            <span className="sp-strong">{submission ? 'Cập nhật bài nộp' : 'Nộp bài'}</span>
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* repo_url */}
          <div>
            <label className="sp-label" style={{ marginBottom: 6 }}>
              LINK REPOSITORY *
              <span className="sp-muted" style={{ fontWeight: 400, textTransform: 'none', marginLeft: 8 }}>
                GitHub hoặc GitLab
              </span>
            </label>
            <input
              value={form.repo_url}
              placeholder="https://github.com/your-org/your-repo"
              onChange={(e) => { setForm(f => ({ ...f, repo_url: e.target.value })); setErrors(er => ({ ...er, repo_url: null })); }}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                border: `1px solid ${errors.repo_url ? 'var(--pg-red)' : 'var(--pg-border)'}`,
                background: 'var(--pg-input-bg, #080e1a)', color: 'var(--pg-text2)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            {errors.repo_url && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--pg-red)' }}>{errors.repo_url}</div>}
          </div>

          {/* slide_url */}
          <div>
            <label className="sp-label" style={{ marginBottom: 6 }}>
              LINK SLIDE *
              <span className="sp-muted" style={{ fontWeight: 400, textTransform: 'none', marginLeft: 8 }}>
                Google Slides, Canva, PowerPoint Online
              </span>
            </label>
            <input
              value={form.slide_url}
              placeholder="https://docs.google.com/presentation/..."
              onChange={(e) => { setForm(f => ({ ...f, slide_url: e.target.value })); setErrors(er => ({ ...er, slide_url: null })); }}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                border: `1px solid ${errors.slide_url ? 'var(--pg-red)' : 'var(--pg-border)'}`,
                background: 'var(--pg-input-bg, #080e1a)', color: 'var(--pg-text2)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            {errors.slide_url && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--pg-red)' }}>{errors.slide_url}</div>}
          </div>

          {/* demo_url */}
          <div>
            <label className="sp-label" style={{ marginBottom: 6 }}>
              LINK DEMO
              <span className="sp-muted" style={{ fontWeight: 400, textTransform: 'none', marginLeft: 8 }}>
                Tuỳ chọn — YouTube, Loom, v.v.
              </span>
            </label>
            <input
              value={form.demo_url}
              placeholder="https://youtube.com/..."
              onChange={(e) => setForm(f => ({ ...f, demo_url: e.target.value }))}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--pg-border)',
                background: 'var(--pg-input-bg, #080e1a)', color: 'var(--pg-text2)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* is_accessible */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <div
              onClick={() => setForm(f => ({ ...f, is_accessible: !f.is_accessible }))}
              style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${form.is_accessible ? 'var(--pg-accent)' : 'var(--pg-border)'}`,
                background: form.is_accessible ? 'var(--pg-accent-bg)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .2s',
              }}
            >
              {form.is_accessible && <Ico d={CHECK} size={11} sw={2.5} />}
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--pg-text2)' }}>
              <Ico d={EYE} size={13} />
              Repository có thể truy cập công khai (public)
            </span>
          </label>

          {/* Submit button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              className="sp-btn sp-btn--primary"
              style={{ padding: '9px 28px', fontSize: 14, opacity: isPastDeadline ? 0.4 : 1, cursor: isPastDeadline ? 'not-allowed' : 'pointer' }}
              disabled={submitting || isPastDeadline}
              title={isPastDeadline ? 'Đã qua hạn nộp bài' : undefined}
              onClick={() => {
                const e = validate();
                if (Object.keys(e).length) { setErrors(e); return; }
                setErrors({});
                setShowConfirm(true);
              }}
            >
              <Ico d={UPLOAD} size={14} />
              {submitting ? 'Đang xử lý...' : submission ? 'Cập nhật bài nộp' : 'Nộp bài'}
            </button>
          </div>
        </div>
      </div>

      </div>{/* /LEFT col */}

      {/* RIGHT 40% — absolute so it doesn't affect wrapper height */}
      <div className="sp-schedule-panel" style={{
        position: 'absolute', left: 'calc(60% + 16px)', right: 0, top: 0, bottom: 0,
        overflowY: 'scroll',
        background: 'var(--pg-card-bg, #0d1825)',
        border: '1px solid var(--pg-border)',
        borderRadius: 12, padding: 16, boxSizing: 'border-box',
      }}>

      {/* ── LỊCH TRÌNH BÀY ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="sp-flex sp-gap-2" style={{ marginBottom: 4 }}>
          <div className="sp-card-icon"><Ico d={CAL} size={14} /></div>
          <span className="sp-strong" style={{ fontSize: '0.95rem' }}>Lịch trình bày</span>
        </div>

        {/* Already booked */}
        {myBooking && (
          <div className="sp-card" style={{ borderTopWidth: 2, borderTopColor: 'var(--pg-green)' }}>
            <div className="sp-flex sp-gap-3">
              <div className="sp-card-icon" style={{ background: 'rgba(34,197,94,.12)', color: 'var(--pg-green)' }}>
                <Ico d={CHECK} size={14} />
              </div>
              <div>
                <div className="sp-flex--between" style={{ marginBottom: 2 }}>
                  <span className="sp-label">LỊCH ĐÃ ĐẶT</span>
                  <button
                    className="sp-btn sp-btn--sm sp-btn--danger"
                    disabled={isPastDeadline}
                    title={isPastDeadline ? 'Đã qua hạn nộp bài' : undefined}
                    style={{ opacity: isPastDeadline ? 0.4 : 1, cursor: isPastDeadline ? 'not-allowed' : 'pointer' }}
                    onClick={() => !isPastDeadline && setShowCancelConfirm(true)}>
                    Hủy lịch
                  </button>
                </div>
                <div className="sp-flex sp-gap-3" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                  <div>
                    <span className="sp-muted" style={{ fontSize: 11 }}>BẮT ĐẦU</span>
                    <div className="sp-strong" style={{ marginTop: 2 }}>{fmtDate(myBooking.start_time)}</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--pg-border)', alignSelf: 'stretch' }} />
                  <div>
                    <span className="sp-muted" style={{ fontSize: 11 }}>KẾT THÚC</span>
                    <div className="sp-strong" style={{ marginTop: 2 }}>{fmtDate(myBooking.end_time)}</div>
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

        {/* Chưa nộp bài */}
        {!submission && !myBooking && (
          <div className="sp-alert sp-alert--warning">
            <span className="sp-alert-icon"><Ico d={WARN} size={15} /></span>
            <div className="sp-alert-body">
              <span className="sp-alert-title">Chưa nộp bài</span>
              <span className="sp-alert-desc">Nộp bài trước để mở đăng ký lịch trình bày.</span>
            </div>
          </div>
        )}

        {/* Hết deadline */}
        {isPastDeadline && !myBooking && (
          <div className="sp-alert sp-alert--warning">
            <span className="sp-alert-icon"><Ico d={WARN} size={15} /></span>
            <div className="sp-alert-body">
              <span className="sp-alert-title">Đã hết hạn đăng ký</span>
              <span className="sp-alert-desc">
                Hạn nộp bài đã qua lúc{' '}
                <strong style={{ color: 'var(--pg-amber)' }}>{fmtDate(activeRound.submission_deadline)}</strong>.
                Liên hệ admin nếu cần hỗ trợ.
              </span>
            </div>
          </div>
        )}

        {/* Available slots */}
        {submission && !isPastDeadline && !myBooking && (
          <div className="sp-table-wrap">
            <div className="sp-card-head">
              <span className="sp-strong">Slot trống — {activeRound.name}</span>
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
                        <div>{fmtDate(s.start_time)}</div>
                        <div style={{ fontSize: 11, color: 'var(--pg-muted)', marginTop: 2 }}>→ {fmtDate(s.end_time)}</div>
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
      </div>

      </div>{/* /RIGHT col */}
      </div>{/* /two-col wrapper */}

      {/* Confirm submit modal */}
      <Modal
        title={submission ? 'Xác nhận cập nhật bài nộp' : 'Xác nhận nộp bài'}
        open={showConfirm}
        onOk={handleSubmit}
        onCancel={() => setShowConfirm(false)}
        okText={submission ? 'Cập nhật' : 'Nộp bài'}
        cancelText="Kiểm tra lại"
        confirmLoading={submitting}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0', fontSize: 13 }}>
          {isPastDeadline && (
            <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 8, padding: '10px 14px', color: '#f59e0b', fontWeight: 600 }}>
              ⚠ Bài nộp này sẽ bị đánh dấu TRỄ và chờ admin phê duyệt.
            </div>
          )}
          {submission && (
            <div style={{ color: '#94a3b8' }}>
              Bài nộp mới sẽ thay thế bài cũ. Hành động này không thể hoàn tác.
            </div>
          )}
          <div style={{ background: '#0c1524', border: '1px solid #162036', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#3a5068', minWidth: 80 }}>Repo</span>
              <span style={{ color: '#00d4ff', wordBreak: 'break-all' }}>{form.repo_url}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#3a5068', minWidth: 80 }}>Slide</span>
              <span style={{ color: '#c9d6e8', wordBreak: 'break-all' }}>{form.slide_url}</span>
            </div>
            {form.demo_url && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: '#3a5068', minWidth: 80 }}>Demo</span>
                <span style={{ color: '#c9d6e8', wordBreak: 'break-all' }}>{form.demo_url}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirm book modal */}
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
              Bạn sẽ đặt slot trình bày sau.{' '}
              <strong style={{ color: '#f59e0b' }}>Chỉ admin mới có thể huỷ lịch sau khi đặt.</strong>
            </div>
            <div style={{ background: '#0c1524', border: '1px solid #162036', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px' }}>BẮT ĐẦU</div>
                <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{fmtDate(confirmSlot.start_time)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '.5px' }}>KẾT THÚC</div>
                <div style={{ color: '#c9d6e8', fontWeight: 600, marginTop: 2 }}>{fmtDate(confirmSlot.end_time)}</div>
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

      {/* Confirm cancel booking modal */}
      <Modal
        title="Xác nhận hủy lịch trình bày"
        open={showCancelConfirm}
        onOk={handleCancelBooking}
        onCancel={() => setShowCancelConfirm(false)}
        okText="Hủy lịch"
        okButtonProps={{ danger: true }}
        cancelText="Giữ lại"
        confirmLoading={cancelling}
      >
        <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>
          Sau khi hủy, slot sẽ được trả về danh sách trống và đội khác có thể đăng ký. Bạn có thể đặt lại slot khác trước hạn nộp bài.
        </div>
      </Modal>
    </div>
  );
};
