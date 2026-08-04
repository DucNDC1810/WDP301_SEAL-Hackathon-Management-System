import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';

// GitHub's public API allows only 60 unauthenticated requests/hour per IP,
// shared with the admin git-activity feature. This endpoint is the ONLY
// place in the app allowed to hit GitHub, so we fetch once on mount and
// lock the manual refresh button for a full minute after every press —
// never poll, never refetch on focus/interval.
const REFRESH_COOLDOWN_MS = 60 * 1000;

// Vietnamese relative time, e.g. "12 phút trước" — lets the student know
// the numbers below may be stale rather than live.
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < 60000) return 'vừa xong';
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  return `${day} ngày trước`;
};

// Messages for the non-"ok" statuses the backend can return. `not_submitted`
// is handled separately (hides the whole card) and isn't listed here.
const STATUS_MESSAGES = {
  unsupported: 'Chỉ hỗ trợ thống kê repo GitHub công khai.',
  private: 'Repo đang private — không thống kê được. Mở public để giám khảo và đồng đội xem được.',
  rate_limited: 'GitHub đang giới hạn truy vấn. Thử lại sau ít phút.',
  error: 'Không lấy được dữ liệu Git lúc này.',
};

// props: teamId, roundId — identify which round's submission to inspect.
// roundName — shown in the card title. C — the page's color palette object.
export const GitActivityCard = ({ teamId, roundId, roundName, C }) => {
  const { request } = useApi();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // response.data from the git-stats endpoint
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const cardStyle = {
    border: `1px solid ${C.line}`,
    borderRadius: 14,
    background: C.card,
    overflow: 'hidden',
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await request(`/api/teams/${teamId}/rounds/${roundId}/git-stats`);
      setData(res?.data ?? null);
    } catch (err) {
      setErrorMsg(err.message || 'Không lấy được dữ liệu Git lúc này');
      setData(null);
    } finally {
      setLoading(false);
      setCooldownUntil(Date.now() + REFRESH_COOLDOWN_MS);
    }
  }, [request, teamId, roundId]);

  useEffect(() => {
    // Fetch exactly once on mount — see quota note above. Re-running only
    // when the round actually changes (not on every render) is intentional.
    const load = async () => { await fetchStats(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, roundId]);

  // Tick once a second only while the button is cooling down, so the label
  // counts down live without setting up an interval the rest of the time.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const canRefresh = !loading && cooldownRemaining <= 0;
  const status = errorMsg ? 'error' : data?.status;

  // No submission for this round yet — git stats don't apply, hide entirely.
  if (status === 'not_submitted') return null;

  const maxCommits = data?.total_commits > 0 ? data.total_commits : 1;

  return (
    <div style={{ ...cardStyle, padding: '20px 22px' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.line}`, paddingBottom: 12, marginBottom: 16, gap: 10,
      }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: C.dim }}>
            Hoạt động Git{roundName ? ` — ${roundName}` : ''}
          </span>
          {data?.fetched_at && (
            <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
              Cập nhật {formatRelativeTime(data.fetched_at)}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={fetchStats}
          disabled={!canRefresh}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
            fontSize: 12, fontWeight: 600, color: canRefresh ? C.cyan : C.dim,
            background: canRefresh ? 'rgba(0,212,255,.08)' : 'rgba(126,144,171,.06)',
            border: `1px solid ${canRefresh ? 'rgba(0,212,255,.25)' : C.line2}`,
            borderRadius: 6, padding: '5px 10px',
            cursor: canRefresh ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Đang tải...' : cooldownRemaining > 0 ? `Làm mới (${cooldownRemaining}s)` : '↻ Làm mới'}
        </button>
      </div>

      {loading && !data && (
        <p style={{ fontSize: 13, color: C.dim, margin: 0 }}>Đang tải dữ liệu Git...</p>
      )}

      {!loading && status === 'cold' && (
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
          Chưa có dữ liệu — bấm làm mới để tải.
        </p>
      )}

      {!loading && STATUS_MESSAGES[status] && (
        <p style={{ fontSize: 13, color: C.amber, margin: 0 }}>
          {STATUS_MESSAGES[status]}
        </p>
      )}

      {!loading && status === 'ok' && (
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
            {data.members_with_activity ?? 0}/{data.members_total ?? 0} thành viên có hoạt động · {data.total_commits ?? 0} commit
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {(data.contributors ?? []).map((c) => (
              <div key={c.github_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={c.avatar_url}
                  alt={c.username}
                  style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                  onError={(e) => { e.target.style.visibility = 'hidden'; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <a
                      href={c.profile_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: C.text, fontWeight: 600, textDecoration: 'none' }}
                    >
                      {c.username}
                    </a>
                    <span style={{ color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>{c.commit_count} commit</span>
                  </div>
                  <div style={{ height: 6, background: C.line2, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.min((c.commit_count / maxCommits) * 100, 100)}%`,
                      background: 'linear-gradient(90deg,#38bdf8,#818cf8)', borderRadius: 99,
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(data.members_without_activity ?? []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {data.members_without_activity.map((email) => (
                <div key={email} style={{ fontSize: 12, color: C.amber }}>
                  ⚠ chưa liên kết GitHub — {email}{' '}
                  <a href="/dashboard/profile" style={{ color: C.cyan }}>liên kết ngay</a>
                </div>
              ))}
            </div>
          )}

          {data.unmatched_count > 0 && (
            <p style={{ fontSize: 12, color: C.amber, margin: '0 0 10px' }}>
              ⚠ {data.unmatched_count} commit từ tài khoản không khớp thành viên nào trong đội
            </p>
          )}

          <p style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
            Số commit không phản ánh đầy đủ đóng góp — thiết kế, slide, thuyết trình, review đều không được tính. Chỉ dùng để tham khảo.
          </p>
        </div>
      )}
    </div>
  );
};
