import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Tag, Progress, Modal, message, Tooltip, Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

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

const mapSubStatus = (s) => {
  const m = { SUBMITTED: 'submitted', LATE: 'late_pending', LATE_PENDING: 'late_pending', APPROVED: 'late_approved', REJECTED: 'rejected' };
  return m[s] || 'not_submitted';
};

const mapRoundStatus = (r) => r.is_active ? 'active' : (r.scoring_locked ? 'ended' : 'upcoming');

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

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
        if (!activeRoundId && rs.length > 0) setActiveRoundId(rs[0].id);
      } catch {
        messageApi.error('Không thể tải thông tin cuộc thi');
      }
    };
    fetchContest();
  }, [contestId]);

  const fetchRoundData = useCallback(async (rid) => {
    if (!rid) return;
    setRoundLoading(true);
    try {
      const [allTeams, allSubs] = await Promise.all([
        request(`/api/teams/contests/${contestId}/all`),
        request(`/api/submissions?round_id=${rid}`),
      ]);

      let assignedTeamIds = new Set();
      try {
        const assignments = await request(`/api/mentor-assignments/contests/${contestId}/rounds/${rid}`);
        const assignList = Array.isArray(assignments) ? assignments : (assignments?.data ?? []);
        assignList.forEach(a => {
          const tid = (a.team_id?._id || a.team_id)?.toString();
          if (tid) assignedTeamIds.add(tid);
        });
      } catch {}

      const teamList = Array.isArray(allTeams) ? allTeams : (allTeams?.data ?? []);
      const subList = Array.isArray(allSubs) ? allSubs : (allSubs?.data ?? []);

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

  const openNote = (team) => { setNoteDraft(notes[team.id] || ''); setEditingNote(team); };
  const saveNote = () => {
    setNotes(prev => ({ ...prev, [editingNote.id]: noteDraft }));
    setEditingNote(null);
    messageApi.success('Đã lưu ghi chú!');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-[#060b16]"><Spin size="large" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#060b16] text-[#c9d6e8] flex flex-col">
      {contextHolder}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0b1120] border-b border-white/5 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white cursor-pointer hover:bg-white/10 transition-all"
            onClick={() => navigate(-1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} width={18} height={18}>
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] flex items-center justify-center text-lg">🎯</div>
            <div>
              <div className="font-bold text-white text-[0.9rem]">Mentor Portal</div>
              <div className="text-[0.72rem] text-white/40">{contest?.title || '...'}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)]">
          <div className="w-8 h-8 rounded-lg bg-[rgba(16,185,129,0.15)] flex items-center justify-center font-bold text-[0.85rem] text-[#10b981]">
            {(user?.full_name || 'M')[0]}
          </div>
          <div>
            <div className="text-[0.82rem] font-semibold text-white/80">{user?.full_name || 'Mentor'}</div>
            <div className="text-[0.68rem] text-white/35">{user?.email || ''}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-[960px] mx-auto w-full px-5 py-6 flex flex-col gap-5">

        {/* Round Timeline */}
        {rounds.length > 0 && (
          <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-4">
            <div className="text-[0.68rem] font-bold text-white/30 tracking-widest mb-3">TIMELINE</div>
            <div className="flex items-start gap-0 flex-wrap">
              {rounds.map((r, idx) => {
                const cfg = ROUND_STATUS[r.status];
                const isActive = r.id === activeRoundId;
                const dotColor = { active: '#10b981', upcoming: '#00d4ff', ended: '#6b7280' }[r.status];
                return (
                  <button
                    key={r.id}
                    className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl cursor-pointer border transition-all text-left ${
                      isActive
                        ? 'bg-[rgba(0,212,255,0.08)] border-[rgba(0,212,255,0.25)]'
                        : 'border-transparent hover:bg-white/5'
                    }`}
                    onClick={() => setActiveRoundId(r.id)}
                    style={{ background: 'none' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2"
                      style={{
                        borderColor: dotColor,
                        background: isActive ? `${dotColor}20` : 'transparent',
                        color: dotColor,
                      }}
                    >
                      {r.sequence || idx + 1}
                    </div>
                    <div className="text-[0.8rem] font-semibold text-white/80 text-center">{r.name}</div>
                    <Tag color={cfg.color} style={{ fontSize: '0.65rem', padding: '0 5px' }}>{cfg.label}</Tag>
                    {r.deadline && <div className="text-[0.65rem] text-white/30">⏰ {fmtDate(r.deadline)}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Round Summary */}
        {round && (
          <div className="bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.2)] rounded-2xl p-5">
            <div className="text-[0.68rem] font-bold text-[#10b981] tracking-widest mb-1">ROUND {round.sequence || ''}</div>
            <h2 className="text-lg font-extrabold text-white mb-3">{round.name}</h2>
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { num: submittedCount, label: 'Đã nộp bài', color: '#10b981' },
                { num: teams.length - submittedCount, label: 'Chưa nộp', color: '#94a3b8' },
              ].map(s => (
                <div key={s.label} className="bg-black/30 border border-white/7 rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                  <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.num}</div>
                  <div className="text-[0.68rem] text-white/40 mt-0.5">{s.label}</div>
                </div>
              ))}
              <div className="flex-1 min-w-[200px] bg-black/30 border border-white/7 rounded-xl px-4 py-2.5">
                <div className="text-[0.72rem] text-white/40 mb-2">Tổng nộp: {submittedCount}/{teams.length}</div>
                <Progress percent={progress} strokeColor="#00d4ff" trailColor="rgba(255,255,255,0.08)" size="small" />
              </div>
            </div>
          </div>
        )}

        {roundLoading && <div className="text-center py-10"><Spin /></div>}

        {/* Team Cards */}
        {!roundLoading && (
          <div className="flex flex-col gap-3">
            {teams.length === 0 ? (
              <div className="text-center py-16 text-white/40">Không có đội nào được phân công cho vòng này.</div>
            ) : teams.map(team => {
              const sub = submissions[team.id?.toString()] || { status: 'not_submitted' };
              const sc = STATUS_CFG[sub.status] || STATUS_CFG.not_submitted;
              const hasNote = !!(notes[team.id]?.trim());
              const isExpanded = expandedTeam === team.id;

              return (
                <div
                  key={team.id}
                  className={`bg-white/[0.025] border rounded-2xl overflow-hidden transition-all ${
                    isExpanded ? 'border-[rgba(16,185,129,0.25)]' : 'border-white/7'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02]"
                    onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] flex items-center justify-center font-bold text-[#10b981] text-[0.9rem]">
                        {team.name.split(' ').pop()[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-[0.9rem]">{team.name}</div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {team.track && team.track !== '—' && (
                            <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-[rgba(0,212,255,0.08)] text-[#00d4ff]">{team.track}</span>
                          )}
                          {team.pool && team.pool !== '—' && (
                            <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-[rgba(168,85,247,0.08)] text-[#a855f7]">{team.pool}</span>
                          )}
                          {team.members.length > 0 && (
                            <span className="text-[0.68rem] text-white/35">👥 {team.members.length} thành viên</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Tag color={sc.color}>{sc.label}</Tag>
                      {hasNote && (
                        <Tooltip title="Có ghi chú"><span>📝</span></Tooltip>
                      )}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                        width={16} height={16}
                        style={{ color: 'rgba(255,255,255,0.3)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-white/7 px-4 py-4 flex flex-col gap-4">
                      {/* Members */}
                      {team.members.length > 0 && (
                        <div>
                          <div className="text-[0.72rem] font-bold text-white/40 uppercase tracking-wide mb-2">Thành viên</div>
                          <div className="flex flex-wrap gap-2">
                            {team.members.map((m, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                                <div className="w-5 h-5 rounded-full bg-[rgba(16,185,129,0.15)] flex items-center justify-center text-[0.65rem] font-bold text-[#10b981]">
                                  {(m || '?')[0]}
                                </div>
                                <span className="text-[0.78rem] text-white/70">{m}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Submission */}
                      <div>
                        <div className="text-[0.72rem] font-bold text-white/40 uppercase tracking-wide mb-2">Bài nộp — {round?.name}</div>
                        {sub.status === 'not_submitted' ? (
                          <div className="text-sm text-white/40">Đội chưa nộp bài cho vòng này.</div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[0.78rem] text-white/40">Nộp lúc: {fmtDate(sub.submittedAt)}</span>
                              <Tag color={sc.color} style={{ marginLeft: 8 }}>{sc.label}</Tag>
                            </div>
                            <div className="flex items-center gap-3">
                              {sub.repoUrl
                                ? <a href={sub.repoUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] text-sm no-underline hover:bg-[rgba(0,212,255,0.15)]">🔗 Xem Repo</a>
                                : <span className="text-sm text-white/30">Chưa có repo</span>}
                              {sub.slideUrl
                                ? <a href={sub.slideUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.2)] text-[#a855f7] text-sm no-underline hover:bg-[rgba(168,85,247,0.15)]">📊 Xem Slide</a>
                                : <span className="text-sm text-white/30">Chưa có slide</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[0.72rem] font-bold text-white/40 uppercase tracking-wide">Ghi chú của Mentor</div>
                          <button
                            className="text-[0.75rem] text-[#10b981] hover:underline cursor-pointer bg-transparent border-none"
                            onClick={() => openNote(team)}
                          >
                            {hasNote ? '✏️ Sửa ghi chú' : '+ Thêm ghi chú'}
                          </button>
                        </div>
                        {notes[team.id]?.trim()
                          ? <div className="text-sm text-white/60 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 whitespace-pre-line">{notes[team.id]}</div>
                          : <div className="text-sm text-white/30">Chưa có ghi chú nào.</div>
                        }
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note Edit Modal */}
      <Modal
        title={`📝 Ghi chú — ${editingNote?.name}`}
        open={!!editingNote}
        onOk={saveNote}
        onCancel={() => setEditingNote(null)}
        okText="Lưu ghi chú"
        cancelText="Hủy"
      >
        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/25 outline-none resize-none focus:border-[rgba(16,185,129,0.4)] transition-colors mt-2"
          rows={6}
          placeholder="Nhập ghi chú về đội này (điểm mạnh, điểm yếu, hướng cải thiện, lịch họp...)..."
          value={noteDraft}
          onChange={e => setNoteDraft(e.target.value)}
        />
      </Modal>
    </div>
  );
}
