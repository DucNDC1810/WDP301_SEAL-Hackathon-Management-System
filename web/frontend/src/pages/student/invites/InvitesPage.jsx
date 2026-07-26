import { useEffect, useState } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';

// ── Color tokens ──────────────────────────────────────────────────────────────
// bg: #070b14 | card: #0c1524 | border: #1b2740 | text: #e6eef9 | text2: #c9d6e8
// muted: #7e90ab | dim: #5a708f | cyan: #00d4ff | purple: #7c3aed | purple2: #a855f7
// green: #22c55e | amber: #f59e0b | red: #f87171

// ── Avatar gradient helper ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'linear-gradient(135deg,#00d4ff,#7c3aed)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
  'linear-gradient(135deg,#22c55e,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
];

function teamGradient(name = '') {
  const i = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

// ── Relative time helper ──────────────────────────────────────────────────────
function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins} phút trước`;
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${days} ngày trước`;
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width={18} height={18} style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="8" strokeWidth={3} />
    <line x1="12" y1="12" x2="12" y2="16" />
  </svg>
);

const IconEmptyInbox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#5a708f" strokeWidth={1.5}
    strokeLinecap="round" strokeLinejoin="round" width={52} height={52}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <line x1="4" y1="4" x2="20" y2="20" />
  </svg>
);

const IconSpinner = () => (
  <div style={{
    width: 36, height: 36, border: '3px solid #1b2740',
    borderTop: '3px solid #00d4ff', borderRadius: '50%',
    animation: 'sp-spin 0.7s linear infinite',
  }} />
);

// ── Main Component ────────────────────────────────────────────────────────────
export const StudentInvitesPage = () => {
  const { user } = useAuth();
  const { request } = useApi();
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  // actionLoading: { [invitationId]: 'accept' | 'reject' }
  const [actionLoading, setActionLoading] = useState({});
  const [hasTeam, setHasTeam] = useState(false);

  // Load pending invitations and current team status
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Try to fetch invitations; gracefully fall back to empty on 404
        let invites = [];
        try {
          const res = await request('/api/invitations/me');
          invites = Array.isArray(res) ? res : res?.data ?? [];
        } catch (err) {
          if (err.status !== 404) throw err;
        }
        // Only show pending invitations
        setInvitations(invites.filter(inv => !inv.status || inv.status === 'pending'));

        // Check if user already has a team
        try {
          const teamRes = await request('/api/teams/me');
          const teams = Array.isArray(teamRes) ? teamRes : teamRes?.data ?? [];
          setHasTeam(teams.length > 0);
        } catch {
          setHasTeam(false);
        }
      } catch {
        message.error('Không thể tải danh sách lời mời');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAccept = async (inv) => {
    setActionLoading(prev => ({ ...prev, [inv._id]: 'accept' }));
    try {
      await request(`/api/invitations/${inv._id}/accept`, { method: 'POST' });
      message.success('Đã chấp nhận lời mời! Chào mừng bạn vào đội.');
      setInvitations(prev => prev.filter(i => i._id !== inv._id));
      navigate('/dashboard/team');
    } catch (err) {
      message.error(err.message || 'Không thể chấp nhận lời mời');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[inv._id]; return n; });
    }
  };

  const handleReject = async (inv) => {
    setActionLoading(prev => ({ ...prev, [inv._id]: 'reject' }));
    try {
      await request(`/api/invitations/${inv._id}/reject`, { method: 'POST' });
      message.success('Đã từ chối lời mời.');
      setInvitations(prev => prev.filter(i => i._id !== inv._id));
    } catch (err) {
      message.error(err.message || 'Không thể từ chối lời mời');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[inv._id]; return n; });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Spinner keyframe — injected once */}
      <style>{`@keyframes sp-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 20,
        fontFamily: "'Manrope', sans-serif", color: '#c9d6e8',
      }}>
        {/* 1. Page header */}
        <div>
          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            color: '#5a708f', letterSpacing: '1.4px', marginBottom: 6,
          }}>
            Hộp thư
          </div>
          <h1 style={{
            margin: 0, fontSize: 30, fontWeight: 700, color: '#e6eef9',
            fontFamily: "'Space Grotesk', 'Manrope', sans-serif",
          }}>
            Lời mời vào đội
          </h1>
        </div>

        {/* 2. Info banner — shown if user already has a team */}
        {hasTeam && (
          <div style={{
            border: '1px solid rgba(0,212,255,.2)', borderRadius: 11,
            background: 'rgba(0,212,255,.06)', padding: '14px 16px',
            display: 'flex', gap: 11, alignItems: 'flex-start',
          }}>
            <IconInfo />
            <span style={{ fontSize: 12.5, color: '#9fb2cc', lineHeight: 1.55 }}>
              Chấp nhận một lời mời khác sẽ khiến bạn rời khỏi đội hiện tại.
            </span>
          </div>
        )}

        {/* 3. Loading state */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <IconSpinner />
          </div>
        )}

        {/* 4. Empty state */}
        {!loading && invitations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <IconEmptyInbox />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#c9d6e8', marginBottom: 8 }}>
              Chưa có lời mời nào
            </div>
            <div style={{ fontSize: 13, color: '#7e90ab' }}>
              Các lời mời vào đội sẽ xuất hiện ở đây
            </div>
          </div>
        )}

        {/* 5. Invitation list */}
        {!loading && invitations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {invitations.map(inv => {
              const teamName = inv.team_id?.team_name ?? 'Đội không tên';
              const memberCount = inv.team_id?.members?.length ?? 0;
              const inviterName = inv.invited_by?.full_name ?? 'Ai đó';
              const contestTitle = inv.contest_id?.title ?? '';
              const field = inv.contest_id?.field ?? '';
              const createdAt = inv.created_at ?? '';
              const isAccepting = actionLoading[inv._id] === 'accept';
              const isRejecting = actionLoading[inv._id] === 'reject';
              const isBusy = isAccepting || isRejecting;

              return (
                <div
                  key={inv._id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '18px 22px',
                    border: '1px solid #1b2740', borderRadius: 14,
                    background: '#0c1524',
                    transition: 'border-color .18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,.44)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1b2740'}
                >
                  {/* Team avatar */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: teamGradient(teamName),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {teamName[0]?.toUpperCase() ?? '?'}
                  </div>

                  {/* Info section */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Row 1: team name + field chip */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#e6eef9' }}>
                        {teamName}
                      </span>
                      {field && (
                        <span style={{
                          fontSize: 10.5, padding: '2px 8px', borderRadius: 5,
                          background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.25)',
                          color: '#a855f7', fontWeight: 600, letterSpacing: '0.4px',
                        }}>
                          {field}
                        </span>
                      )}
                      {contestTitle && (
                        <span style={{
                          fontSize: 10.5, padding: '2px 8px', borderRadius: 5,
                          background: 'rgba(0,212,255,.08)', border: '1px solid rgba(0,212,255,.2)',
                          color: '#00d4ff', fontWeight: 600,
                        }}>
                          {contestTitle}
                        </span>
                      )}
                    </div>
                    {/* Row 2: meta info */}
                    <div style={{ fontSize: 13, color: '#7e90ab' }}>
                      Mời bởi <span style={{ color: '#9fb2cc', fontWeight: 600 }}>{inviterName}</span>
                      {' · '}
                      {memberCount} thành viên
                      {createdAt && (
                        <>{' · '}{relTime(createdAt)}</>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ flexShrink: 0, display: 'flex', gap: 10 }}>
                    {/* Reject */}
                    <button
                      disabled={isBusy}
                      onClick={() => handleReject(inv)}
                      style={{
                        padding: '9px 18px', borderRadius: 9,
                        border: '1px solid rgba(248,113,113,.3)',
                        background: 'transparent', color: '#f87171',
                        fontSize: 13, fontWeight: 600, cursor: isBusy ? 'not-allowed' : 'pointer',
                        opacity: isBusy ? 0.6 : 1,
                        display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'border-color .15s, background .15s',
                      }}
                      onMouseEnter={e => { if (!isBusy) e.currentTarget.style.background = 'rgba(248,113,113,.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {isRejecting ? (
                        <span style={{
                          display: 'inline-block', width: 13, height: 13,
                          border: '2px solid rgba(248,113,113,.4)',
                          borderTop: '2px solid #f87171', borderRadius: '50%',
                          animation: 'sp-spin 0.7s linear infinite',
                        }} />
                      ) : null}
                      Từ chối
                    </button>

                    {/* Accept */}
                    <button
                      disabled={isBusy}
                      onClick={() => handleAccept(inv)}
                      style={{
                        padding: '9px 18px', borderRadius: 9,
                        border: 'none',
                        background: isBusy ? 'rgba(0,212,255,.4)' : 'linear-gradient(135deg,#00d4ff,#0099cc)',
                        color: '#070b14',
                        fontSize: 13, fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'opacity .15s',
                        opacity: isBusy ? 0.7 : 1,
                      }}
                    >
                      {isAccepting ? (
                        <span style={{
                          display: 'inline-block', width: 13, height: 13,
                          border: '2px solid rgba(7,11,20,.3)',
                          borderTop: '2px solid #070b14', borderRadius: '50%',
                          animation: 'sp-spin 0.7s linear infinite',
                        }} />
                      ) : null}
                      Chấp nhận
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
