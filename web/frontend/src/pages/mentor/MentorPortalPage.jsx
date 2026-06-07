import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Tag, Progress, Modal, message, Tooltip, Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import './MentorPortalPage.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  submitted:     { label: 'Đã nộp',          color: 'green' },
  late_approved: { label: 'Trễ — Đã duyệt',  color: 'orange' },
  late_pending:  { label: 'Trễ — Chờ duyệt', color: 'orange' },
  not_submitted: { label: 'Chưa nộp',        color: 'default' },
  rejected:      { label: 'Bị từ chối',      color: 'red' },
};

const ROUND_STATUS = {
  active:   { label: 'Đang diễn ra', color: 'green' },
  upcoming: { label: 'Sắp tới',      color: 'blue' },
  ended:    { label: 'Đã kết thúc',  color: 'default' },
};

// Map backend submission statuses (UPPERCASE) → frontend keys
const mapSubStatus = (s) => {
  const m = { SUBMITTED: 'submitted', LATE: 'late_pending', LATE_PENDING: 'late_pending', APPROVED: 'late_approved', REJECTED: 'rejected' };
  return m[s] || 'not_submitted';
};

const mapRoundStatus = (r) => r.is_active ? 'active' : (r.scoring_locked ? 'ended' : 'upcoming');

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MentorPortalPage() {
  const { contestId, roundId: initialRoundId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { request } = useApi();
  const [messageApi, contextHolder] = message.useMessage();

  const [contest, setContest] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [roundLoading, setRoundLoading] = useState(false);

  const [activeRoundId, setActiveRoundId] = useState(initialRoundId || null);
  const [notes, setNotes] = useState({});
  const [editingNote, setEditingNote] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);

  // ─── Fetch contest + rounds on mount
  useEffect(() => {
    const fetchContest = async () => {
      try {
        const data = await request(`/api/contests/${contestId}`);
        const c = data?.data ?? data;
        setContest(c);
        const rs = (c.rounds || []).map(r => ({
          id: r._id,
          name: r.name,
          sequence: r.round_number,
          deadline: r.submission_deadline,
          status: mapRoundStatus(r),
        }));
        setRounds(rs);
        if (!activeRoundId && rs.length > 0) {
          setActiveRoundId(rs[0].id);
        }
      } catch {
        messageApi.error('Không thể tải thông tin cuộc thi');
      }
    };
    fetchContest();
  }, [contestId]);

  // ─── Fetch teams + submissions when round changes
  const fetchRoundData = useCallback(async (rid) => {
    if (!rid) return;
    setRoundLoading(true);
    try {
      const [allTeams, allSubs] = await Promise.all([
        request(`/api/teams/contests/${contestId}/all`),
        request(`/api/submissions?round_id=${rid}`),
      ]);

      // Get mentor's assigned teams for this round
      let assignedTeamIds = new Set();
      try {
        const assignments = await request(`/api/mentor-assignments/contests/${contestId}/rounds/${rid}`);
        const assignList = Array.isArray(assignments) ? assignments : (assignments?.data ?? []);
        assignList.forEach(a => {
          const tid = (a.team_id?._id || a.team_id)?.toString();
          if (tid) assignedTeamIds.add(tid);
        });
      } catch {
        // If no assignments found, show all teams
      }

      const teamList = Array.isArray(allTeams) ? allTeams : (allTeams?.data ?? []);
      const subList = Array.isArray(allSubs) ? allSubs : (allSubs?.data ?? []);

      // Build submission map: teamId → sub info
      const subMap = {};
      subList.forEach(sub => {
        const tid = (sub.team_id?._id || sub.team_id)?.toString();
        if (tid) subMap[tid] = {
          status: mapSubStatus(sub.status),
          repoUrl: sub.repo_url,
          slideUrl: sub.slide_url,
          submittedAt: sub.submitted_at,
        };
      });

      // Filter to assigned teams (or show all if no assignments)
      const filtered = assignedTeamIds.size > 0
        ? teamList.filter(t => assignedTeamIds.has(t._id?.toString()))
        : teamList;

      setTeams(filtered.map(t => ({
        id: t._id,
        name: t.team_name,
        track: t.track_id?.name || t.track_id || '—',
        pool: t.pool_id?.pool_name || t.pool_id || '—',
        members: (t.members || []).map(m => m.full_name || m.email || ''),
        meetingScheduled: null,
      })));

      setSubmissions(subMap);

      // Init notes state for new teams
      setNotes(prev => {
        const next = { ...prev };
        filtered.forEach(t => { if (!(t._id in next)) next[t._id] = ''; });
        return next;
      });
    } catch {
      messageApi.error('Không thể tải dữ liệu vòng thi');
    } finally {
      setRoundLoading(false);
      setLoading(false);
    }
  }, [contestId, request]);

  useEffect(() => {
    if (activeRoundId) fetchRoundData(activeRoundId);
  }, [activeRoundId, fetchRoundData]);

  const round = rounds.find(r => r.id === activeRoundId) || rounds[0];
  const submittedCount = teams.filter(t => {
    const sub = submissions[t.id?.toString()];
    return sub && sub.status !== 'not_submitted';
  }).length;
  const progress = teams.length > 0 ? Math.round((submittedCount / teams.length) * 100) : 0;

  const openNote = (team) => {
    setNoteDraft(notes[team.id] || '');
    setEditingNote(team);
  };
  const saveNote = () => {
    setNotes(prev => ({ ...prev, [editingNote.id]: noteDraft }));
    setEditingNote(null);
    messageApi.success('Đã lưu ghi chú!');
  };

  if (loading) {
    return (
      <div className="mp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="mp-page">
      {contextHolder}

      {/* ─── Top Bar ─── */}
      <div className="mp-topbar">
        <div className="mp-topbar-left">
          <button className="mp-back-btn" onClick={() => navigate(-1)} title="Quay lại">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} width={18} height={18}>
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div className="mp-brand">
            <span className="mp-brand-icon">🎯</span>
            <div>
              <div className="mp-brand-title">Mentor Portal</div>
              <div className="mp-brand-sub">{contest?.title || '...'}</div>
            </div>
          </div>
        </div>
        <div className="mp-topbar-right">
          <div className="mp-user-chip">
            <div className="mp-user-avatar">{(user?.full_name || 'M')[0]}</div>
            <div>
              <div className="mp-user-name">{user?.full_name || 'Mentor'}</div>
              <div className="mp-user-email">{user?.email || ''}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Round Timeline ─── */}
      {rounds.length > 0 && (
        <div className="mp-timeline-wrapper">
          <div className="mp-timeline-label">TIMELINE</div>
          <div className="mp-timeline">
            {rounds.map((r, idx) => {
              const cfg = ROUND_STATUS[r.status];
              const isActive = r.id === activeRoundId;
              return (
                <button
                  key={r.id}
                  className={`mp-timeline-step ${isActive ? 'mp-timeline-step--active' : ''} ${r.status}`}
                  onClick={() => setActiveRoundId(r.id)}
                >
                  <div className="mp-timeline-dot">
                    <span className="mp-timeline-seq">{r.sequence || idx + 1}</span>
                  </div>
                  {idx < rounds.length - 1 && <div className="mp-timeline-line" />}
                  <div className="mp-timeline-info">
                    <div className="mp-timeline-name">{r.name}</div>
                    <Tag color={cfg.color} style={{ fontSize: '0.65rem', padding: '0 5px' }}>{cfg.label}</Tag>
                    {r.deadline && <div className="mp-timeline-deadline">⏰ {fmtDate(r.deadline)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Round Summary Bar ─── */}
      {round && (
        <div className="mp-round-summary">
          <div className="mp-round-info">
            <div className="mp-round-seq-label">ROUND {round.sequence || ''}</div>
            <h2 className="mp-round-name">{round.name}</h2>
          </div>
          <div className="mp-round-stats">
            <div className="mp-round-stat">
              <span className="mp-round-stat-num" style={{ color: '#10b981' }}>{submittedCount}</span>
              <span className="mp-round-stat-lbl">Đã nộp bài</span>
            </div>
            <div className="mp-round-stat">
              <span className="mp-round-stat-num" style={{ color: '#94a3b8' }}>{teams.length - submittedCount}</span>
              <span className="mp-round-stat-lbl">Chưa nộp</span>
            </div>
            <div className="mp-round-stat mp-round-stat--progress">
              <span className="mp-round-stat-lbl" style={{ marginBottom: 4 }}>Tổng nộp: {submittedCount}/{teams.length}</span>
              <Progress
                percent={progress}
                strokeColor="#00d4ff"
                trailColor="rgba(255,255,255,0.08)"
                size="small"
                style={{ minWidth: 150 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Loading state for round switch ─── */}
      {roundLoading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin />
        </div>
      )}

      {/* ─── Team Cards ─── */}
      {!roundLoading && (
        <div className="mp-teams">
          {teams.length === 0 ? (
            <div className="mp-empty" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Không có đội nào được phân công cho vòng này.
            </div>
          ) : teams.map(team => {
            const sub = submissions[team.id?.toString()] || { status: 'not_submitted' };
            const sc = STATUS_CFG[sub.status] || STATUS_CFG.not_submitted;
            const hasNote = !!(notes[team.id]?.trim());
            const isExpanded = expandedTeam === team.id;

            return (
              <div key={team.id} className={`mp-team-card ${isExpanded ? 'mp-team-card--expanded' : ''}`}>
                {/* Card Header */}
                <div className="mp-team-header" onClick={() => setExpandedTeam(isExpanded ? null : team.id)}>
                  <div className="mp-team-header-left">
                    <div className="mp-team-avatar-lg">{team.name.split(' ').pop()[0]}</div>
                    <div className="mp-team-meta">
                      <div className="mp-team-name">{team.name}</div>
                      <div className="mp-team-sub-info">
                        {team.track && team.track !== '—' && <span className="mp-track-badge">{team.track}</span>}
                        {team.pool && team.pool !== '—' && <span className="mp-pool-badge">{team.pool}</span>}
                        {team.members.length > 0 && <span className="mp-member-count">👥 {team.members.length} thành viên</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mp-team-header-right">
                    <Tag color={sc.color}>{sc.label}</Tag>
                    {hasNote && (
                      <Tooltip title="Có ghi chú">
                        <span className="mp-note-indicator">📝</span>
                      </Tooltip>
                    )}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      width={16} height={16}
                      style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mp-team-body">
                    {/* Members */}
                    {team.members.length > 0 && (
                      <div className="mp-section">
                        <div className="mp-section-title">Thành viên</div>
                        <div className="mp-member-list">
                          {team.members.map((m, i) => (
                            <div key={i} className="mp-member-chip">
                              <div className="mp-member-dot">{(m || '?')[0]}</div>
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submission */}
                    <div className="mp-section">
                      <div className="mp-section-title">Bài nộp — {round?.name}</div>
                      {sub.status === 'not_submitted' ? (
                        <div className="mp-no-sub">Đội chưa nộp bài cho vòng này.</div>
                      ) : (
                        <div className="mp-sub-detail">
                          <div className="mp-sub-time">
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              Nộp lúc: {fmtDate(sub.submittedAt)}
                            </span>
                            <Tag color={sc.color} style={{ marginLeft: 8 }}>{sc.label}</Tag>
                          </div>
                          <div className="mp-sub-links">
                            {sub.repoUrl
                              ? <a href={sub.repoUrl} target="_blank" rel="noreferrer" className="mp-link mp-link--repo">🔗 Xem Repo</a>
                              : <span className="mp-no-link">Chưa có repo</span>}
                            {sub.slideUrl
                              ? <a href={sub.slideUrl} target="_blank" rel="noreferrer" className="mp-link mp-link--slide">📊 Xem Slide</a>
                              : <span className="mp-no-link">Chưa có slide</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="mp-section">
                      <div className="mp-section-header">
                        <div className="mp-section-title">Ghi chú của Mentor</div>
                        <button className="mp-note-edit-btn" onClick={() => openNote(team)}>
                          {hasNote ? '✏️ Sửa ghi chú' : '+ Thêm ghi chú'}
                        </button>
                      </div>
                      {notes[team.id]?.trim()
                        ? <div className="mp-note-body">{notes[team.id]}</div>
                        : <div className="mp-no-sub">Chưa có ghi chú nào.</div>
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Note Edit Modal ─── */}
      <Modal
        title={`📝 Ghi chú — ${editingNote?.name}`}
        open={!!editingNote}
        onOk={saveNote}
        onCancel={() => setEditingNote(null)}
        okText="Lưu ghi chú"
        cancelText="Hủy"
      >
        <textarea
          className="mp-note-textarea"
          rows={6}
          placeholder="Nhập ghi chú về đội này (điểm mạnh, điểm yếu, hướng cải thiện, lịch họp...)..."
          value={noteDraft}
          onChange={e => setNoteDraft(e.target.value)}
        />
      </Modal>
    </div>
  );
}
