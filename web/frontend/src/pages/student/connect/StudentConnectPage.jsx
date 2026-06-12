import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, Button } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
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
  const navigate = useNavigate();

  const [mentors, setMentors] = useState([]);
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

        // Dùng đúng API chat — trả về mentor được phân công cho team của student
        const res = await request(`/api/chat/team/${team._id}/mentors`);
        const list = res?.data ?? [];
        setMentors(list);
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

            {mentors.length > 0 ? (
              <div className="sp-stack" style={{ gap: 12, marginTop: 8 }}>
                {mentors.map((conv) => (
                  <div key={conv.assignmentId} className="sp-mentor-card">
                    <div className="sp-av sp-av--lg">
                      {(conv.mentorName?.[0] ?? 'M').toUpperCase()}
                    </div>
                    <div className="sp-mentor-info">
                      <span className="sp-strong">{conv.mentorName}</span>
                      <span className="sp-muted" style={{ fontSize: '0.78rem' }}>
                        {conv.contestTitle} · {conv.roundName}
                      </span>

                      {conv.mentorEmail && (
                        <div className="sp-flex sp-gap-2">
                          <span className="sp-muted">
                            <Ico d={MAIL} />
                          </span>
                          <span className="sp-text">{conv.mentorEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Mentor chưa được phân công. Vui lòng chờ admin cập nhật."
              />
            )}
          </div>

          {/* Chat card */}
          {mentors.length > 0 && (
            <div className="sp-card" style={{ maxWidth: 480 }}>
              <span className="sp-label">NHẮN TIN VỚI MENTOR</span>
              <p className="sp-muted" style={{ margin: '8px 0 12px' }}>
                Đặt câu hỏi, nhận phản hồi và theo dõi cuộc trò chuyện với mentor được phân công.
              </p>
              <Button
                type="primary"
                icon={<MessageOutlined />}
                onClick={() => navigate('/chat/mentor')}
                style={{ background: 'linear-gradient(135deg,#00d4ff,#0ea5e9)', border: 'none' }}
              >
                Mở khung chat với Mentor
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
