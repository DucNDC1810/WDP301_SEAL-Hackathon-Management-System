import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './TeamDashboardPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function TeamDashboardPage() {
  const { contestId } = useParams();

  // ─── States ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'pools'
  const [teams, setTeams] = useState([]);
  const [pools, setPools] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPools, setLoadingPools] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');

  // Tab 1: Expand row states
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  // Tab 2: Pool Config States
  const [poolCount, setPoolCount] = useState(3);
  const [assignTopics, setAssignTopics] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const token = localStorage.getItem('accessToken');

  // ─── Fetch Teams Function ──────────────────────────────────────────────────
  const fetchTeams = async (showLoading = false) => {
    try {
      if (showLoading) setLoadingTeams(true);
      const res = await fetch(`${API_URL}/api/teams/contests/${contestId}/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setTeams(data.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tải danh sách đội thi.');
    } finally {
      if (showLoading) setLoadingTeams(false);
    }
  };

  // ─── Fetch Pools Function ──────────────────────────────────────────────────
  const fetchPools = async (showLoading = false) => {
    try {
      if (showLoading) setLoadingPools(true);
      const res = await fetch(`${API_URL}/api/pools/contests/${contestId}/pools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPools(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoadingPools(false);
    }
  };

  // ─── Auto-Refresh & Init ───────────────────────────────────────────────────
  useEffect(() => {
    if (contestId) {
      fetchTeams(true);
      fetchPools(true);

      const interval = setInterval(() => {
        fetchTeams(false);
      }, 30000); // refresh teams list every 30s

      return () => clearInterval(interval);
    }
  }, [contestId]);

  // ─── Approve Team ──────────────────────────────────────────────────────────
  const handleApprove = async (teamId, teamName) => {
    const confirm = window.confirm(`Duyệt đội thi "${teamName}"?`);
    if (!confirm) return;

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccess(`Đã duyệt đội thi "${teamName}" thành công.`);
      fetchTeams(false);
    } catch (err) {
      setError(err.message || 'Lỗi khi duyệt đội thi.');
    }
  };

  // ─── Disqualify Team ───────────────────────────────────────────────────────
  const handleDisqualify = async (teamId, teamName) => {
    const confirm = window.confirm(`Bạn có chắc chắn muốn loại đội thi "${teamName}" khỏi cuộc thi này?`);
    if (!confirm) return;

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/disqualify`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccess(`Đã loại đội thi "${teamName}" thành công.`);
      fetchTeams(false);
    } catch (err) {
      setError(err.message || 'Lỗi khi loại đội thi.');
    }
  };

  // ─── Draw Pools ────────────────────────────────────────────────────────────
  const handleDrawPools = async (e) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setSuccess('');
    setIsDrawing(true);

    try {
      const res = await fetch(`${API_URL}/api/pools/contests/${contestId}/draw-pools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_count: poolCount,
          assign_topics: assignTopics,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setPools(data.data || []);
      if (data.warning) {
        setWarning(data.warning);
      } else {
        setSuccess('Đã thực hiện chia bảng đấu thành công!');
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi chia bảng đấu.');
    } finally {
      setIsDrawing(false);
    }
  };

  // ─── Reset Pools ───────────────────────────────────────────────────────────
  const handleResetPools = async () => {
    const confirm = window.confirm('Bạn có chắc chắn muốn xóa tất cả bảng đấu hiện tại và đặt lại các cấu hình đội thi/đề tài?');
    if (!confirm) return;

    setError('');
    setWarning('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/api/pools/contests/${contestId}/pools`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setPools([]);
      setSuccess('Đã reset bảng đấu và cấu hình đội thi về ban đầu.');
      fetchTeams(false);
    } catch (err) {
      setError(err.message || 'Lỗi khi đặt lại bảng đấu.');
    }
  };

  // ─── Statistics calculations ───────────────────────────────────────────────
  const totalTeams = teams.length;
  const confirmedTeams = teams.filter((t) => t.status === 'confirmed').length;
  const pendingTeams = teams.filter((t) => t.status === 'pending').length;
  const hasConfirmedTeam = teams.some((t) => t.status === 'confirmed');

  return (
    <div className="team-dashboard-page" id="team-dashboard-page">
      <div className="team-dashboard-page__glow" />

      <div className="team-dashboard-container container">
        
        {/* Navigation Breadcrumbs */}
        <div className="team-breadcrumbs">
          <Link to="/" className="breadcrumb-link">Trang chủ</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Dashboard Đội thi & Bảng đấu</span>
        </div>

        {/* Page Header */}
        <div className="team-header">
          <div>
            <h1 className="team-title">Dashboard Cuộc Thi</h1>
            <p className="team-subtitle">Quản lý trạng thái đội thi, xác thực thành viên và chia bảng đấu tự động</p>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="team-stats-grid">
          <div className="team-stat-card">
            <div className="team-stat-card__icon">👥</div>
            <div>
              <div className="team-stat-card__val">{totalTeams}</div>
              <div className="team-stat-card__lbl">Tổng đội đăng ký</div>
            </div>
          </div>
          <div className="team-stat-card team-stat-card--green">
            <div className="team-stat-card__icon">✓</div>
            <div>
              <div className="team-stat-card__val">{confirmedTeams}</div>
              <div className="team-stat-card__lbl">Đội đã xác nhận (Confirmed)</div>
            </div>
          </div>
          <div className="team-stat-card team-stat-card--orange">
            <div className="team-stat-card__icon">⏳</div>
            <div>
              <div className="team-stat-card__val">{pendingTeams}</div>
              <div className="team-stat-card__lbl">Đội đang chờ duyệt (Pending)</div>
            </div>
          </div>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="team-alert team-alert--error" id="team-error">
            <span className="team-alert__icon">⚠</span>
            <div className="team-alert__msg">{error}</div>
          </div>
        )}

        {warning && (
          <div className="team-alert team-alert--warning" id="team-warning">
            <span className="team-alert__icon">⚠</span>
            <div className="team-alert__msg">{warning}</div>
          </div>
        )}

        {success && (
          <div className="team-alert team-alert--success" id="team-success">
            <span className="team-alert__icon">✓</span>
            <div className="team-alert__msg">{success}</div>
          </div>
        )}

        {/* Tabs Control */}
        <div className="team-tabs">
          <button
            type="button"
            className={`team-tab-btn ${activeTab === 'teams' ? 'team-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('teams')}
            id="tab-btn-teams"
          >
            Danh sách đội đăng ký
          </button>
          <button
            type="button"
            className={`team-tab-btn ${activeTab === 'pools' ? 'team-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('pools')}
            id="tab-btn-pools"
          >
            Chia bảng đấu
          </button>
        </div>

        {/* ─── TAB 1: TEAMS LIST ─────────────────────────────────────────────── */}
        {activeTab === 'teams' && (
          <div className="team-tab-content">
            {loadingTeams ? (
              <div className="team-loading">
                <div className="team-spinner" />
                <p>Đang tải danh sách đội thi...</p>
              </div>
            ) : teams.length === 0 ? (
              <div className="team-empty-state">
                <div className="team-empty-icon">👥</div>
                <h3>Chưa có đội thi đăng ký</h3>
                <p>Thông tin các đội đăng ký sẽ tự động hiển thị và cập nhật liên tục tại đây.</p>
              </div>
            ) : (
              <div className="team-table-wrapper">
                <table className="team-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }} />
                      <th>Tên đội thi</th>
                      <th>Trưởng nhóm (Leader)</th>
                      <th>Thành viên</th>
                      <th>Xác thực (Verify)</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => {
                      const verifiedCount = team.members.filter((m) => m.email_verified).length;
                      const totalMembers = team.members.length;
                      const isExpanded = expandedTeamId === team._id;

                      return (
                        <optgroup key={team._id} style={{ border: 'none' }}>
                          <tr className={`team-row-main ${isExpanded ? 'team-row-main--expanded' : ''}`}>
                            <td className="cell-expand">
                              <button
                                type="button"
                                className="btn-expand-row"
                                onClick={() => setExpandedTeamId(isExpanded ? null : team._id)}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            </td>
                            <td className="cell-name">{team.team_name}</td>
                            <td>
                              <div className="cell-leader">
                                <span className="leader-name">
                                  {team.leader_id ? team.leader_id.full_name : 'N/A'}
                                </span>
                                <span className="leader-email">
                                  {team.leader_id ? team.leader_id.email : ''}
                                </span>
                              </div>
                            </td>
                            <td>{totalMembers}</td>
                            <td>
                              <span className="verify-progress">
                                {verifiedCount}/{totalMembers}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge status-badge--${team.status}`}>
                                {team.status}
                              </span>
                            </td>
                            <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {team.status === 'pending' && (
                                <button
                                  type="button"
                                  className="btn btn--sm btn--outline-green"
                                  onClick={() => handleApprove(team._id, team.team_name)}
                                >
                                  ✓ Duyệt
                                </button>
                              )}
                              {team.status !== 'disqualified' && (
                                <button
                                  type="button"
                                  className="btn btn--sm btn--outline-red"
                                  onClick={() => handleDisqualify(team._id, team.team_name)}
                                >
                                  Loại bỏ
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Members Details */}
                          {isExpanded && (
                            <tr className="team-row-detail">
                              <td colSpan="7">
                                <div className="members-detail-box">
                                  <h4 className="detail-box-title">Thành viên chi tiết</h4>
                                  <div className="members-grid">
                                    {team.members.map((member, mIdx) => (
                                      <div className="member-detail-card" key={mIdx}>
                                        <div className="member-detail-card__top">
                                          <span className="member-name">{member.full_name || 'Chưa cập nhật'}</span>
                                          <span className={`member-verify-indicator ${member.email_verified ? 'member-verify-indicator--verified' : ''}`}>
                                            {member.email_verified ? '✓ Đã xác thực' : '⏳ Chờ xác thực'}
                                          </span>
                                        </div>
                                        <div className="member-email">{member.email}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </optgroup>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: POOLS DIVISION ─────────────────────────────────────────── */}
        {activeTab === 'pools' && (
          <div className="team-tab-content">
            
            {/* Case A: Pools already drawn -> Show result */}
            {pools.length > 0 ? (
              <div className="pools-result-container">
                <div className="pools-result-header">
                  <div>
                    <h3 className="pools-result-title">Kết Quả Chia Bảng Đấu</h3>
                    <p className="pools-result-subtitle">Các đội đã được xếp đều ngẫu nhiên vào các bảng đấu tương ứng</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--outline-red"
                    onClick={handleResetPools}
                  >
                    Xóa Kết Quả & Chia Lại
                  </button>
                </div>

                <div className="pools-grid">
                  {pools.map((pool) => (
                    <div className="pool-card" key={pool._id}>
                      <div className="pool-card__header">
                        <h4 className="pool-card__title">{pool.pool_name}</h4>
                        <span className="pool-card__count">{pool.teams.length} đội</span>
                      </div>
                      
                      {pool.topic_id ? (
                        <div className="pool-card__topic">
                          <span className="pool-card__topic-label">Đề tài gán:</span>
                          <span className="pool-card__topic-name">{pool.topic_id.title}</span>
                        </div>
                      ) : (
                        <div className="pool-card__topic pool-card__topic--none">
                          Không gán đề tài đấu
                        </div>
                      )}

                      <div className="pool-card__body">
                        <ul className="pool-teams-list">
                          {pool.teams.map((team, tIdx) => (
                            <li className="pool-team-item" key={team._id}>
                              <span className="pool-team-number">{tIdx + 1}</span>
                              <div className="pool-team-info">
                                <span className="pool-team-name">{team.team_name}</span>
                                <span className="pool-team-status">{team.status}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              
              /* Case B: No pools drawn yet -> Show parameters configurations form */
              <div className="pools-config-box">
                <h3 className="pools-config-title">Cấu Hình Chia Bảng Tự Động</h3>
                <p className="pools-config-desc">
                  Hệ thống sẽ thực hiện trộn ngẫu nhiên tất cả các đội đấu đã được xác nhận (Confirmed) và phân bổ đều vào các bảng đấu tương ứng.
                </p>

                <form onSubmit={handleDrawPools} className="pools-config-form">
                  <div className="contest-field">
                    <label className="contest-label">Số lượng bảng đấu cần chia *</label>
                    <input
                      type="number"
                      className="contest-input"
                      min="2"
                      max="20"
                      value={poolCount}
                      onChange={(e) => setPoolCount(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="contest-field contest-field--row">
                    <div className="contest-toggle-info">
                      <label className="contest-label">Tự động gán đề tài đấu</label>
                      <span className="contest-label-sub">Lựa chọn ngẫu nhiên các đề tài trống chưa được giao để gán cho từng bảng đấu</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={assignTopics}
                        onChange={(e) => setAssignTopics(e.target.checked)}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="pools-action-section">
                    <button
                      type="submit"
                      className={`btn btn--primary btn--lg ${isDrawing ? 'btn--loading' : ''}`}
                      disabled={isDrawing || !hasConfirmedTeam}
                    >
                      {isDrawing ? (
                        <>
                          <span className="btn-spinner" />
                          <span>Đang thực hiện phân bảng ngẫu nhiên...</span>
                        </>
                      ) : (
                        'Bắt Đầu Tự Động Chia Bảng'
                      )}
                    </button>
                    {!hasConfirmedTeam && (
                      <p className="pools-btn-disabled-warning">
                        ⚠ Cần có ít nhất 1 đội đấu ở trạng thái "confirmed" để bắt đầu thực hiện chia bảng.
                      </p>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamDashboardPage;
