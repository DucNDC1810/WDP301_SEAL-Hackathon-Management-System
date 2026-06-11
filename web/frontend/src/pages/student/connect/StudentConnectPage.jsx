import { useEffect, useState } from 'react';
import { Empty } from 'antd';
import { useApi } from '../../../hooks/useApi';
import '../student.css';

// ---------------------------------------------------------------------------
// SVG icon helpers
// ---------------------------------------------------------------------------
const Ico = ({ d, size = 14, sw = 1.8 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
  >
    {(Array.isArray(d) ? d : [d]).map((p, i) => (
      <path key={i} d={p} />
    ))}
  </svg>
);

const MAIL =
  'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6';
const PHONE = [
  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export const StudentConnectPage = () => {
  const { request } = useApi();

  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasTeam, setHasTeam] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const teamsRes = await request('/api/teams/me');
        const teams = Array.isArray(teamsRes) ? teamsRes : teamsRes?.data ?? [];
        if (!teams.length) {
          setLoading(false);
          return;
        }

        setHasTeam(true);
        const team = teams[0];
        const contestId = team.contest_id?._id ?? team.contest_id;
        const rounds = team.contest_id?.rounds ?? [];
        const active = rounds.find((r) => r.is_active) ?? rounds[0];
        if (!active || !contestId) {
          setLoading(false);
          return;
        }

        try {
          const res = await request(
            `/api/mentor-assignments/contests/${contestId}/rounds/${active._id}`
          );
          const list = Array.isArray(res) ? res : res?.data ?? [];
          const assignment = list.find(
            (a) =>
              (a.pool_id?._id ?? a.pool_id) ===
              (team.pool_id?._id ?? team.pool_id)
          );
          if (assignment?.mentor_id) setMentor(assignment.mentor_id);
        } catch (_) {
          // 403 expected for students — show empty state
        }
      } catch (_) {
        // ignore load errors
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="sp-loading">
        <div className="sp-spinner" />
      </div>
    );
  }

  return (
    <div className="sp-page">
      <h2 className="sp-page-title">Kết nối</h2>

      {!hasTeam ? (
        <Empty description="Bạn cần có đội thi để xem thông tin mentor." />
      ) : (
        <div className="sp-stack">
          {/* Mentor card */}
          <div className="sp-card" style={{ maxWidth: 480 }}>
            <span className="sp-label">MENTOR PHỤ TRÁCH</span>

            {mentor ? (
              <div className="sp-mentor-card">
                <div className="sp-av sp-av--lg">
                  {(mentor.full_name?.[0] ?? 'M').toUpperCase()}
                </div>
                <div className="sp-mentor-info">
                  <span className="sp-strong">{mentor.full_name}</span>

                  {mentor.email && (
                    <div className="sp-flex sp-gap-2">
                      <span className="sp-muted">
                        <Ico d={MAIL} />
                      </span>
                      <span className="sp-text">{mentor.email}</span>
                    </div>
                  )}

                  {mentor.phone && (
                    <div className="sp-flex sp-gap-2">
                      <span className="sp-muted">
                        <Ico d={PHONE} />
                      </span>
                      <span className="sp-text">{mentor.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Mentor chưa được phân công. Vui lòng chờ admin cập nhật."
              />
            )}
          </div>

          {/* Placeholder chat card */}
          <div className="sp-card" style={{ maxWidth: 480 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Tính năng nhắn tin sẽ sớm ra mắt."
            />
          </div>
        </div>
      )}
    </div>
  );
};
