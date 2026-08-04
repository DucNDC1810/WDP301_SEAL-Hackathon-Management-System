import { useEffect, useState, useCallback } from 'react';
import { message, Modal, Empty } from 'antd';
import { useApi } from '../../../hooks/useApi';
import { getRoundStatus, getRoundStatusKey } from '../../../utils/roundStatus';
import '../student.css';
import { useTheme } from '../../../context/ThemeContext';
import { getStudentColors } from '../studentColors';

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

function Countdown({ deadline, C }) {
  const [diff, setDiff] = useState(null);

  useEffect(() => {
    const tick = () => setDiff(new Date(deadline) - new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (diff === null) return null;

  if (diff <= 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
        color: C.red, background: 'rgba(248,113,113,.08)',
        border: '1px solid rgba(248,113,113,.3)', borderRadius: 8,
        padding: '7px 14px',
      }}>
        <Ico d={WARN} size={13} />
        Đã qua deadline
      </div>
    );
  }

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const urgent = diff < 3600000;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
      color: urgent ? C.red : C.cyan,
      background: urgent ? 'rgba(248,113,113,.08)' : 'rgba(0,212,255,.08)',
      border: `1px solid ${urgent ? 'rgba(248,113,113,.3)' : 'rgba(0,212,255,.3)'}`,
      borderRadius: 8, padding: '7px 14px',
    }}>
      <Ico d={CLOCK} size={13} />
      {h > 0 && `${h}h `}{pad(m)}m {pad(s)}s còn lại
    </div>
  );
}

const EMPTY_FORM = { repo_url: '', slide_url: '', demo_url: '', is_accessible: true };

export const StudentSubmitPage = () => {
  const { request } = useApi();
  const [messageApi, ctx] = message.useMessage();
  const { theme } = useTheme();
  const C = getStudentColors(theme);

  const STATUS_CFG = {
    SUBMITTED:     { label: 'Đã nộp đúng hạn',      color: C.green,  borderColor: 'rgba(34,197,94,.4)',   bg: 'rgba(34,197,94,.08)',  icon: CHECK },
    LATE_PENDING:  { label: 'Nộp trễ — Chờ duyệt',  color: C.amber,  borderColor: 'rgba(245,158,11,.4)',  bg: 'rgba(245,158,11,.08)', icon: CLOCK },
    LATE_APPROVED: { label: 'Nộp trễ — Đã duyệt',   color: C.gold,   borderColor: 'rgba(250,204,21,.4)',  bg: 'rgba(250,204,21,.08)', icon: CHECK },
    REJECTED:      { label: 'Bị từ chối',            color: C.red,    borderColor: 'rgba(248,113,113,.4)', bg: 'rgba(248,113,113,.08)',icon: WARN  },
  };

  // Shared styles
  const cardStyle = {
    border: `1px solid ${C.line}`,
    borderRadius: 14,
    background: C.card,
    overflow: 'hidden',
  };

  const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: 9,
    border: `1px solid ${C.line}`, background: C.card,
    color: C.text, fontFamily: 'inherit', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.5px',
    color: C.dim, marginBottom: 5,
  };

  const [loading, setLoading]           = useState(true);
  const [team, setTeam]                 = useState(null);
  const [contestId, setContestId]       = useState(null);
  const [rounds, setRounds]             = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [submission, setSubmission]     = useState(null);
  const [subLoading, setSubLoading]     = useState(false);

  const [form, setForm]               = useState(EMPTY_FORM);
  const [errors, setErrors]           = useState({});
  const [submitting, setSubmitting]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Schedule state
  const [slots, setSlots]             = useState([]);
  const [myBooking, setMyBooking]     = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [confirmSlot, setConfirmSlot]   = useState(null);
  const [booking, setBooking]           = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Load team + all rounds
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
        const allRounds = contestData?.rounds ?? [];
        setRounds(allRounds);
        // Only default to an actually active round — no fallback to latest.
        // A round stays `is_active: true` after scoring is locked, so checking that
        // flag alone would keep showing an ended round as submittable forever.
        const active = allRounds.find((r) => getRoundStatusKey(r) === 'active') ?? null;
        setSelectedRound(active);
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
    if (!selectedRound || !team) return;
    setSubmission(null);
    setForm(EMPTY_FORM);
    (async () => { await loadSubmission(selectedRound._id, team._id); })();
  }, [selectedRound, team, loadSubmission]);

  // Load slots after deadline
  useEffect(() => {
    if (!selectedRound || !contestId) return;
    if (selectedRound.round_number <= 1) {
      setSlots([]);
      setMyBooking(null);
      return;
    }
    const passed = selectedRound.submission_deadline
      ? new Date() > new Date(selectedRound.submission_deadline)
      : false;

    const load = async () => {
      setSlotsLoading(true);
      try {
        if (passed) {
          // Past deadline: only fetch existing booking, no available slots
          const data = await request(
            `/api/presentation-slots/my-booking?contest_id=${contestId}&round_id=${selectedRound._id}`
          );
          setMyBooking(data.booking ?? null);
          setSlots([]);
        } else if (submission) {
          // Has submission + before deadline: fetch available slots + booking
          const data = await request(
            `/api/presentation-slots/my-pool?contest_id=${contestId}&round_id=${selectedRound._id}`
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
  }, [selectedRound, contestId, submission, request]);

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
          round_id: selectedRound._id,
          repo_url: form.repo_url.trim(),
          slide_url: form.slide_url.trim(),
          demo_url: form.demo_url.trim() || undefined,
          is_accessible: form.is_accessible,
        },
      });
      messageApi.success(submission ? 'Cập nhật bài nộp thành công!' : 'Nộp bài thành công!');
      setShowConfirm(false);
      await loadSubmission(selectedRound._id, team._id);
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
        `/api/presentation-slots/my-pool?contest_id=${contestId}&round_id=${selectedRound._id}`
      );
      setSlots(data.slots ?? []);
    } catch (err) {
      messageApi.error(err.message || 'Hủy lịch thất bại');
    } finally {
      setCancelling(false);
    }
  };

  const isPastDeadline = selectedRound?.submission_deadline
    ? new Date() > new Date(selectedRound.submission_deadline)
    : false;

  if (loading) {
    return <div className="sp-loading"><div className="sp-spinner" /></div>;
  }

  const pageHeader = (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: C.dim, letterSpacing: 1, marginBottom: 6 }}>Bài dự thi</div>
      <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>Nộp bài</h2>
    </div>
  );

  if (!team) {
    return (
      <div style={{ padding: '28px 32px', background: C.bg }}>
        {pageHeader}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 12, padding: '14px 18px' }}>
          <span style={{ color: C.amber, marginTop: 1 }}><Ico d={WARN} size={16} /></span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Bạn chưa có đội thi</div>
            <div style={{ fontSize: 13, color: C.muted }}>Vào tab Đội thi để tạo hoặc tham gia đội.</div>
          </div>
        </div>
      </div>
    );
  }

  if (team.status !== 'CONFIRMED' && !(team.status === 'ACTIVE' && team.contest_id)) {
    return (
      <div style={{ padding: '28px 32px', background: C.bg }}>
        {pageHeader}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 12, padding: '14px 18px' }}>
          <span style={{ color: C.amber, marginTop: 1 }}><Ico d={WARN} size={16} /></span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Đội thi chưa được phê duyệt</div>
            <div style={{ fontSize: 13, color: C.muted }}>
              Đội <strong style={{ color: C.text2 }}>{team.team_name}</strong> đang ở trạng thái <strong style={{ color: C.amber }}>{team.status}</strong>.
              Vui lòng chờ admin phê duyệt trước khi nộp bài.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedRound) {
    return (
      <div style={{ padding: '28px 32px', minHeight: '100vh', background: C.bg }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: C.dim, letterSpacing: 1, marginBottom: 6 }}>Bài dự thi</div>
          <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>Nộp bài</h2>
        </div>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(0,212,255,.06)', border: '1px solid rgba(0,212,255,.2)',
          borderRadius: 12, padding: '14px 18px',
        }}>
          <span style={{ color: C.cyan, marginTop: 1 }}><Ico d={CLOCK} size={16} /></span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Hiện chưa có vòng thi nào</div>
            <div style={{ fontSize: 13, color: C.muted }}>Liên hệ ban tổ chức để biết thêm thông tin.</div>
          </div>
        </div>
      </div>
    );
  }

  const statusCfg = submission ? (STATUS_CFG[submission.status] ?? STATUS_CFG.SUBMITTED) : null;

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: C.bg }}>
      {ctx}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: C.dim, letterSpacing: 1, marginBottom: 6 }}>
            Bài dự thi
          </div>
          <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
            Nộp bài
          </h2>
        </div>
        {selectedRound.submission_deadline && (
          <Countdown deadline={selectedRound.submission_deadline} C={C} />
        )}
      </div>

      {/* Round selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ ...labelStyle, marginBottom: 6 }}>Chọn vòng thi</label>
        <div style={{ position: 'relative', display: 'inline-block', minWidth: 260 }}>
          <select
            value={selectedRound._id}
            onChange={(e) => {
              const r = rounds.find(r => r._id === e.target.value);
              if (r) setSelectedRound(r);
            }}
            style={{
              width: '100%', padding: '8px 36px 8px 14px', borderRadius: 8,
              border: `1px solid ${C.line}`, background: C.card, color: C.text2,
              fontSize: 13, fontFamily: 'inherit', appearance: 'none',
              outline: 'none', cursor: 'pointer',
            }}
          >
            {rounds.filter(r => getRoundStatusKey(r) === 'active').map((r) => (
              <option key={r._id} value={r._id}>
                {r.name} ({getRoundStatus(r).label})
              </option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: C.muted, pointerEvents: 'none' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedRound?.round_number > 1 ? '1.4fr 1fr' : '1fr', gap: 18, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Round info card */}
          <div style={{
            ...cardStyle,
            borderTop: `2px solid ${selectedRound.is_active ? C.cyan : C.line}`,
            padding: '18px 22px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={labelStyle}>Vòng thi</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                    {selectedRound.name}
                  </span>
                  {selectedRound.is_active && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: C.cyan,
                      background: 'rgba(0,212,255,.08)', border: '1px solid rgba(0,212,255,.25)',
                      borderRadius: 20, padding: '2px 8px',
                    }}>
                      Đang diễn ra
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={labelStyle}>Hạn nộp bài</span>
                <div style={{
                  marginTop: 4, fontSize: 13, fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isPastDeadline ? C.red : C.text2,
                }}>
                  {fmtDate(selectedRound.submission_deadline)}
                </div>
              </div>
            </div>
          </div>

          {/* Late / Locked submission warning */}
          {selectedRound?.scoring_locked ? (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.25)',
              borderRadius: 10, padding: '12px 16px',
            }}>
              <span style={{ color: C.red, marginTop: 1 }}><Ico d={WARN} size={15} /></span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Đã khóa chấm điểm</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                  Vòng thi này đã khóa chấm điểm. Bạn không thể nộp hoặc cập nhật bài dự thi được nữa.
                </div>
              </div>
            </div>
          ) : (
            isPastDeadline && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.25)',
                borderRadius: 10, padding: '12px 16px',
              }}>
                <span style={{ color: C.amber, marginTop: 1 }}><Ico d={WARN} size={15} /></span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Đã qua hạn nộp bài</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                    Bài nộp lúc này sẽ được đánh dấu <strong style={{ color: C.amber }}>nộp trễ</strong> và cần admin phê duyệt trước khi được tính điểm.
                  </div>
                </div>
              </div>
            )
          )}

          {/* Current submission status */}
          {subLoading ? (
            <div className="sp-loading" style={{ minHeight: 60 }}><div className="sp-spinner" /></div>
          ) : submission && statusCfg && (
            <div style={{
              ...cardStyle,
              borderTop: `2px solid ${statusCfg.borderColor}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderBottom: `1px solid ${C.line}`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: C.dim }}>
                  Bài nộp hiện tại
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 700, color: statusCfg.color,
                  background: statusCfg.bg, border: `1px solid ${statusCfg.borderColor}`,
                  borderRadius: 20, padding: '3px 10px',
                }}>
                  <Ico d={statusCfg.icon} size={11} />
                  {statusCfg.label}
                </span>
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.dim, minWidth: 80, flexShrink: 0 }}>Repository</span>
                  <a href={submission.repo_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, color: C.cyan, wordBreak: 'break-all', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Ico d={LINK} size={12} /> {submission.repo_url}
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.dim, minWidth: 80, flexShrink: 0 }}>Slide</span>
                  <a href={submission.slide_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, color: C.cyan, wordBreak: 'break-all', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Ico d={LINK} size={12} /> {submission.slide_url}
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.dim, minWidth: 80, flexShrink: 0 }}>Nộp lúc</span>
                  <span style={{ fontSize: 13, color: C.text2 }}>{fmtDate(submission.submitted_at)}</span>
                </div>
                {submission.status === 'LATE_PENDING' && (
                  <div style={{ fontSize: 12, color: C.amber }}>
                    Trễ {submission.late_duration} phút so với deadline
                  </div>
                )}
                {submission.status === 'REJECTED' && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.2)',
                    borderRadius: 8, padding: '10px 12px', marginTop: 4,
                  }}>
                    <span style={{ color: C.red }}><Ico d={WARN} size={13} /></span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 2 }}>Lý do từ chối</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{submission.reason ?? 'Không có lý do cụ thể'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit / Update form card */}
          <div style={{ ...cardStyle }}>
            {/* Form header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 18px', borderBottom: `1px solid ${C.line}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(0,212,255,.08)', border: '1px solid rgba(0,212,255,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.cyan, flexShrink: 0,
              }}>
                <Ico d={UPLOAD} size={15} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                {submission ? 'Cập nhật bài nộp' : 'Nộp bài dự thi'}
              </span>
            </div>

            <div style={{ padding: '22px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* repo_url */}
              <div>
                <label style={labelStyle}>
                  Link Repository *
                  <span style={{ fontWeight: 400, textTransform: 'none', color: C.muted, marginLeft: 8, letterSpacing: 0 }}>
                    GitHub hoặc GitLab
                  </span>
                </label>
                <input
                  value={form.repo_url}
                  placeholder="https://github.com/your-org/your-repo"
                  disabled={selectedRound?.scoring_locked || false}
                  onChange={(e) => { setForm(f => ({ ...f, repo_url: e.target.value })); setErrors(er => ({ ...er, repo_url: null })); }}
                  style={{ ...inputStyle, borderColor: errors.repo_url ? C.red : C.line }}
                />
                {errors.repo_url && <div style={{ marginTop: 4, fontSize: 12, color: C.red }}>{errors.repo_url}</div>}
              </div>

              {/* slide_url */}
              <div>
                <label style={labelStyle}>
                  Link Slide *
                  <span style={{ fontWeight: 400, textTransform: 'none', color: C.muted, marginLeft: 8, letterSpacing: 0 }}>
                    Google Slides, Canva
                  </span>
                </label>
                <input
                  value={form.slide_url}
                  placeholder="https://docs.google.com/presentation/..."
                  disabled={selectedRound?.scoring_locked || false}
                  onChange={(e) => { setForm(f => ({ ...f, slide_url: e.target.value })); setErrors(er => ({ ...er, slide_url: null })); }}
                  style={{ ...inputStyle, borderColor: errors.slide_url ? C.red : C.line }}
                />
                {errors.slide_url && <div style={{ marginTop: 4, fontSize: 12, color: C.red }}>{errors.slide_url}</div>}
              </div>

              {/* is_accessible checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: selectedRound?.scoring_locked ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
                <div
                  onClick={() => !selectedRound?.scoring_locked && setForm(f => ({ ...f, is_accessible: !f.is_accessible }))}
                  style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${form.is_accessible ? C.cyan : C.line}`,
                    background: form.is_accessible ? 'rgba(0,212,255,.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .2s', color: C.cyan,
                  }}
                >
                  {form.is_accessible && <Ico d={CHECK} size={11} sw={2.5} />}
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.text2 }}>
                  <Ico d={EYE} size={13} />
                  Repository có thể truy cập công khai (public)
                </span>
              </label>

              {/* Submit button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <button
                  disabled={submitting || selectedRound?.scoring_locked}
                  title={selectedRound?.scoring_locked ? 'Đã khóa chấm điểm' : undefined}
                  onClick={() => {
                    const e = validate();
                    if (Object.keys(e).length) { setErrors(e); return; }
                    setErrors({});
                    setShowConfirm(true);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 22px', borderRadius: 9, border: 'none',
                    background: selectedRound?.scoring_locked ? C.line : 'linear-gradient(90deg,#00d4ff,#0099bb)',
                    color: selectedRound?.scoring_locked ? C.dim : '#000',
                    fontSize: 14, fontWeight: 700, cursor: selectedRound?.scoring_locked ? 'not-allowed' : 'pointer',
                    opacity: submitting ? .7 : 1, transition: 'opacity .2s',
                  }}
                >
                  <Ico d={UPLOAD} size={14} />
                  {submitting ? 'Đang xử lý...' : submission ? 'Cập nhật bài nộp' : '⬆ Nộp bài'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column (schedule) ── */}
        {selectedRound?.round_number > 1 && (
          <div style={{
            border: `1px solid ${C.line}`, borderRadius: 14,
            background: C.card2, padding: 18,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(0,212,255,.08)', border: '1px solid rgba(0,212,255,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.cyan, flexShrink: 0,
            }}>
              <Ico d={CAL} size={15} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Lịch trình bày</span>
          </div>

          {/* Chưa nộp bài warning */}
          {!submission && !myBooking && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.22)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <span style={{ color: C.amber, marginTop: 1 }}><Ico d={WARN} size={14} /></span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Chưa nộp bài</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                  Nộp bài trước để mở đặt lịch trình bày...
                </div>
              </div>
            </div>
          )}

          {/* Already has booking */}
          {myBooking && (
            <div style={{
              border: '1px solid rgba(34,197,94,.25)', borderRadius: 12,
              background: 'rgba(34,197,94,.04)', padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.dim }}>Lịch đã đặt</span>
                <button
                  disabled={isPastDeadline}
                  title={isPastDeadline ? 'Đã qua hạn' : undefined}
                  style={{
                    fontSize: 11, fontWeight: 700, color: C.red,
                    background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
                    borderRadius: 6, padding: '4px 10px', cursor: isPastDeadline ? 'not-allowed' : 'pointer',
                    opacity: isPastDeadline ? .5 : 1,
                  }}
                  onClick={() => !isPastDeadline && setShowCancelConfirm(true)}
                >
                  Hủy lịch
                </button>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>Bắt đầu</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>{fmtDate(myBooking.start_time)}</div>
                </div>
                <div style={{ width: 1, background: C.line, alignSelf: 'stretch' }} />
                <div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>Kết thúc</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>{fmtDate(myBooking.end_time)}</div>
                </div>
                {myBooking.room && (
                  <>
                    <div style={{ width: 1, background: C.line, alignSelf: 'stretch' }} />
                    <div>
                      <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>Phòng</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>{myBooking.room}</div>
                    </div>
                  </>
                )}
                <div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>Thời lượng</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>{fmtDuration(myBooking.start_time, myBooking.end_time)}</div>
                </div>
              </div>
              {myBooking.note && (
                <div style={{
                  marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.5,
                  background: 'rgba(0,212,255,.04)', border: '1px solid rgba(0,212,255,.15)',
                  borderRadius: 6, padding: '8px 10px',
                }}>
                  {myBooking.note}
                </div>
              )}
            </div>
          )}

          {/* Past deadline, no booking */}
          {isPastDeadline && !myBooking && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.22)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <span style={{ color: C.amber }}><Ico d={WARN} size={14} /></span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Đã hết hạn đăng ký</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                  Hạn nộp bài đã qua lúc{' '}
                  <strong style={{ color: C.amber }}>{fmtDate(selectedRound.submission_deadline)}</strong>.
                  Liên hệ admin nếu cần hỗ trợ.
                </div>
              </div>
            </div>
          )}

          {/* Available slots */}
          {submission && !isPastDeadline && !myBooking && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  Slot trống — {selectedRound.name}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>
                  {slotsLoading ? 'Đang tải...' : `${slots.length} slot khả dụng`}
                </span>
              </div>

              {slotsLoading ? (
                <div className="sp-loading" style={{ minHeight: 60 }}><div className="sp-spinner" /></div>
              ) : slots.length === 0 ? (
                <div style={{ padding: '28px 0', textAlign: 'center' }}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có slot trống. Liên hệ admin để tạo thêm." />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {slots.map((s, i) => (
                    <div key={s._id}
                      style={{
                        border: `1px solid ${C.line2}`, borderRadius: 10,
                        background: C.card, padding: '12px 14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        transition: 'all .2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = C.cyan;
                        e.currentTarget.style.background = '#0f1e30';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = C.line2;
                        e.currentTarget.style.background = C.card;
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: C.cyan,
                            background: 'rgba(0,212,255,.08)', border: '1px solid rgba(0,212,255,.2)',
                            borderRadius: 20, padding: '2px 8px',
                          }}>
                            {fmtDuration(s.start_time, s.end_time)}
                          </span>
                          {s.room && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan }}>
                              📍 {s.room}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text2 }}>
                          {fmtDate(s.start_time)}
                        </div>
                        {s.note && (
                          <div style={{ fontSize: 11, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📝 {s.note}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setConfirmSlot(s)}
                        style={{
                          flexShrink: 0, padding: '6px 14px', borderRadius: 7, border: 'none',
                          background: 'linear-gradient(90deg,#00d4ff,#0099bb)',
                          color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Đặt lịch
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </div>

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
            <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 8, padding: '10px 14px', color: C.amber, fontWeight: 600 }}>
              ⚠ Bài nộp này sẽ bị đánh dấu TRỄ và chờ admin phê duyệt.
            </div>
          )}
          {submission && (
            <div style={{ color: C.muted }}>
              Bài nộp mới sẽ thay thế bài cũ. Hành động này không thể hoàn tác.
            </div>
          )}
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: C.dim, minWidth: 80 }}>Repo</span>
              <span style={{ color: C.cyan, wordBreak: 'break-all' }}>{form.repo_url}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: C.dim, minWidth: 80 }}>Slide</span>
              <span style={{ color: C.text2, wordBreak: 'break-all' }}>{form.slide_url}</span>
            </div>
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
            <div style={{ fontSize: 13, color: C.muted }}>
              Bạn sẽ đặt slot trình bày sau.{' '}
              <strong style={{ color: C.amber }}>Bạn có thể huỷ lịch trước hạn nộp bài. Sau hạn nộp, chỉ ban tổ chức mới thay đổi được.</strong>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: '.5px' }}>Bắt đầu</div>
                <div style={{ color: C.text2, fontWeight: 600, marginTop: 2 }}>{fmtDate(confirmSlot.start_time)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: '.5px' }}>Kết thúc</div>
                <div style={{ color: C.text2, fontWeight: 600, marginTop: 2 }}>{fmtDate(confirmSlot.end_time)}</div>
              </div>
              {confirmSlot.room && (
                <div>
                  <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: '.5px' }}>Phòng</div>
                  <div style={{ color: C.text2, fontWeight: 600, marginTop: 2 }}>{confirmSlot.room}</div>
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
        <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>
          Sau khi hủy, slot sẽ được trả về danh sách trống và đội khác có thể đăng ký. Bạn có thể đặt lại slot khác trước hạn nộp bài.
        </div>
      </Modal>
    </div>
  );
};
