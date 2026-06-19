import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SubmissionReviewTab from './tabs/SubmissionReviewTab';
import ScoringLockTab from './tabs/ScoringLockTab';
import TeamEliminationTab from './tabs/TeamEliminationTab';
import PresentationScheduleTab from './tabs/PresentationScheduleTab';
import './HackathonFeaturePage.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const tok = () => localStorage.getItem('accessToken');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const FEATURE_TITLES = {
  'submission-review': 'Phê Duyệt Bài Nộp Late',
  'scoring-lock': 'Khóa Chấm Điểm Vòng Thi',
  'elimination': 'Loại Đội Vi Phạm Quy Chế',
  'timeline': 'Lịch Trình Thời Gian Chi Tiết',
  'presentation': 'Đặt Lịch Trình Bày & Vấn Đáp',
};

export default function HackathonFeaturePage({ feature }) {
  const { contestId } = useParams();
  const navigate = useNavigate();

  const [contests, setContests] = useState([]);
  const [selectedContestId, setSelectedContestId] = useState(contestId || '');
  const [contest, setContest] = useState(null);
  const [config, setConfig] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingContest, setLoadingContest] = useState(false);

  // Fetch all contests for selection
  useEffect(() => {
    const fetchContests = async () => {
      setLoadingList(true);
      try {
        const r = await fetch(`${API_URL}/api/contests`, { headers: hdrs() });
        const d = await r.json();
        if (d.success) {
          setContests(d.data || []);
        }
      } catch (e) {
        console.error('Error fetching contests:', e);
      } finally {
        setLoadingList(false);
      }
    };
    fetchContests();
  }, []);

  // Sync state if URL param changes
  useEffect(() => {
    if (contestId) {
      setSelectedContestId(contestId);
    }
  }, [contestId]);

  // Fetch specific contest and its configuration when selectedContestId changes
  useEffect(() => {
    if (!selectedContestId) {
      setContest(null);
      setConfig(null);
      return;
    }

    const fetchContestData = async () => {
      setLoadingContest(true);
      try {
        const r = await fetch(`${API_URL}/api/contests/${selectedContestId}`, { headers: hdrs() });
        const d = await r.json();
        if (d.success) {
          const contestData = d.data;
          setContest(contestData);

          // Get config from localStorage or fallback to standard setup
          const saved = localStorage.getItem(`hackathon_config_${selectedContestId}`);
          if (saved) {
            setConfig(JSON.parse(saved));
          } else {
            // Build default config logic (fallback)
            const openDateStr = contestData.created_at ? contestData.created_at.slice(0, 16) : '2026-06-01T08:00';
            const deadlineStr = contestData.registration_deadline ? contestData.registration_deadline.slice(0, 16) : '2026-06-10T18:00';
            const startDateStr = contestData.start_date ? contestData.start_date.slice(0, 16) : '2026-06-11T09:00';
            const endDateStr = contestData.end_date ? contestData.end_date.slice(0, 16) : '2026-06-13T18:00';
            const kickoffStr = new Date(new Date(deadlineStr).getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 16);

            const initialConfig = {
              season: 'Summer',
              year: 2026,
              rules: '1. Đăng ký nhóm từ 3-5 thành viên.\n2. Phát triển sản phẩm trong vòng 48h.\n3. Nộp mã nguồn và video demo sản phẩm trước thời hạn.',
              banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
              registration_open_date: openDateStr,
              registration_deadline: deadlineStr,
              start_date: startDateStr,
              end_date: endDateStr,
              kickoff_date: kickoffStr,
              mentors_assigned: false,
              tracks: [
                {
                  id: 'track-default',
                  name: 'Mặc định',
                  description: 'Bảng thi mặc định',
                  rounds: [
                    {
                      id: `round-${Date.now()}-1`,
                      name: 'Vòng sơ loại',
                      sequence_order: 1,
                      submission_deadline: new Date(new Date(startDateStr).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                      coding_duration_hours: 24,
                      top_n_advance: 10,
                      wildcard_enabled: true,
                      active: true,
                      criteria: []
                    }
                  ]
                }
              ]
            };
            setConfig(initialConfig);
            localStorage.setItem(`hackathon_config_${selectedContestId}`, JSON.stringify(initialConfig));
          }
        }
      } catch (e) {
        console.error('Error fetching contest detail:', e);
      } finally {
        setLoadingContest(false);
      }
    };

    fetchContestData();
  }, [selectedContestId]);

  const handleContestChange = (e) => {
    const newId = e.target.value;
    setSelectedContestId(newId);
    if (newId) {
      navigate(`/admin/${feature}/${newId}`);
    } else {
      navigate(`/admin/${feature}`);
    }
  };

  return (
    <div className="hfp-page">
      <div className="hfp-header">
        <div>
          <h1 className="hfp-title">{FEATURE_TITLES[feature] || 'Thao tác giải đấu'}</h1>
          <p className="hfp-subtitle">Lựa chọn giải đấu đang diễn ra để thực hiện điều chỉnh cấu hình và nghiệp vụ trực tiếp</p>
        </div>

        {/* Dropdown Selector */}
        <div className="hfp-selector-wrap">
          <label className="hfp-select-label">Chọn cuộc thi:</label>
          {loadingList ? (
            <div className="hfp-select-loader">Đang tải cuộc thi...</div>
          ) : (
            <select
              className="hfp-select"
              value={selectedContestId}
              onChange={handleContestChange}
            >
              <option value="">-- Vui lòng chọn cuộc thi --</option>
              {contests.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} {c.status === 'open' ? '🟢 (ONGOING)' : c.status === 'closed' ? '🔴 (Closed)' : '⚪ (Draft)'}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="hfp-content">
        {loadingContest ? (
          <div className="hfp-feature-loader">
            <div className="hfp-spinner"></div>
            <span>Đang tải thông tin cuộc thi...</span>
          </div>
        ) : !selectedContestId || !contest ? (
          <div className="hfp-empty-state">
            <div className="hfp-empty-icon">📂</div>
            <h3>Chưa chọn cuộc thi</h3>
            <p>Vui lòng lựa chọn một cuộc thi từ thanh Menu thả xuống ở góc trên bên phải để bắt đầu thao tác.</p>
          </div>
        ) : (
          <div className="hfp-feature-card">
            {/* Render Feature Specific UI */}
            {feature === 'submission-review' && (
              <SubmissionReviewTab config={config} contestId={selectedContestId} contest={contest} />
            )}

            {feature === 'scoring-lock' && (
              <ScoringLockTab config={config} contestId={selectedContestId} contest={contest} />
            )}

            {feature === 'elimination' && (
              <TeamEliminationTab config={config} contestId={selectedContestId} contest={contest} />
            )}

            {feature === 'presentation' && (
              <PresentationScheduleTab contestId={selectedContestId} contest={contest} />
            )}

            {feature === 'timeline' && config && (
              <div className="hd-section" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                <h2 className="hd-section-title" style={{ margin: '0 0 20px 0' }}>Lịch trình thời gian chi tiết</h2>
                <div className="hd-timeline">
                  {[
                    { label: 'Mở cổng đăng ký Hackathon', date: config.registration_open_date, color: 'var(--cyan)' },
                    { label: 'Hạn đóng đăng ký tham gia', date: config.registration_deadline, color: 'var(--orange)' },
                    { label: 'Khai mạc giải đấu (Kickoff)', date: config.kickoff_date, color: 'var(--purple)' },
                    { label: 'Thời gian thi đấu chính thức', date: config.start_date, color: 'var(--green)' },
                    { label: 'Kết thúc giải đấu', date: config.end_date, color: 'var(--red)' },
                    ...(config.tracks || []).flatMap(t => (t.rounds || []).map(r => ({
                      label: `Hạn nộp bài: ${r.name} (${t.name})`,
                      date: r.submission_deadline,
                      color: 'rgba(168, 85, 247, 0.6)'
                    })))
                  ]
                    .filter(e => e.date)
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map((ev, i) => (
                      <div key={i} className="hd-timeline-item">
                        <div className="hd-tl-dot" style={{ background: ev.color, boxShadow: `0 0 8px ${ev.color}` }} />
                        <div className="hd-tl-body">
                          <span className="hd-tl-label">{ev.label}</span>
                          <span className="hd-tl-date">{fmtDate(ev.date)}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
