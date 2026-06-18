import { useState, useEffect, Fragment } from 'react';
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

  // ─── Reject Team ───────────────────────────────────────────────────────────
  const handleReject = async (teamId, teamName) => {
    const reason = window.prompt(
      `Nhập lý do từ chối đội thi "${teamName}" (bắt buộc):`,
      ''
    );
    if (reason === null) return; // Người dùng bấm Cancel
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do từ chối.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/reject`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccess(`Đã từ chối đội thi "${teamName}". Thông báo đã được gửi đến đội.`);
      fetchTeams(false);
    } catch (err) {
      setError(err.message || 'Lỗi khi từ chối duyệt đội thi.');
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
  const [isCreatingEmpty, setIsCreatingEmpty] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // ─── Create Empty Pools ───────────────────────────────────────────────────
  const handleCreateEmptyPools = async (e) => {
    e.preventDefault();
    setError('');
    setWarning('');
    setSuccess('');
    setIsCreatingEmpty(true);

    try {
      const res = await fetch(`${API_URL}/api/pools/contests/${contestId}/create-empty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_count: poolCount,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setPools(data.data || []);
      setSuccess('Đã tạo các bảng đấu trống thành công!');
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo bảng đấu trống.');
    } finally {
      setIsCreatingEmpty(false);
    }
  };

  // ─── Assign Teams to Pools ────────────────────────────────────────────────
  const handleAssignTeams = async () => {
    setError('');
    setWarning('');
    setSuccess('');
    setIsAssigning(true);

    try {
      const res = await fetch(`${API_URL}/api/pools/contests/${contestId}/assign-teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assign_topics: assignTopics,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setPools(data.data || []);
      if (data.warning) {
        setWarning(data.warning);
      } else {
        setSuccess('Đã thực hiện xếp các đội vào các bảng đấu thành công!');
      }
      fetchTeams(false);
    } catch (err) {
      setError(err.message || 'Lỗi khi xếp đội thi vào bảng đấu.');
    } finally {
      setIsAssigning(false);
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
  const confirmedTeams = teams.filter((t) => t.status === 'CONFIRMED').length;
  const pendingTeams = teams.filter((t) => t.status === 'WAITING_APPROVAL').length;
  const hasConfirmedTeam = teams.some((t) => t.status === 'CONFIRMED');

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
            <h1 className="team-title">Dashboard <span>Cuộc Thi</span></h1>
            <p className="team-subtitle">Quản lý trạng thái đội thi, xác thực thành viên và chia bảng đấu tự động</p>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="team-stats-grid">
          <div className="team-stat-card">
            <div className="team-stat-card__icon">👥</div>
            <div>
              <div className="team-stat-card__val">{totalTeams}</div>
              <div className="team-stat-card__lbl">TỔNG ĐỘI ĐĂNG KÝ</div>
            </div>
          </div>
          <div className="team-stat-card team-stat-card--green">
            <div className="team-stat-card__icon">✓</div>
            <div>
              <div className="team-stat-card__val">{confirmedTeams}</div>
              <div className="team-stat-card__lbl">ĐỘI ĐÃ XÁC NHẬN (CONFIRMED)</div>
            </div>
          </div>
          <div className="team-stat-card team-stat-card--orange">
            <div className="team-stat-card__icon">⏳</div>
            <div>
              <div className="team-stat-card__val">{pendingTeams}</div>
              <div className="team-stat-card__lbl">ĐỘI ĐANG CHỜ DUYỆT (PENDING)</div>
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
                      const verifiedCount = team.members.filter((m) => m.user_id && m.user_id.profile_verify_status === 'approved').length;
                      const totalMembers = team.members.length;
                      const isExpanded = expandedTeamId === team._id;

                      return (
                        <Fragment key={team._id}>
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
                            <td>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {team.status === 'WAITING_APPROVAL' && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn--sm btn--outline-green"
                                      onClick={() => handleApprove(team._id, team.team_name)}
                                    >
                                      ✓ Duyệt
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn--sm btn--outline-red"
                                      onClick={() => handleReject(team._id, team.team_name)}
                                    >
                                      ✗ Từ chối
                                    </button>
                                  </>
                                )}
                                {!['DISQUALIFIED', 'ELIMINATED', 'REJECTED'].includes(team.status) && (
                                  <button
                                    type="button"
                                    className="btn btn--sm btn--outline-red"
                                    onClick={() => handleDisqualify(team._id, team.team_name)}
                                  >
                                    Loại bỏ
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Members Details */}
                          {isExpanded && (
                            <tr className="team-row-detail">
                              <td colSpan="7">
                                <div className="members-detail-box">
                                  <h4 className="detail-box-title">Thành viên chi tiết</h4>
                                  <div className="members-grid">
                                    {team.members.map((member, mIdx) => {
                                      const memberName = member.user_id?.full_name || member.full_name || 'Chưa tham gia';
                                      const isVerified = member.user_id && member.user_id.profile_verify_status === 'approved';
                                      return (
                                        <div className="member-detail-card" key={mIdx}>
                                          <div className="member-detail-card__top">
                                            <span className="member-name">{memberName}</span>
                                            <span className={`member-verify-indicator ${isVerified ? 'member-verify-indicator--verified' : ''}`}>
                                              {isVerified ? '✓ Đã xác thực' : '⏳ Chờ xác thực'}
                                            </span>
                                          </div>
                                          <div className="member-email">{member.email}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid rgba(0, 240, 255, 0.05)' }}>
                  Không còn dữ liệu khác để hiển thị
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: POOLS DIVISION ─────────────────────────────────────────── */}
        {activeTab === 'pools' && (
          <div className="team-tab-content">
            
            {/* Case A: Pools exist -> Show pools */}
            {pools.length > 0 ? (
              <div className="pools-result-container">
                <div className="pools-result-header">
                  <div>
                    <h3 className="pools-result-title">
                      {pools.some(p => p.teams && p.teams.length > 0) ? 'Kết Quả Chia Bảng Đấu' : 'Các Bảng Đấu Trống Đã Tạo'}
                    </h3>
                    <p className="pools-result-subtitle">
                      {pools.some(p => p.teams && p.teams.length > 0)
                        ? 'Các đội đã được xếp đều ngẫu nhiên vào các bảng đấu tương ứng'
                        : 'Bảng đấu đã được chuẩn bị sẵn. Hãy xếp đội đấu đăng ký vào các bảng.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--outline-red"
                    onClick={handleResetPools}
                  >
                    Xóa các bảng đấu hiện tại
                  </button>
                </div>

                {/* If empty pools, show assignment panel */}
                {!pools.some(p => p.teams && p.teams.length > 0) && (
                  <div className="pools-config-box" style={{ margin: '0 0 40px 0', maxWidth: '100%' }}>
                    <h4 className="pools-config-title">Xếp các đội thi đã CONFIRMED vào các bảng đấu này</h4>
                    <p className="pools-config-desc">
                      Hiện tại có <strong>{confirmedTeams}</strong> đội thi đã CONFIRMED. 
                      Hệ thống sẽ trộn ngẫu nhiên tất cả các đội thi này và chia đều vào <strong>{pools.length}</strong> bảng đấu trống ở dưới.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                          type="button"
                          className={`btn btn--primary btn--lg ${isAssigning ? 'btn--loading' : ''}`}
                          onClick={handleAssignTeams}
                          disabled={isAssigning || confirmedTeams < pools.length}
                        >
                          {isAssigning ? (
                            <>
                              <span className="btn-spinner" />
                              <span>Đang xếp các đội ngẫu nhiên...</span>
                            </>
                          ) : (
                            'Bắt đầu xếp đội ngẫu nhiên'
                          )}
                        </button>
                        {confirmedTeams < pools.length && (
                          <p className="pools-btn-disabled-warning">
                            ⚠ Cần có ít nhất {pools.length} đội đấu ở trạng thái "CONFIRMED" để chia vào các bảng. Hiện có {confirmedTeams} đội.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pools-grid">
                  {pools.map((pool) => (
                    <div className="pool-card" key={pool._id}>
                      <div className="pool-card__header">
                        <h4 className="pool-card__title">{pool.pool_name}</h4>
                        <span className="pool-card__count">{(pool.teams || []).length} đội</span>
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
                        {pool.teams && pool.teams.length > 0 ? (
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
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                            Chưa xếp đội thi
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              
              /* Case B: No pools created yet -> Show parameters configurations form to create empty pools */
              <div className="pools-config-box">
                <h3 className="pools-config-title">Chuẩn Bị Tạo Bảng Đấu</h3>
                <p className="pools-config-desc">
                  Bước này sẽ khởi tạo sẵn các bảng đấu trống (Ví dụ: Bảng A, Bảng B, Bảng C...). Sau khi tạo xong bảng đấu, bạn sẽ thực hiện xếp các đội thi vào các bảng đấu này.
                </p>

                <form onSubmit={handleCreateEmptyPools} className="pools-config-form">
                  <div className="contest-field">
                    <label className="contest-label">Số lượng bảng đấu cần tạo sẵn *</label>
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

                  <div className="pools-action-section">
                    <button
                      type="submit"
                      className={`btn btn--primary btn--lg ${isCreatingEmpty ? 'btn--loading' : ''}`}
                      disabled={isCreatingEmpty}
                    >
                      {isCreatingEmpty ? (
                        <>
                          <span className="btn-spinner" />
                          <span>Đang tạo các bảng đấu trống...</span>
                        </>
                      ) : (
                        'Tạo các bảng đấu trống'
                      )}
                    </button>
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
