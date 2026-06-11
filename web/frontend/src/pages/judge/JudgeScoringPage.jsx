import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InputNumber, Button, Spin, Tag, message } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

// ─── helpers ─────────────────────────────────────────────────────────────────

const calcTotal = (criteria, vals) => {
  const wSum = criteria.reduce((s, c) => s + c.weight, 0);
  if (!wSum) return 0;
  const raw = criteria.reduce((s, c) => s + (vals[c.id] ?? 0) * c.weight, 0) / wSum;
  return Math.round(raw * 100) / 100;
};

const scoreColor = (v) => {
  if (v >= 8) return '#10b981';
  if (v >= 6) return '#f59e0b';
  if (v > 0)  return '#ef4444';
  return '#6b7280';
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

// ─── component ───────────────────────────────────────────────────────────────

export const JudgeScoringPage = () => {
  const { contestId, roundId } = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { request } = useApi();

  const [loading,    setLoading]    = useState(true);
  const [criteria,   setCriteria]   = useState([]);
  const [schedule,   setSchedule]   = useState({ pool_name: '', slots: [] });
  const [selected,   setSelected]   = useState(null);
  const [draft,      setDraft]      = useState({ criteria: {}, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [now,        setNow]        = useState(new Date());
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contestData, scheduleData] = await Promise.all([
        request(`/api/contests/${contestId}`),
        request(`/api/scores/contests/${contestId}/rounds/${roundId}/judge-schedule`),
      ]);

      const contest = contestData?.data ?? contestData;
      const round = (contest?.rounds || []).find(
        (r) => String(r._id) === String(roundId)
      );
      const rawCriteria = round?.score_criteria ?? [];
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

  useEffect(() => { loadData(); }, [loadData]);

  const openSlot = (slot, crit) => {
    const usedCriteria = crit ?? criteria;
    const prefill = {};
    for (const d of slot.score_details ?? []) {
      const c = usedCriteria.find((cr) => cr.name === d.criteria_name);
      if (c) prefill[c.id] = d.score_value;
    }
    setSelected(slot);
    setDraft({ criteria: prefill, comment: '' });
  };

  const isUnlocked = (slot) => new Date(slot.start_time) <= now;

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
      const body = {
        team_id:       selected.team_id,
        contest_id:    contestId,
        round_id:      roundId,
        comment:       draft.comment,
        score_details: scoreDetails,
        submit,
      };

      const url    = selected.score_id ? `/api/scores/${selected.score_id}` : `/api/scores`;
      const method = selected.score_id ? 'PUT' : 'POST';
      const data   = await request(url, { method, body });

      message.success(submit ? 'Đã nộp điểm chính thức' : 'Đã lưu nháp');

      const scheduleData = await request(`/api/scores/contests/${contestId}/rounds/${roundId}/judge-schedule`);
      setSchedule(scheduleData ?? { pool_name: '', slots: [] });
      const updated = (scheduleData?.slots ?? []).find(
        (s) => String(s.team_id) === String(selected.team_id)
      );
      if (updated) openSlot({ ...updated, score_id: data._id ?? updated.score_id }, criteria);
    } catch (e) {
      message.error(e.message || 'Đã xảy ra lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117' }}>
        <Spin size="large" />
      </div>
    );
  }

  const total          = calcTotal(criteria, draft.criteria);
  const submittedCount = schedule.slots.filter((s) => s.score_status === 'submitted').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d1117', color: '#f9fafb' }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #1f2937', background: '#111827', flexShrink: 0 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/judge/dashboard')} style={{ color: '#9ca3af' }} />
        <div style={{ flex: 1 }}>
          <span style={{ color: '#f9fafb', fontWeight: 700 }}>⚖ Chấm điểm live</span>
          {schedule.pool_name && (
            <span style={{ color: '#6b7280', marginLeft: 8, fontSize: 13 }}>— {schedule.pool_name}</span>
          )}
        </div>
        <Tag color={submittedCount === schedule.slots.length && schedule.slots.length > 0 ? 'green' : 'default'}>
          {submittedCount} / {schedule.slots.length} đã nộp
        </Tag>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>{user?.full_name}</span>
      </div>

      {/* Split body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left: timeline ── */}
        <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid #1f2937', overflowY: 'auto', background: '#111827' }}>
          <div style={{ padding: '10px 12px 6px', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Lịch trình bày
          </div>

          {schedule.slots.length === 0 && (
            <div style={{ padding: '24px 12px', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              Chưa có team nào đặt slot
            </div>
          )}

          {schedule.slots.map((slot) => {
            const unlocked   = isUnlocked(slot);
            const isSelected = String(selected?.slot_id) === String(slot.slot_id);
            const done       = slot.score_status === 'submitted';
            const isDraft    = slot.score_status === 'draft';

            return (
              <div
                key={String(slot.slot_id)}
                onClick={() => unlocked && openSlot(slot, criteria)}
                style={{
                  padding:      '10px 12px',
                  borderBottom: '1px solid #1f2937',
                  borderLeft:   isSelected ? '3px solid #00f0ff' : '3px solid transparent',
                  background:   isSelected ? '#001a1a' : 'transparent',
                  opacity:      unlocked ? 1 : 0.45,
                  cursor:       unlocked ? 'pointer' : 'default',
                  transition:   'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 400, color: isSelected ? '#f9fafb' : '#d1d5db' }}>
                      {slot.team_name}
                    </div>
                    <div style={{ fontSize: 11, color: unlocked ? '#00f0ff' : '#6b7280', marginTop: 2 }}>
                      {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)}
                      {slot.room && <span style={{ color: '#6b7280' }}> · {slot.room}</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: 6 }}>
                    {done    && <CheckCircleOutlined style={{ color: '#10b981', fontSize: 14 }} />}
                    {isDraft && !done && <ClockCircleOutlined style={{ color: '#f59e0b', fontSize: 14 }} />}
                    {!unlocked && <LockOutlined style={{ color: '#4b5563', fontSize: 12 }} />}
                  </div>
                </div>
                {done && (
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 3 }}>
                    {slot.total_score?.toFixed(1)} / 10
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right: score form ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4b5563', fontSize: 14 }}>
              Chọn team đang trình bày để bắt đầu chấm điểm
            </div>
          ) : (
            <div style={{ maxWidth: 620 }}>

              {/* Context bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', background: '#001a1a', border: '1px solid #00f0ff22', borderRadius: 8, marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb' }}>{selected.team_name}</span>
                  <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 10 }}>
                    {fmtTime(selected.start_time)}–{fmtTime(selected.end_time)}
                    {selected.room && ` · ${selected.room}`}
                  </span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                  {selected.repo_url  && <a href={selected.repo_url}  target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#00f0ff' }}>Repo</a>}
                  {selected.slide_url && <a href={selected.slide_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#00f0ff' }}>Slide</a>}
                </div>
              </div>

              {/* Criteria grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                {criteria.map((c) => (
                  <div key={c.id} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#d1d5db' }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>×{Math.round(c.weight * 100)}%</span>
                    </div>
                    <InputNumber
                      min={0} max={c.maxScore} step={0.5} precision={1}
                      value={draft.criteria[c.id] ?? null}
                      onChange={(v) => setDraft((p) => ({ ...p, criteria: { ...p.criteria, [c.id]: v ?? 0 } }))}
                      style={{ width: '100%' }}
                      placeholder={`0 – ${c.maxScore}`}
                      disabled={selected.score_status === 'submitted'}
                    />
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                      → {((draft.criteria[c.id] ?? 0) * c.weight).toFixed(2)} điểm
                    </div>
                  </div>
                ))}

                {/* Total card */}
                <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor(total), lineHeight: 1 }}>
                    {total.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>/ 10</div>
                </div>
              </div>

              {/* Comment */}
              <textarea
                value={draft.comment}
                onChange={(e) => setDraft((p) => ({ ...p, comment: e.target.value }))}
                placeholder="Nhận xét tổng quan..."
                disabled={selected.score_status === 'submitted'}
                style={{
                  width: '100%', background: '#111827', border: '1px solid #374151',
                  borderRadius: 8, color: '#f9fafb', padding: '10px 12px', fontSize: 13,
                  resize: 'vertical', minHeight: 72, outline: 'none', marginBottom: 16,
                  boxSizing: 'border-box',
                }}
              />

              {/* Actions */}
              {selected.score_status === 'submitted' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tag color="green" style={{ fontSize: 13, padding: '4px 10px' }}>
                    <CheckCircleOutlined /> Đã nộp — {selected.total_score?.toFixed(1)}/10
                  </Tag>
                  <Button
                    size="small"
                    style={{ color: '#9ca3af' }}
                    onClick={() => setSelected((s) => ({ ...s, score_status: 'draft' }))}
                  >
                    Chỉnh sửa
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button onClick={() => saveScore(false)} loading={submitting} style={{ flex: 1 }}>
                    💾 Lưu nháp
                  </Button>
                  <Button type="primary" onClick={() => saveScore(true)} loading={submitting} style={{ flex: 1.5 }}>
                    ✓ Nộp điểm chính thức
                  </Button>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default JudgeScoringPage;
