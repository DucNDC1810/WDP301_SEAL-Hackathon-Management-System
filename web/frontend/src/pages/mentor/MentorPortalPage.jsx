import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Tag, Progress, Modal, message, Tooltip, Badge } from 'antd';
import { useAuth } from '../../context/AuthContext';
import './MentorPortalPage.css';

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_CONTEST = {
  name: 'SEAL Hackathon Summer 2026',
  tracks: ['AI & ML', 'Web3', 'FinTech'],
};

const MOCK_ROUNDS = [
  { id: 'r1', name: 'Vòng Ý Tưởng',     sequence: 1, deadline: '2026-06-08T23:59:00', status: 'active' },
  { id: 'r2', name: 'Vòng Prototype',    sequence: 2, deadline: '2026-06-12T23:59:00', status: 'upcoming' },
  { id: 'r3', name: 'Vòng Chung Kết',    sequence: 3, deadline: '2026-06-15T23:59:00', status: 'upcoming' },
];

const MOCK_TEAMS = [
  {
    id: 't1',
    name: 'Team Alpha',
    track: 'AI & ML',
    pool: 'Bảng A',
    members: ['Nguyễn Văn A', 'Trần Thị B', 'Phạm Văn C'],
    submissions: {
      r1: { status: 'submitted', repoUrl: 'https://github.com/alpha', slideUrl: 'https://drive.google.com/alpha', submittedAt: '2026-06-07T10:22:00' },
      r2: { status: 'not_submitted', repoUrl: null, slideUrl: null, submittedAt: null },
    },
    notes: 'Đội có ý tưởng tốt về AI recommendation. Cần cải thiện phần thuyết trình kỹ thuật.',
    meetingScheduled: '2026-06-07T14:00:00',
  },
  {
    id: 't2',
    name: 'Team Coral',
    track: 'AI & ML',
    pool: 'Bảng A',
    members: ['Lê Thị D', 'Hoàng Văn E'],
    submissions: {
      r1: { status: 'late_approved', repoUrl: 'https://github.com/coral', slideUrl: null, submittedAt: '2026-06-08T01:15:00' },
      r2: { status: 'not_submitted', repoUrl: null, slideUrl: null, submittedAt: null },
    },
    notes: '',
    meetingScheduled: null,
  },
  {
    id: 't3',
    name: 'Team Nova',
    track: 'Web3',
    pool: 'Bảng B',
    members: ['Đinh Văn F', 'Bùi Thị G', 'Đỗ Văn H', 'Ngô Thị I'],
    submissions: {
      r1: { status: 'submitted', repoUrl: 'https://github.com/nova', slideUrl: 'https://slides.com/nova', submittedAt: '2026-06-06T22:30:00' },
      r2: { status: 'not_submitted', repoUrl: null, slideUrl: null, submittedAt: null },
    },
    notes: 'Smart contract khá ổn. Cần hoàn thiện UI demo cho vòng 2.',
    meetingScheduled: '2026-06-09T10:00:00',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  submitted:     { label: 'Đã nộp',          color: 'green' },
  late_approved: { label: 'Trễ — Đã duyệt',  color: 'orange' },
  late_pending:  { label: 'Trễ — Chờ duyệt', color: 'orange' },
  not_submitted: { label: 'Chưa nộp',        color: 'default' },
};

const ROUND_STATUS = {
  active:   { label: 'Đang diễn ra', color: 'green' },
  upcoming: { label: 'Sắp tới',      color: 'blue' },
  ended:    { label: 'Đã kết thúc',  color: 'default' },
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MentorPortalPage() {
  const { contestId, roundId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const [activeRound, setActiveRound] = useState(MOCK_ROUNDS[0].id);
  const [notes, setNotes] = useState(
    Object.fromEntries(MOCK_TEAMS.map(t => [t.id, t.notes]))
  );
  const [editingNote, setEditingNote] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);

  const round = MOCK_ROUNDS.find(r => r.id === activeRound) || MOCK_ROUNDS[0];
  const submittedCount = MOCK_TEAMS.filter(t => {
    const sub = t.submissions[activeRound];
    return sub && sub.status !== 'not_submitted';
  }).length;
  const progress = Math.round((submittedCount / MOCK_TEAMS.length) * 100);

  const openNote = (team) => {
    setNoteDraft(notes[team.id] || '');
    setEditingNote(team);
  };
  const saveNote = () => {
    setNotes(prev => ({ ...prev, [editingNote.id]: noteDraft }));
    setEditingNote(null);
    messageApi.success('Đã lưu ghi chú!');
  };

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
              <div className="mp-brand-sub">{MOCK_CONTEST.name}</div>
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
      <div className="mp-timeline-wrapper">
        <div className="mp-timeline-label">TIMELINE</div>
        <div className="mp-timeline">
          {MOCK_ROUNDS.map((r, idx) => {
            const cfg = ROUND_STATUS[r.status];
            const isActive = r.id === activeRound;
            return (
              <button
                key={r.id}
                className={`mp-timeline-step ${isActive ? 'mp-timeline-step--active' : ''} ${r.status}`}
                onClick={() => setActiveRound(r.id)}
              >
                <div className="mp-timeline-dot">
                  <span className="mp-timeline-seq">{r.sequence}</span>
                </div>
                {idx < MOCK_ROUNDS.length - 1 && <div className="mp-timeline-line" />}
                <div className="mp-timeline-info">
                  <div className="mp-timeline-name">{r.name}</div>
                  <Tag color={cfg.color} style={{ fontSize: '0.65rem', padding: '0 5px' }}>{cfg.label}</Tag>
                  <div className="mp-timeline-deadline">⏰ {fmtDate(r.deadline)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Round Summary Bar ─── */}
      <div className="mp-round-summary">
        <div className="mp-round-info">
          <div className="mp-round-seq-label">ROUND {round.sequence}</div>
          <h2 className="mp-round-name">{round.name}</h2>
        </div>
        <div className="mp-round-stats">
          <div className="mp-round-stat">
            <span className="mp-round-stat-num" style={{ color: '#10b981' }}>{submittedCount}</span>
            <span className="mp-round-stat-lbl">Đã nộp bài</span>
          </div>
          <div className="mp-round-stat">
            <span className="mp-round-stat-num" style={{ color: '#94a3b8' }}>{MOCK_TEAMS.length - submittedCount}</span>
            <span className="mp-round-stat-lbl">Chưa nộp</span>
          </div>
          <div className="mp-round-stat mp-round-stat--progress">
            <span className="mp-round-stat-lbl" style={{ marginBottom: 4 }}>Tổng nộp: {submittedCount}/{MOCK_TEAMS.length}</span>
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

      {/* ─── Team Cards ─── */}
      <div className="mp-teams">
        {MOCK_TEAMS.map(team => {
          const sub = team.submissions[activeRound] || { status: 'not_submitted' };
          const sc = STATUS_CFG[sub.status] || STATUS_CFG.not_submitted;
          const hasNote = !!(notes[team.id]?.trim());
          const isExpanded = expandedTeam === team.id;
          const hasMeeting = !!team.meetingScheduled;

          return (
            <div key={team.id} className={`mp-team-card ${isExpanded ? 'mp-team-card--expanded' : ''}`}>
              {/* Card Header */}
              <div className="mp-team-header" onClick={() => setExpandedTeam(isExpanded ? null : team.id)}>
                <div className="mp-team-header-left">
                  <div className="mp-team-avatar-lg">{team.name.split(' ').pop()[0]}</div>
                  <div className="mp-team-meta">
                    <div className="mp-team-name">{team.name}</div>
                    <div className="mp-team-sub-info">
                      <span className="mp-track-badge">{team.track}</span>
                      <span className="mp-pool-badge">{team.pool}</span>
                      <span className="mp-member-count">👥 {team.members.length} thành viên</span>
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
                  {hasMeeting && (
                    <Tooltip title={`Đã lên lịch meeting: ${fmtDate(team.meetingScheduled)}`}>
                      <span className="mp-meeting-indicator">📅</span>
                    </Tooltip>
                  )}
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    width={16} height={16}
                    style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mp-team-body">
                  {/* Members */}
                  <div className="mp-section">
                    <div className="mp-section-title">Thành viên</div>
                    <div className="mp-member-list">
                      {team.members.map((m, i) => (
                        <div key={i} className="mp-member-chip">
                          <div className="mp-member-dot">{m[0]}</div>
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submission */}
                  <div className="mp-section">
                    <div className="mp-section-title">Bài nộp — {round.name}</div>
                    {sub.status === 'not_submitted' ? (
                      <div className="mp-no-sub">Đội chưa nộp bài cho vòng này.</div>
                    ) : (
                      <div className="mp-sub-detail">
                        <div className="mp-sub-time">
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Nộp lúc: {fmtDate(sub.submittedAt)}</span>
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

                  {/* Meeting */}
                  <div className="mp-section">
                    <div className="mp-section-title">Lịch hẹn mentoring</div>
                    {hasMeeting ? (
                      <div className="mp-meeting-info">
                        📅 <span style={{ color: 'var(--text-primary)' }}>{fmtDate(team.meetingScheduled)}</span>
                      </div>
                    ) : (
                      <div className="mp-no-sub">Chưa lên lịch meeting.</div>
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
