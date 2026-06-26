import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

// ─── constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: '#06363f', fg: '#6fe9f7' },
  { bg: '#10324d', fg: '#7db8f5' },
  { bg: '#241f47', fg: '#b3a4f7' },
  { bg: '#0d3a33', fg: '#67e7b8' },
  { bg: '#3a2330', fg: '#f3a3c2' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

const calcTotal = (criteria, vals) => {
  const wSum = criteria.reduce((s, c) => s + c.weight, 0);
  if (!wSum) return 0;
  const raw = criteria.reduce((s, c) => s + (vals[c.id] ?? 0) * c.weight, 0) / wSum;
  return Math.round(raw * 100) / 100;
};

const scoreColor = (v) => {
  if (v >= 8.5) return '#34d399';
  if (v >= 7)   return '#00e5ff';
  if (v >= 5)   return '#fbbf24';
  if (v > 0)    return '#f87171';
  return '#5a6675';
};

const scoreStatus = (v) => {
  if (v >= 8.5) return 'Xuất sắc';
  if (v >= 7)   return 'Tốt';
  if (v >= 5)   return 'Khá';
  if (v > 0)    return 'Cần cải thiện';
  return 'Chưa chấm';
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const fmtClock = (d) =>
  d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return parts.slice(-2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';
};

const getDiffStyle = (d) => {
  if (d === 'easy') return { label: 'Dễ',        color: '#34d399', bg: 'rgba(52,211,153,.12)',  border: 'rgba(52,211,153,.3)'  };
  if (d === 'hard') return { label: 'Khó',        color: '#f87171', bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.3)' };
  return             { label: 'Trung bình', color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  border: 'rgba(251,191,36,.3)'  };
};

// ─── CriterionSlider ──────────────────────────────────────────────────────────

const CriterionSlider = ({ c, value = 0, onChange, readOnly }) => {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const pct      = `${(value / c.maxScore) * 100}%`;
  const col      = scoreColor(value);

  const fromPointer = useCallback((e) => {
    if (!trackRef.current) return;
    const rect  = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onChange(Math.round(ratio * c.maxScore * 2) / 2);
  }, [c.maxScore, onChange]);

  return (
    <div style={{ position: 'relative', border: '1px solid #2e5580', borderRadius: 14, background: '#172d45', padding: '16px 18px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: value > 0 ? col : 'transparent', transition: 'background .25s' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#dbe6f0' }}>{c.name}</span>
            <span style={{ padding: '1px 7px', borderRadius: 6, background: '#16202b', border: '1px solid #233040', fontFamily: 'monospace', fontSize: 10, color: '#8a98a8' }}>×{Math.round(c.weight * 100)}%</span>
          </div>
          {c.description && (
            <div style={{ fontSize: 12, color: '#7b8a9a', marginTop: 4, lineHeight: 1.45 }}>{c.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, lineHeight: 1, color: col, minWidth: 48, textAlign: 'right' }}>
            {value > 0 ? value.toFixed(1) : '—'}
          </span>
          <span style={{ fontSize: 10, color: '#5a6675', marginTop: 3 }}>+{(value * c.weight).toFixed(2)} điểm</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button
          onClick={() => !readOnly && onChange(Math.max(0, Math.round((value - 0.5) * 2) / 2))}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0, borderRadius: 8, border: '1px solid #243140', background: '#0c1219', color: '#aebccb', fontSize: 18, cursor: readOnly ? 'not-allowed' : 'pointer', userSelect: 'none' }}
        >−</button>

        <div
          ref={trackRef}
          onPointerDown={(e) => {
            if (readOnly) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            dragging.current = true;
            fromPointer(e);
          }}
          onPointerMove={(e) => { if (dragging.current && !readOnly) fromPointer(e); }}
          onPointerUp={(e) => {
            dragging.current = false;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
          }}
          style={{ position: 'relative', flex: 1, height: 26, display: 'flex', alignItems: 'center', cursor: readOnly ? 'not-allowed' : 'ew-resize', touchAction: 'none', userSelect: 'none' }}
        >
          <div style={{ position: 'absolute', left: 0, right: 0, height: 7, borderRadius: 6, background: '#141d27', border: '1px solid #1c2733' }} />
          <div style={{ position: 'absolute', left: 0, height: 7, borderRadius: 6, background: 'linear-gradient(90deg,#0098b3,#00e5ff)', boxShadow: '0 0 12px rgba(0,229,255,.45)', transition: 'width .08s linear', width: pct }} />
          <div style={{ position: 'absolute', top: '50%', width: 17, height: 17, borderRadius: '50%', background: '#e8fbff', border: '2px solid #00e5ff', boxShadow: '0 0 10px rgba(0,229,255,.6)', transform: 'translate(-50%,-50%)', transition: 'left .08s linear', left: pct, pointerEvents: 'none' }} />
        </div>

        <button
          onClick={() => !readOnly && onChange(Math.min(c.maxScore, Math.round((value + 0.5) * 2) / 2))}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0, borderRadius: 8, border: '1px solid #243140', background: '#0c1219', color: '#aebccb', fontSize: 18, cursor: readOnly ? 'not-allowed' : 'pointer', userSelect: 'none' }}
        >+</button>

        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#5a6675', width: 28, textAlign: 'right' }}>/{c.maxScore}</span>
      </div>
    </div>
  );
};

// ─── JudgeScoringPage ─────────────────────────────────────────────────────────

export const JudgeScoringPage = () => {
  const { contestId, roundId } = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { request } = useApi();

  const [loading,           setLoading]           = useState(true);
  const [criteria,          setCriteria]          = useState([]);
  const [schedule,          setSchedule]          = useState({ pool_name: '', slots: [] });
  const [selected,          setSelected]          = useState(null);
  const [draft,             setDraft]             = useState({ criteria: {}, comment: '' });
  const [submitting,        setSubmitting]        = useState(false);
  const [now,               setNow]               = useState(new Date());
  const [contest,           setContest]           = useState(null);
  const [round,             setRound]             = useState(null);
  const [teamDetail,        setTeamDetail]        = useState(null);
  const [teamDetailLoading, setTeamDetailLoading] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contestData, scheduleData] = await Promise.all([
        request(`/api/contests/${contestId}`),
        request(`/api/scores/contests/${contestId}/rounds/${roundId}/judge-schedule`),
      ]);

      const contestObj  = contestData?.data ?? contestData;
      const roundObj    = (contestObj?.rounds || []).find((r) => String(r._id) === String(roundId));
      const rawCriteria = roundObj?.score_criteria ?? [];

      setContest(contestObj);
      setRound(roundObj ?? null);
      setCriteria(rawCriteria.map((c) => ({
        id:          String(c._id ?? c.id),
        name:        c.criteria_name ?? c.name,
        weight:      c.weight ?? 1,
        maxScore:    c.max_score ?? 10,
        description: c.description ?? '',
      })));
      setSchedule(scheduleData ?? { pool_name: '', slots: [] });
    } catch {
      message.error('Không thể tải dữ liệu chấm điểm');
    } finally {
      setLoading(false);
    }
  }, [contestId, roundId, request]);

  const loadTeamDetail = useCallback(async (teamId) => {
    if (!teamId) return;
    setTeamDetail(null);
    setTeamDetailLoading(true);
    try {
      const data = await request(`/api/teams/${teamId}`);
      setTeamDetail(data?.data ?? data);
    } catch {
      // non-critical — team detail is supplementary info
    } finally {
      setTeamDetailLoading(false);
    }
  }, [request]);

  useEffect(() => { loadData(); }, [loadData]);

  const openSlot = (slot, crit) => {
    const usedCriteria = crit ?? criteria;
    const prefill = {};
    for (const d of slot.score_details ?? []) {
      const c = usedCriteria.find((cr) => cr.name === d.criteria_name);
      if (c) prefill[c.id] = d.score_value;
    }
    setSelected(slot);
    setDraft({ criteria: prefill, comment: slot.comment ?? '' });
    loadTeamDetail(slot.team_id);
  };

  const isUnlocked = (slot) => new Date(slot.start_time) <= now;
  const isLive     = (slot) => {
    const start = new Date(slot.start_time);
    const end   = new Date(slot.end_time);
    return start <= now && now < end;
  };

  const setScore = (critId, val) => {
    if (selected?.score_status === 'submitted') return;
    setDraft((p) => ({ ...p, criteria: { ...p.criteria, [critId]: val } }));
  };

  const saveScore = async (submit) => {
    if (submit) {
      const allFilled = criteria.every((c) => (draft.criteria[c.id] ?? 0) > 0);
      if (!allFilled) { message.error('Vui lòng nhập điểm cho tất cả tiêu chí'); return; }
    }
    setSubmitting(true);
    try {
      const scoreDetails = criteria.map((c) => ({
        criteria_name: c.name,
        score_value:   draft.criteria[c.id] ?? 0,
        weight:        c.weight,
        max_score:     c.maxScore,
      }));
      const body = { team_id: selected.team_id, contest_id: contestId, round_id: roundId, comment: draft.comment, score_details: scoreDetails, submit };
      const url    = selected.score_id ? `/api/scores/${selected.score_id}` : `/api/scores`;
      const method = selected.score_id ? 'PUT' : 'POST';
      const saved  = await request(url, { method, body });

      message.success(submit ? 'Đã nộp điểm chính thức' : 'Đã lưu nháp');

      const scheduleData = await request(`/api/scores/contests/${contestId}/rounds/${roundId}/judge-schedule`);
      setSchedule(scheduleData ?? { pool_name: '', slots: [] });
      const updated = (scheduleData?.slots ?? []).find((s) => String(s.team_id) === String(selected.team_id));
      if (updated) openSlot({ ...updated, score_id: saved?._id ?? updated.score_id }, criteria);
    } catch (e) {
      message.error(e.message || 'Đã xảy ra lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  // ── loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#090c11' }}>
        <Spin size="large" />
      </div>
    );
  }

  // ── derived ───────────────────────────────────────────────────────────────────

  const total          = calcTotal(criteria, draft.criteria ?? {});
  const submittedCount = schedule.slots.filter((s) => s.score_status === 'submitted').length;
  const totalSlots     = schedule.slots.length;
  const progPct        = totalSlots > 0 ? submittedCount / totalSlots : 0;
  const gCirc          = 2 * Math.PI * 74;
  const pCirc          = 2 * Math.PI * 11;
  const isReadOnly     = selected?.score_status === 'submitted';
  const filledCount    = criteria.filter((c) => (draft.criteria?.[c.id] ?? 0) > 0).length;

  const roundLine = round
    ? `Round ${round.round_number ?? ''}${round.name ? ` · ${round.name}` : ''}${round.start_time ? ` · ${fmtTime(round.start_time)}–${fmtTime(round.end_time)}` : ''}`
    : (schedule.pool_name || 'Chấm điểm live');

  const topic = selected && teamDetail?.topic_id && typeof teamDetail.topic_id === 'object'
    ? teamDetail.topic_id
    : null;
  const diff    = getDiffStyle(topic?.difficulty);
  const members = teamDetail?.members ?? [];

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes jspPulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.82)} }
        @keyframes jspLiveRing  { 0%{box-shadow:0 0 0 0 rgba(0,229,255,.5)} 70%{box-shadow:0 0 0 7px rgba(0,229,255,0)} 100%{box-shadow:0 0 0 0 rgba(0,229,255,0)} }
        .jsp-slot:hover { background: rgba(0,229,255,.04) !important; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'radial-gradient(1200px 600px at 78% -10%, rgba(0,229,255,.04), transparent 60%), #090c11', color: '#e8eef5', fontFamily: "'Manrope',system-ui,sans-serif", overflow: 'hidden' }}>

        {/* ── TOPBAR ── */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 14, height: 62, flexShrink: 0, padding: '0 18px 0 14px', borderBottom: '1px solid #18202b', background: 'linear-gradient(180deg,#0e141c,#0b1016)' }}>
          <button onClick={() => navigate('/judge/dashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, border: '1px solid #1f2a36', background: '#0e151d', color: '#9fb0c0', fontSize: 16, cursor: 'pointer' }}>←</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#00e5ff,#0098b3)', color: '#04222a', fontSize: 17, boxShadow: '0 0 18px rgba(0,229,255,.35)' }}>⚖</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '.2px' }}>{contest?.title ?? 'Chấm điểm live'}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b8a9a' }}>{roundLine}</div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 9, border: '1px solid #1f2a36', background: '#0d141c', fontFamily: 'monospace', fontSize: 12.5, color: '#aebccb' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00e5ff', display: 'inline-block', animation: 'jspPulseDot 1.6s infinite' }} />
            {fmtClock(now)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 12px 5px 6px', borderRadius: 999, border: '1px solid #1f2a36', background: '#0d141c' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
              <circle cx="14" cy="14" r="11" fill="none" stroke="#1f2a36" strokeWidth="3" />
              <circle cx="14" cy="14" r="11" fill="none" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={pCirc} strokeDashoffset={pCirc * (1 - progPct)}
                transform="rotate(-90 14 14)" style={{ transition: 'stroke-dashoffset .5s' }}
              />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{submittedCount}/{totalSlots}</span>
              <span style={{ fontSize: 10, color: '#6b7a8a', letterSpacing: '.03em' }}>đã nộp điểm</span>
            </div>
          </div>

          <div style={{ width: 1, height: 26, background: '#1f2a36' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#13324a,#241f47)', color: '#9fc6f5', fontSize: 12, fontWeight: 700 }}>
              {getInitials(user?.full_name)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#dbe6f0' }}>{user?.full_name}</span>
              <span style={{ fontSize: 10.5, color: '#6b7a8a' }}>Giám khảo</span>
            </div>
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT: TIMELINE ── */}
          <aside style={{ width: 296, flexShrink: 0, borderRight: '1px solid #18202b', background: '#0b1016', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #141b24' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.13em', color: '#5f6f7e' }}>LỊCH TRÌNH BÀY</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b8a9a' }}>{schedule.pool_name}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#141b24', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#00e5ff,#34d399)', boxShadow: '0 0 10px rgba(0,229,255,.4)', transition: 'width .5s', width: `${progPct * 100}%` }} />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 18px' }}>
              {schedule.slots.length === 0 && (
                <div style={{ padding: '32px 12px', fontSize: 13, color: '#5f6f7e', textAlign: 'center' }}>Chưa có team nào đặt slot</div>
              )}

              {schedule.slots.map((slot) => {
                const unlocked      = isUnlocked(slot);
                const live          = isLive(slot);
                const isSelected    = String(selected?.slot_id) === String(slot.slot_id);
                const done          = slot.score_status === 'submitted';
                const isDraft       = slot.score_status === 'draft';
                const remMs         = new Date(slot.start_time) - now;
                const remMin        = Math.ceil(remMs / 60000);
                const showCountdown = !unlocked && remMs > 0;

                let dotColor = '#2a3543', dotGlow = 'none';
                if (live)        { dotColor = '#00e5ff'; dotGlow = '0 0 8px rgba(0,229,255,.7)'; }
                else if (done)   { dotColor = '#34d399'; }
                else if (isDraft){ dotColor = '#fbbf24'; }

                return (
                  <div
                    key={String(slot.slot_id)}
                    className="jsp-slot"
                    onClick={() => unlocked && openSlot(slot, criteria)}
                    style={{ position: 'relative', display: 'flex', gap: 11, padding: '11px 11px 11px 8px', borderRadius: 11, marginBottom: 4, cursor: unlocked ? 'pointer' : 'not-allowed', background: isSelected ? 'rgba(0,229,255,.07)' : 'transparent', opacity: unlocked ? 1 : 0.55, transition: 'background .15s' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                      <span style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0, background: dotColor, boxShadow: dotGlow }} />
                      <span style={{ flex: 1, width: 2, marginTop: 4, borderRadius: 2, background: '#1a232e' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#fff' : (unlocked ? '#cfd9e3' : '#6b7a8a'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {slot.team_name}
                        </span>
                        <span style={{ flexShrink: 0 }}>
                          {done     && <span style={{ color: '#34d399', fontSize: 13 }}>✓</span>}
                          {isDraft && !done && <span style={{ color: '#fbbf24', fontSize: 12 }}>◐</span>}
                          {!unlocked && <span style={{ color: '#3a4654', fontSize: 11 }}>🔒</span>}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: unlocked ? '#7fbfd0' : '#4a5663' }}>
                          {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)}
                        </span>
                        {slot.room && <span style={{ fontSize: 10.5, color: '#5a6675' }}>· {slot.room}</span>}
                      </div>

                      {live && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, padding: '2px 8px', borderRadius: 999, background: 'rgba(0,229,255,.12)', border: '1px solid rgba(0,229,255,.35)' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5ff', display: 'inline-block', animation: 'jspPulseDot 1.4s infinite' }} />
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#7fe9f7' }}>ĐANG TRÌNH BÀY</span>
                        </div>
                      )}

                      {done && (
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginTop: 7 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#34d399' }}>{slot.total_score?.toFixed(1)}</span>
                          <span style={{ fontSize: 10, color: '#5a6675' }}>/ 10</span>
                        </div>
                      )}

                      {showCountdown && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 11, color: remMs < 3600000 ? '#fbbf24' : '#5a6675' }}>
                          <span>⏱</span>
                          <span style={{ fontFamily: 'monospace' }}>
                            {remMs < 3600000
                              ? `Mở ${fmtTime(slot.start_time)} · còn ${remMin}m`
                              : `Mở lúc ${fmtTime(slot.start_time)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ── MAIN: TEAM + CRITERIA ── */}
          <div style={{ flex: '1 1 440px', minWidth: 440, minHeight: 0, overflowY: 'auto', padding: '24px 28px 40px', position: 'relative', zIndex: 1, background: '#080f1a' }}>
            {!selected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#4b5563', fontSize: 14 }}>
                Chọn team đang trình bày để bắt đầu chấm điểm
              </div>
            ) : (
              <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Team header card */}
                <div style={{ position: 'relative', border: '1px solid #1c2d40', borderRadius: 16, background: '#111827', padding: '20px 22px', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -40, right: -30, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,.10), transparent 70%)', pointerEvents: 'none' }} />

                  {/* name + links */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, position: 'relative' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '.2px', color: '#e8eef5' }}>{selected.team_name}</h1>
                        {isLive(selected) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(0,229,255,.12)', border: '1px solid rgba(0,229,255,.4)', animation: 'jspLiveRing 2s infinite' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5ff', display: 'inline-block' }} />
                            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', color: '#7fe9f7' }}>LIVE</span>
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, fontFamily: 'monospace', fontSize: 12, color: '#8a98a8' }}>
                        <span>🕐 {fmtTime(selected.start_time)}–{fmtTime(selected.end_time)}</span>
                        {selected.room && <><span style={{ color: '#3a4654' }}>•</span><span>📍 {selected.room}</span></>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                      {selected.repo_url  && <a href={selected.repo_url}  target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1px solid #243140', background: '#0e151d', color: '#aebccb', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>⛓ Repo</a>}
                      {selected.slide_url && <a href={selected.slide_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1px solid #243140', background: '#0e151d', color: '#aebccb', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>🗒 Slide</a>}
                      {selected.demo_url  && <a href={selected.demo_url}  target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1px solid #243140', background: '#0e151d', color: '#aebccb', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>▶ Demo</a>}
                    </div>
                  </div>

                  {/* Topic */}
                  <div style={{ marginTop: 16, padding: '13px 15px', borderRadius: 12, background: '#0a1015', border: '1px solid #18222d' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: '#5f6f7e' }}>ĐỀ TÀI</span>
                      {topic && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, color: diff.color, background: diff.bg, border: `1px solid ${diff.border}` }}>
                          {diff.label}
                        </span>
                      )}
                    </div>
                    {topic ? (
                      <>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#dbe6f0' }}>{topic.title}</div>
                        {topic.description && <div style={{ fontSize: 12.5, color: '#8a98a8', marginTop: 4, lineHeight: 1.5 }}>{topic.description}</div>}
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: '#5f6f7e', fontStyle: 'italic' }}>
                        {teamDetailLoading ? 'Đang tải...' : 'Chưa có thông tin đề tài'}
                      </div>
                    )}
                  </div>

                  {/* Members */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: '#5f6f7e', marginBottom: 9 }}>
                      THÀNH VIÊN ({teamDetailLoading ? '...' : members.length})
                    </div>
                    {teamDetailLoading ? (
                      <div style={{ fontSize: 12, color: '#5f6f7e' }}>Đang tải...</div>
                    ) : members.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {members.map((m, i) => {
                          const av       = AVATAR_COLORS[i % AVATAR_COLORS.length];
                          const name     = m.full_name || m.email || 'Thành viên';
                          const isLeader = String(m.user_id) === String(teamDetail?.leader_id);
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 12px 6px 6px', borderRadius: 999, background: '#0e151d', border: '1px solid #1c2632' }}>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', fontSize: 11, fontWeight: 700, background: av.bg, color: av.fg, flexShrink: 0 }}>
                                {getInitials(name)}
                                {isLeader && <span style={{ position: 'absolute', top: -5, right: -5, fontSize: 11 }}>👑</span>}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#dbe6f0' }}>{name}</span>
                                <span style={{ fontSize: 10.5, color: '#6b7a8a', fontFamily: 'monospace' }}>
                                  {m.contribution_percentage ?? '—'}% đóng góp
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#5f6f7e', fontStyle: 'italic' }}>Không có thông tin thành viên</div>
                    )}
                  </div>
                </div>

                {/* Criteria */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.13em', color: '#5f6f7e' }}>TIÊU CHÍ ĐÁNH GIÁ</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: filledCount === criteria.length && criteria.length > 0 ? '#34d399' : '#fbbf24' }}>
                      {filledCount}/{criteria.length} đã chấm
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {criteria.map((c) => (
                      <CriterionSlider
                        key={c.id}
                        c={c}
                        value={draft.criteria?.[c.id] ?? 0}
                        onChange={(v) => setScore(c.id, v)}
                        readOnly={isReadOnly}
                      />
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.13em', color: '#5f6f7e', margin: '0 2px 10px' }}>NHẬN XÉT TỔNG QUAN</div>
                  <textarea
                    value={draft.comment}
                    onChange={(e) => !isReadOnly && setDraft((p) => ({ ...p, comment: e.target.value }))}
                    placeholder="Ghi nhận điểm mạnh, góp ý cho team..."
                    disabled={isReadOnly}
                    style={{ width: '100%', minHeight: 92, background: '#0e151d', border: '1px solid #1c2632', borderRadius: 13, color: '#e8eef5', padding: '13px 15px', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

              </div>
            )}
          </div>

          {/* ── RIGHT: SUMMARY RAIL ── */}
          <aside style={{ width: 340, flexShrink: 0, minHeight: 0, borderLeft: '1px solid #18202b', background: 'linear-gradient(180deg,#0b1016,#0a0d12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 22px 10px' }}>

              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.13em', color: '#5f6f7e', textAlign: 'center', marginBottom: 14 }}>TỔNG ĐIỂM</div>

              {/* Gauge */}
              <div style={{ position: 'relative', width: 178, height: 178, margin: '0 auto 6px' }}>
                <svg width="178" height="178" viewBox="0 0 178 178">
                  <circle cx="89" cy="89" r="74" fill="none" stroke="#16202b" strokeWidth="13" />
                  <circle cx="89" cy="89" r="74" fill="none"
                    stroke={selected ? scoreColor(total) : '#1f2a36'}
                    strokeWidth="13" strokeLinecap="round"
                    strokeDasharray={gCirc}
                    strokeDashoffset={gCirc * (1 - (selected ? total / 10 : 0))}
                    transform="rotate(-90 89 89)"
                    style={{ transition: 'stroke-dashoffset .55s cubic-bezier(.22,1,.36,1), stroke .35s' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 48, fontWeight: 700, lineHeight: 1, color: selected ? scoreColor(total) : '#5a6675', transition: 'color .35s' }}>
                    {selected ? total.toFixed(1) : '—'}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7a8a', marginTop: 2 }}>trên 10 điểm</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: selected ? scoreColor(total) : '#5a6675', marginBottom: 18 }}>
                {selected ? scoreStatus(total) : 'Chọn team để chấm'}
              </div>

              <div style={{ height: 1, background: '#16202b', marginBottom: 16 }} />

              {/* Breakdown */}
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', color: '#5f6f7e', marginBottom: 12 }}>PHÂN TÍCH THEO TIÊU CHÍ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {criteria.map((c) => {
                  const v = draft.criteria?.[c.id] ?? 0;
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: '#aebccb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8a98a8', flexShrink: 0 }}>
                          {v > 0 ? v.toFixed(1) : '0'}×{Math.round(c.weight * 100)}% <span style={{ color: '#4a5663' }}>·</span> <span style={{ color: '#7fe9f7' }}>{(v * c.weight).toFixed(2)}</span>
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, background: '#141d27', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#0098b3,#00e5ff)', transition: 'width .4s', width: `${(v / c.maxScore) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ flexShrink: 0, padding: '16px 22px 20px', borderTop: '1px solid #16202b', background: '#0a0d12' }}>
              {!selected ? (
                <div style={{ textAlign: 'center', fontSize: 12, color: '#5f6f7e' }}>Chọn team để bắt đầu chấm</div>
              ) : isReadOnly ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 11, background: 'rgba(52,211,153,.10)', border: '1px solid rgba(52,211,153,.32)' }}>
                    <span style={{ fontSize: 16 }}>✓</span>
                    <div style={{ lineHeight: 1.25 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#6ee7b7' }}>Đã nộp điểm chính thức</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#5a8a76' }}>Tổng {selected.total_score?.toFixed(1) ?? total.toFixed(1)} / 10</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected((s) => ({ ...s, score_status: 'draft' }))}
                    style={{ width: '100%', padding: 11, borderRadius: 11, border: '1px solid #243140', background: '#0e151d', color: '#aebccb', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Mở khóa chỉnh sửa</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <button
                    onClick={() => saveScore(true)}
                    disabled={submitting}
                    style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', background: submitting ? '#0e3a47' : 'linear-gradient(135deg,#00e5ff,#00a3c4)', color: '#04222a', fontSize: 14, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 18px rgba(0,229,255,.28)', letterSpacing: '.2px' }}
                  >{submitting ? 'Đang nộp...' : 'Nộp Điểm chính thức'}</button>
                  <button
                    onClick={() => saveScore(false)}
                    disabled={submitting}
                    style={{ width: '100%', padding: 11, borderRadius: 11, border: '1px solid #243140', background: '#0e151d', color: '#aebccb', fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  >Lưu nháp</button>
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#5a6675', marginTop: 2 }}>
                    {filledCount === criteria.length && criteria.length > 0
                      ? 'Tất cả tiêu chí đã sẵn sàng'
                      : `Cần chấm đủ ${criteria.length} tiêu chí trước khi nộp`}
                  </div>
                </div>
              )}
            </div>
          </aside>

        </div>
      </div>
    </>
  );
};

export default JudgeScoringPage;
