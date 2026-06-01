import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ThreeJSBackground from './ThreeJSBackground';
import './ContestantDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function ContestantDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Verification states
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Team states
  const [competitions, setCompetitions] = useState([]);
  const [selectedComp, setSelectedComp] = useState('');
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMaxMembers, setTeamMaxMembers] = useState(5);
  const [teamAction, setTeamAction] = useState('join'); // 'join' | 'create'
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamMsg, setTeamMsg] = useState('');

  // Submission states
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    project_name: '',
    description: '',
    repo_url: '',
    demo_url: '',
    pitch_deck_url: '',
  });

  const token = localStorage.getItem('accessToken');

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  // ── Fetch onboarding status ───────────────────────────────────────────────

  const fetchOnboarding = useCallback(async (isInitial = false) => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/contestants/onboarding`, {
        headers: authHeaders(),
        credentials: 'include',
      });

      if (res.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }

      const data = await res.json();
      if (data.success) {
        // Auto-redirect if they are already fully onboarded on initial load,
        // EXCEPT if they explicitly requested to join a new competition
        const searchParams = new URLSearchParams(window.location.search);
        const isJoinNew = searchParams.get('action') === 'join_new';

        if (isInitial === true && data.data.is_verified && data.data.has_team && data.data.user.github_username && !isJoinNew) {
          window.location.href = '/contestant-home';
          return;
        }

        setOnboarding(data.data);
        setUser(data.data.user);
        setSubmitForm({
          project_name: data.data.user.github_username || '',
          repo_url: data.data.user.github_link || '',
        });
        if (data.data.submission) {
          setSubmission(data.data.submission);
        }
      } else {
        setError(data.message);
      }
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  }, [token, navigate, authHeaders]);

  useEffect(() => {
    fetchOnboarding(true);
  }, [fetchOnboarding]);

  // ── Send verification email ───────────────────────────────────────────────

  const handleSendVerification = async () => {
    setVerifyLoading(true);
    setVerifyMsg('');
    try {
      const res = await fetch(`${API_URL}/api/contestants/send-verification`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setVerifyMsg(data.message);
        setShowOtpInput(true);
      } else {
        setVerifyMsg(data.message || 'Lỗi gửi email');
      }
    } catch {
      setVerifyMsg('Không thể kết nối đến server');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setVerifyMsg('Vui lòng nhập mã xác thực 6 chữ số');
      return;
    }

    setVerifyLoading(true);
    setVerifyMsg('');
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?._id, verification_code: verificationCode }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyMsg('Xác thực email thành công!');
        fetchOnboarding();
      } else {
        setVerifyMsg(data.message || 'Mã xác thực không hợp lệ');
      }
    } catch {
      setVerifyMsg('Không thể kết nối đến server');
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Fetch competitions ────────────────────────────────────────────────────

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isJoinNew = searchParams.get('action') === 'join_new';

    if (!onboarding || !onboarding.is_verified || (onboarding.has_team && !isJoinNew)) return;

    const fetchCompetitions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teams/competitions`, {
          headers: authHeaders(),
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          const joinedTeams = onboarding.teams || (onboarding.team ? [onboarding.team] : []);
          const joinedCompIds = joinedTeams.map(t => typeof t.competition === 'object' ? t.competition._id : t.competition);
          const availableComps = data.data.filter(c => !joinedCompIds.includes(c._id));

          setCompetitions(availableComps);
          const searchParams = new URLSearchParams(window.location.search);
          const compFromUrl = searchParams.get('comp');
          if (compFromUrl && availableComps.find(c => c._id === compFromUrl)) {
            setSelectedComp(compFromUrl);
          } else if (availableComps.length > 0) {
            setSelectedComp(availableComps[0]._id);
          }
        }
      } catch {
        // silent
      }
    };
    fetchCompetitions();
  }, [onboarding, authHeaders]);

  // ── Fetch teams when competition changes ──────────────────────────────────

  useEffect(() => {
    if (!selectedComp) return;

    const fetchTeams = async () => {
      setTeamsLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/teams?competition_id=${selectedComp}`,
          {
            headers: authHeaders(),
            credentials: 'include',
          }
        );
        const data = await res.json();
        if (data.success) {
          setTeams(data.data);
        }
      } catch {
        // silent
      } finally {
        setTeamsLoading(false);
      }
    };
    fetchTeams();
  }, [selectedComp, authHeaders]);

  // ── Create team ───────────────────────────────────────────────────────────

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim() || !selectedComp) return;

    setTeamLoading(true);
    setTeamMsg('');
    try {
      const res = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          team_name: teamName.trim(),
          competition_id: selectedComp,
          max_members: Number(teamMaxMembers),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTeamMsg('Tạo đội thành công! Chuyển sang bước tiếp theo...');
        setTimeout(() => {
          fetchOnboarding(true);
        }, 1000);
      } else {
        setTeamMsg(data.message || 'Lỗi tạo đội');
      }
    } catch {
      setTeamMsg('Không thể kết nối đến server');
    } finally {
      setTeamLoading(false);
    }
  };

  // ── Join team ─────────────────────────────────────────────────────────────

  const handleJoinTeam = async (teamId) => {
    setTeamLoading(true);
    setTeamMsg('');
    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/join`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setTeamMsg('Tham gia đội thành công! Chuyển sang bước tiếp theo...');
        setTimeout(() => {
          fetchOnboarding(true);
        }, 1000);
      } else {
        setTeamMsg(data.message || 'Lỗi tham gia đội');
      }
    } catch {
      setTeamMsg('Không thể kết nối đến server');
    } finally {
      setTeamLoading(false);
    }
  };

  // ── Submit Project ──────────────────────────────────────────────────────────

  const handleSubmitProject = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    setSubmitMsg('');
    try {
      const res = await fetch(`${API_URL}/api/users/me/github`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          github_username: submitForm.project_name,
          github_link: submitForm.repo_url,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitMsg('Cập nhật GitHub thành công! Đang vào trang chính...');
        setIsEditing(false); // Switch to readonly view
        setTimeout(() => fetchOnboarding(true), 1500);
      } else {
        setSubmitMsg(data.message || 'Lỗi cập nhật');
      }
    } catch {
      setSubmitMsg('Không thể kết nối đến server');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/signout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // continue logout anyway
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="cd-page">
        <div className="cd-page__loader">
          <div className="cd-page__spinner" />
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cd-page">
        <div className="cd-page__error">
          <span>⚠</span> {error}
          <button onClick={() => navigate('/login')}>Quay lại đăng nhập</button>
        </div>
      </div>
    );
  }

  // ── Determine onboarding step ─────────────────────────────────────────────

  const searchParams = new URLSearchParams(window.location.search);
  const isJoinNew = searchParams.get('action') === 'join_new';

  const needsVerification = onboarding && !onboarding.is_verified;
  // If isJoinNew is true, we force needsTeam to be true so the join form is rendered
  const needsTeam = onboarding && onboarding.is_verified && (!onboarding.has_team || isJoinNew);
  const needsGithub = onboarding && onboarding.is_verified && onboarding.has_team && !isJoinNew && !user?.github_username;
  const isComplete = onboarding && onboarding.is_verified && onboarding.has_team && !isJoinNew && user?.github_username;

  const currentStep = needsVerification ? 1 : needsTeam ? 2 : needsGithub ? 3 : 3;

  return (
    <div className="cd-page" id="contestant-dashboard">
      {/* Background */}
      <div className="cd-page__bg">
        <ThreeJSBackground />
        <div className="cd-page__grid-lines" />
        <div className="cd-page__glow cd-page__glow--1" />
        <div className="cd-page__glow cd-page__glow--2" />
      </div>

      {/* Header */}
      <header className="cd-header">
        <Link to="/" className="cd-header__logo">
          <span className="cd-header__logo-icon">⬡</span>
          <span className="cd-header__logo-text">SEAL</span>
        </Link>
        <div className="cd-header__user">
          {user?.avatar_url && (
            <img
              src={user.avatar_url}
              alt="avatar"
              className="cd-header__avatar"
            />
          )}
          <span className="cd-header__name">{user?.full_name}</span>
          <button onClick={handleLogout} className="cd-header__logout" id="btn-logout">
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="cd-main">
        {/* Stepper */}
        <div className="cd-stepper">
          <div className={`cd-stepper__step ${currentStep >= 1 ? 'cd-stepper__step--active' : ''} ${currentStep > 1 ? 'cd-stepper__step--done' : ''}`}>
            <div className="cd-stepper__circle">
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <span>Xác thực Email</span>
          </div>
          <div className="cd-stepper__line" />
          <div className={`cd-stepper__step ${currentStep >= 2 ? 'cd-stepper__step--active' : ''} ${currentStep > 2 ? 'cd-stepper__step--done' : ''}`}>
            <div className="cd-stepper__circle">
              {currentStep > 2 ? '✓' : '2'}
            </div>
            <span>Tham gia đội</span>
          </div>
          <div className="cd-stepper__line" />
          <div className={`cd-stepper__step ${currentStep >= 3 ? 'cd-stepper__step--active' : ''}`}>
            <div className="cd-stepper__circle">3</div>
            <span>Hoàn tất</span>
          </div>
        </div>

        {/* ── Step 1: Email Verification ── */}
        {needsVerification && (
          <div className="cd-card cd-card--verification" id="step-verify-email">
            <div className="cd-card__icon-wrap">
              <svg className="cd-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="cd-card__title">Xác Thực Email</h2>
            <p className="cd-card__desc">
              Vui lòng xác thực email <strong>{user?.email}</strong> để tiếp tục sử dụng hệ thống.
            </p>

            {verifyMsg && (
              <div className="cd-card__msg">{verifyMsg}</div>
            )}

            {!showOtpInput ? (
              <>
                <button
                  onClick={handleSendVerification}
                  disabled={verifyLoading}
                  className="cd-card__btn"
                  id="btn-send-verification"
                >
                  {verifyLoading ? (
                    <span className="cd-card__btn-spinner" />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13" />
                        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                      Gửi Email Xác Thực
                    </>
                  )}
                </button>

                <p className="cd-card__hint">
                  Sau khi nhận email, nhấn vào link xác thực rồi quay lại trang này.
                  <button
                    onClick={fetchOnboarding}
                    className="cd-card__refresh"
                  >
                    ↻ Kiểm tra lại
                  </button>
                </p>
              </>
            ) : (
              <div className="cd-card__otp-section" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="cd-form__field">
                  <input
                    type="text"
                    maxLength="6"
                    className="cd-form__input"
                    placeholder="Nhập mã OTP (6 chữ số)"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\\D/g, ''))}
                    style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleVerifyCode}
                    disabled={verifyLoading || verificationCode.length !== 6}
                    className="cd-card__btn"
                    style={{ flex: 1 }}
                  >
                    {verifyLoading ? (
                      <span className="cd-card__btn-spinner" />
                    ) : (
                      'Xác Thực'
                    )}
                  </button>
                  <button
                    onClick={() => setShowOtpInput(false)}
                    disabled={verifyLoading}
                    className="cd-card__btn"
                    style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Join or Create Team ── */}
        {needsTeam && (
          <div className="cd-card cd-card--team" id="step-join-team">
            <div className="cd-card__icon-wrap">
              <svg className="cd-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2 className="cd-card__title">Tham Gia Đội</h2>
            <p className="cd-card__desc">
              Chọn cuộc thi và tham gia một đội hoặc tạo đội mới.
            </p>

            {teamMsg && (
              <div className="cd-card__msg">{teamMsg}</div>
            )}

            {/* Competition selector */}
            {competitions.length > 0 ? (
              <>
                <div className="cd-form__field">
                  <label className="cd-form__label">Cuộc thi</label>
                  <select
                    className="cd-form__select"
                    value={selectedComp}
                    onChange={(e) => setSelectedComp(e.target.value)}
                    id="select-competition"
                  >
                    {competitions.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Toggle: Join or Create */}
                <div className="cd-toggle">
                  <button
                    className={`cd-toggle__btn ${teamAction === 'join' ? 'cd-toggle__btn--active' : ''}`}
                    onClick={() => setTeamAction('join')}
                  >
                    Tham gia đội
                  </button>
                  <button
                    className={`cd-toggle__btn ${teamAction === 'create' ? 'cd-toggle__btn--active' : ''}`}
                    onClick={() => setTeamAction('create')}
                  >
                    Tạo đội mới
                  </button>
                </div>

                {/* Join team tab */}
                {teamAction === 'join' && (
                  <div className="cd-teams">
                    {teamsLoading ? (
                      <div className="cd-teams__loading">
                        <span className="cd-card__btn-spinner" /> Đang tải...
                      </div>
                    ) : teams.length === 0 ? (
                      <div className="cd-teams__empty">
                        <p>Chưa có đội nào. Hãy tạo đội mới!</p>
                      </div>
                    ) : (
                      <div className="cd-teams__list">
                        {teams.map((team) => (
                          <div key={team._id} className="cd-team-card">
                            <div className="cd-team-card__info">
                              <h3 className="cd-team-card__name">{team.team_name}</h3>
                              <span className="cd-team-card__count">
                                {team.member_count}/{team.max_team_size} thành viên
                              </span>
                            </div>
                            <div className="cd-team-card__bar">
                              <div
                                className="cd-team-card__bar-fill"
                                style={{
                                  width: `${(team.member_count / team.max_team_size) * 100}%`,
                                }}
                              />
                            </div>
                            <button
                              onClick={() => handleJoinTeam(team._id)}
                              disabled={teamLoading || team.member_count >= team.max_team_size}
                              className="cd-team-card__join"
                            >
                              {team.member_count >= team.max_team_size
                                ? 'Đã đầy'
                                : 'Tham gia'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Create team tab */}
                {teamAction === 'create' && (
                  <form className="cd-create-team" onSubmit={handleCreateTeam}>
                    <div className="cd-form__field">
                      <label className="cd-form__label" htmlFor="team_name">
                        Tên đội
                      </label>
                      <input
                        type="text"
                        id="team_name"
                        className="cd-form__input"
                        placeholder="VD: Team Phoenix"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="cd-form__field">
                      <label className="cd-form__label" htmlFor="max_members">
                        Số lượng thành viên dự kiến
                      </label>
                      <input
                        type="number"
                        id="max_members"
                        className="cd-form__input"
                        min="1"
                        max="20"
                        value={teamMaxMembers}
                        onChange={(e) => setTeamMaxMembers(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={teamLoading || !teamName.trim()}
                      className="cd-card__btn"
                      id="btn-create-team"
                    >
                      {teamLoading ? (
                        <span className="cd-card__btn-spinner" />
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Tạo Đội
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="cd-teams__empty">
                <p>Hiện chưa có cuộc thi nào đang mở đăng ký.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Complete — Dashboard ── */}
        {currentStep === 3 && (
          <div className="cd-dashboard" id="step-complete">
            <div className="cd-welcome">
              <h2 className="cd-welcome__title">
                Chào mừng, <span className="gradient-text">{user?.full_name}</span>!
              </h2>
              <p className="cd-welcome__subtitle">
                {isComplete ? 'Bạn đã hoàn tất onboarding. Hãy sẵn sàng cho cuộc thi!' : 'Vui lòng cung cấp thông tin GitHub để hoàn tất quá trình đăng ký!'}
              </p>
              <div style={{ marginTop: '24px' }}>
                {isComplete && (
                  <button
                    className="cd-card__btn"
                    onClick={() => {
                      // Save current data to localStorage so ContestantHome can read it
                      localStorage.setItem('ch_onboarding', JSON.stringify(onboarding));
                      localStorage.setItem('ch_user', JSON.stringify(user));
                      window.location.href = '/contestant-home';
                    }}
                    id="btn-complete"
                    style={{ padding: '14px 48px', fontSize: '16px', letterSpacing: '1px' }}
                  >
                    🚀 HOÀN TẤT
                  </button>
                )}
              </div>
            </div>

            {/* Team info card */}
            <div className="cd-info-grid">
              <div className="cd-info-card">
                <div className="cd-info-card__header">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <h3>Đội của bạn</h3>
                </div>
                <div className="cd-info-card__body">
                  <p className="cd-info-card__team-name" style={{ marginBottom: '16px' }}>
                    {onboarding.team?.team_name}
                    <span className="cd-info-card__badge" style={{ marginLeft: '10px', fontSize: '12px' }}>
                      {onboarding.team?.is_leader ? '👑 Leader' : '👤 Thành viên'}
                    </span>
                  </p>
                  
                  <div className="cd-team-members" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Thành viên nhóm:</p>
                    {onboarding.team?.members?.map((m) => (
                      <div key={m._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: '500', fontSize: '14px', color: '#fff' }}>
                            {m.full_name} {m.is_leader && <span style={{ fontSize: '12px' }}>👑</span>}
                          </p>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyan)' }}>
                            {m.github_username ? `@${m.github_username}` : 'Chưa cập nhật GitHub'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cd-info-card">
                <div className="cd-info-card__header">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h3>Trạng thái</h3>
                </div>
                <div className="cd-info-card__body">
                  <div className="cd-info-card__status">
                    <span className="cd-info-card__status-dot cd-info-card__status-dot--green" />
                    Email đã xác thực
                  </div>
                  <div className="cd-info-card__status">
                    <span className="cd-info-card__status-dot cd-info-card__status-dot--green" />
                    Đã tham gia đội
                  </div>
                </div>
              </div>

              {/* Submission Area */}
              <div className="cd-info-card cd-submission-card">
                <div className="cd-info-card__header">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <h3>Thông Tin GitHub</h3>
                  {submission?.status === 'submitted' && (
                    <span className="badge badge--active" style={{ marginLeft: 'auto' }}>Đã Nộp</span>
                  )}
                </div>
                <div className="cd-info-card__body">
                  {(user?.github_username && !isEditing) ? (
                    <div className="cd-submission-readonly">
                      <div className="cd-submission-details">
                        <p><strong>Tên GitHub:</strong> {user.github_username}</p>
                        <p><strong>Link GitHub:</strong> <a href={user.github_link} target="_blank" rel="noreferrer">{user.github_link}</a></p>
                        
                        <button
                          className="cd-card__btn"
                          style={{ marginTop: '10px', alignSelf: 'flex-start' }}
                          onClick={() => setIsEditing(true)}
                        >
                          Chỉnh Sửa Thông Tin
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form className="cd-create-team" onSubmit={handleSubmitProject}>
                      <div className="cd-form__field">
                        <label className="cd-form__label">Tên GitHub</label>
                        <input
                          type="text"
                          className="cd-form__input"
                          placeholder="Nhập tên GitHub của bạn"
                          value={submitForm.project_name}
                          onChange={(e) => setSubmitForm({ ...submitForm, project_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="cd-form__field">
                        <label className="cd-form__label">Link GitHub</label>
                        <input
                          type="url"
                          className="cd-form__input"
                          placeholder="https://github.com/..."
                          value={submitForm.repo_url}
                          onChange={(e) => setSubmitForm({ ...submitForm, repo_url: e.target.value })}
                          required
                        />
                      </div>

                      {submitMsg && <div className="cd-card__msg">{submitMsg}</div>}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button type="submit" className="cd-card__btn" style={{ flex: 1 }} disabled={submitting}>
                          {submitting ? 'Đang gửi...' : (user?.github_username ? 'Cập Nhật Thông Tin' : 'Gửi Thông Tin')}
                        </button>
                        {user?.github_username && (
                          <button
                            type="button"
                            className="cd-card__btn"
                            style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', color: '#fff' }}
                            onClick={() => setIsEditing(false)}
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ContestantDashboard;
