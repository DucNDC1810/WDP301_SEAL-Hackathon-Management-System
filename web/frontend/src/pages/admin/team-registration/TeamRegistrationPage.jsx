import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeamDashboardPage from '../team/TeamDashboardPage';
import RefreshButton from '../../../components/RefreshButton';
import './TeamRegistrationPage.css';
import '../hackathons/HackathonFeaturePage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const USERS  = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'];
const TROPHY = ['M6 9H3.5a2.5 2.5 0 0 1 0-5H6','M18 9h2.5a2.5 2.5 0 0 0 0-5H18','M4 22h16','M18 2H6v7a6 6 0 0 0 12 0V2z'];
const CLOCK  = ['M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z','M12 6v6l4 2'];
const ARROW  = 'M5 12h14M12 5l7 7-7 7';
const SEARCH = ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z','M21 21l-4.35-4.35'];

const STATUS_MAP = {
  open:       { label: 'Registration Open', cls: 'str-badge--green'  },
  inprogress: { label: 'In Progress',       cls: 'str-badge--blue'   },
  judging:    { label: 'Judging',           cls: 'str-badge--purple' },
  closed:     { label: 'Closed',            cls: 'str-badge--gray'   },
};

function getStatus(c) {
  if (!c) return 'closed';
  const now = new Date();
  const reg   = c.registration_deadline ? new Date(c.registration_deadline) : null;
  const end   = c.end_date   ? new Date(c.end_date)   : null;
  const start = c.start_date ? new Date(c.start_date) : null;
  if (end && end < now) return 'closed';
  if (start && start < now && end && end > now) return 'inprogress';
  if (reg && reg < now) return 'closed';
  return 'open';
}

const getBannerUrl = (contestId) => {
  if (!contestId) return 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800';
  try {
    const savedConfig = localStorage.getItem(`hackathon_config_${contestId}`);
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      if (parsed && parsed.banner) return parsed.banner;
    }
  } catch (e) {
    console.error(e);
  }
  return 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800';
};

export default function TeamRegistrationPage() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [pendingContestIds, setPendingContestIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPendingData = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    fetch(`${API_URL}/api/teams/all-pending`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(dPending => {
        if (dPending.success && Array.isArray(dPending.data)) {
          const pendingIds = new Set(
            dPending.data
              .map(t => t.contest_id)
              .filter(Boolean)
          );
          setPendingContestIds(pendingIds);
        }
      })
      .catch((err) => console.error("Error loading pending teams:", err));
  };

  const fetchInitialData = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }

    setLoading(true);
    try {
      const [dContests, dPending] = await Promise.all([
        fetch(`${API_URL}/api/contests`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_URL}/api/teams/all-pending`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      ]);
      if (dContests.success) setContests(dContests.data || []);
      if (dPending.success && Array.isArray(dPending.data)) {
        const pendingIds = new Set(
          dPending.data
            .map(t => t.contest_id)
            .filter(Boolean)
        );
        setPendingContestIds(pendingIds);
      }
    } catch (err) {
      console.error("Error loading team registration dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const currentContest = contests.find(c => c._id === contestId);

  const filtered = contests.filter(c =>
    getStatus(c) !== 'closed' &&
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="hfp-page">
      {/* Header */}
      {!contestId && (
        <div className="hfp-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="hfp-title">Duyệt Đội Thi & Bảng Đấu</h1>
            <p className="hfp-subtitle">
              Lựa chọn giải đấu đang diễn ra để thực hiện duyệt đội thi và quản lý chia bảng đấu
            </p>
          </div>
          <RefreshButton onRefresh={fetchInitialData} />
        </div>
      )}

      {/* Content */}
      <div className="hfp-content">
        {contestId ? (
          <div className="str-detail-wrapper">
            {/* Contest Banner Hero */}
            <div className="str-hero-banner">
              <img
                src={getBannerUrl(contestId)}
                alt={currentContest?.title || 'Contest Banner'}
                className="str-hero-banner__img"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800'; }}
              />
              <div className="str-hero-banner__overlay" />
              <div className="str-hero-banner__content">
                <div className="str-hero-banner__top">
                  <button className="str-back-btn" onClick={() => navigate('/admin/team')}>
                    ← Tất cả cuộc thi
                  </button>
                  <div className="str-hero-badges">
                    {pendingContestIds.has(contestId) && (
                      <span className="str-hero-badge str-hero-badge--pending">
                        <span className="str-pulse-dot" /> Có đội chờ duyệt
                      </span>
                    )}
                    <span className={`str-hero-badge ${STATUS_MAP[getStatus(currentContest)]?.cls}`}>
                      {STATUS_MAP[getStatus(currentContest)]?.label}
                    </span>
                  </div>
                </div>

                <div className="str-hero-main-info">
                  <h2 className="str-hero-title">{currentContest?.title || 'Đang tải thông tin cuộc thi...'}</h2>
                  {currentContest?.description && (
                    <p className="str-hero-desc">{currentContest.description}</p>
                  )}
                </div>

                <div className="str-hero-stats">
                  <div className="str-hero-stat-pill">
                    <span className="str-hero-stat-label">Hạn đăng ký</span>
                    <span className="str-hero-stat-val">
                      {currentContest?.registration_deadline
                        ? new Date(currentContest.registration_deadline).toLocaleDateString('vi-VN')
                        : '—'}
                    </span>
                  </div>
                  <div className="str-hero-stat-pill">
                    <span className="str-hero-stat-label">Quy mô bảng đấu</span>
                    <span className="str-hero-stat-val">
                      {currentContest?.max_teams_per_pool ? `${currentContest.max_teams_per_pool} đội/bảng` : 'Không giới hạn'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hfp-feature-card" style={{ padding: '24px 32px' }}>
              <TeamDashboardPage isEmbedded={true} onTeamsUpdated={fetchPendingData} />
            </div>
          </div>
        ) : (
          <div className="str-page" style={{ padding: 0 }}>
            {/* Search Bar for card view */}
            <div className="flex justify-end" style={{ marginBottom: '20px' }}>
              <div className="str-search-wrap" style={{ width: '100%', maxWidth: '380px' }}>
                <Ico d={SEARCH} size={15} sw={2} />
                <input
                  className="str-search"
                  placeholder="Tìm kiếm cuộc thi..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="str-loading">
                <div className="str-spinner" />
                <span>Đang tải danh sách cuộc thi...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="str-empty">
                <Ico d={TROPHY} size={40} sw={1.2} />
                <p>{search ? 'Không tìm thấy cuộc thi nào.' : 'Chưa có cuộc thi nào đang diễn ra.'}</p>
              </div>
            ) : (
              <div className="str-grid">
                {filtered.map(c => {
                  const status = getStatus(c);
                  const st = STATUS_MAP[status] || STATUS_MAP.open;
                  const deadline = c.registration_deadline
                    ? new Date(c.registration_deadline).toLocaleDateString('vi-VN')
                    : '—';
                  const banner = getBannerUrl(c._id);

                  return (
                    <div className="str-card" key={c._id}>
                      {/* Banner image on top of card */}
                      <div className="str-card-banner-wrap">
                        <img
                          src={banner}
                          alt={c.title}
                          className="str-card-banner-img"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800'; }}
                        />
                        <div className="str-card-banner-overlay" />
                        <div className="str-card-badges-overlay">
                          {pendingContestIds.has(c._id) && (
                            <span className="str-badge str-badge--pending">
                              <span className="str-pulse-dot" /> Chờ duyệt
                            </span>
                          )}
                          <span className={`str-badge ${st.cls}`}>{st.label}</span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="str-card-body">
                        <h3 className="str-card__name">{c.title}</h3>
                        <p className="str-card__desc">
                          {c.description ? (c.description.length > 85 ? c.description.slice(0, 85) + '…' : c.description) : 'Không có mô tả cho cuộc thi này.'}
                        </p>

                        <div className="str-card__meta">
                          <div className="str-meta-item">
                            <Ico d={USERS} size={13} sw={2} />
                            <span>{c.max_teams_per_pool ? `${c.max_teams_per_pool} đội/bảng` : 'Không giới hạn'}</span>
                          </div>
                          <div className="str-meta-item">
                            <Ico d={CLOCK} size={13} sw={2} />
                            <span>Hạn: {deadline}</span>
                          </div>
                        </div>

                        <button
                          className="str-card__btn"
                          onClick={() => navigate(`/admin/team/${c._id}`)}
                        >
                          <span>Quản lý đội thi</span>
                          <Ico d={ARROW} size={14} sw={2} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
