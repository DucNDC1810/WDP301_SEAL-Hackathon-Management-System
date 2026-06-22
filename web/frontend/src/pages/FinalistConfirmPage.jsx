import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFinalists, updateTeamStatus, getAuditLog } from '../api/finalist';
import { getRoundSetup, assignJudges, activateRound } from '../api/round';
import { useRoundStatus } from '../hooks/useRoundStatus';
import { FrozenOverlay } from '../components/FrozenOverlay';

export default function FinalistConfirmPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();
  const { isFrozen } = useRoundStatus(round_id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [finalists, setFinalists] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [round, setRound] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [assignedJudges, setAssignedJudges] = useState([]);
  const [allAvailableJudges, setAllAvailableJudges] = useState([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [weightValid, setWeightValid] = useState(false);
  const [selectedJudgeIds, setSelectedJudgeIds] = useState([]);
  const [savingJudges, setSavingJudges] = useState(false);
  const [activating, setActivating] = useState(false);

  // Active step state: 'teams' | 'judges' | 'criteria'
  const [activeTab, setActiveTab] = useState('teams');

  const loadData = async () => {
    try {
      const [finalistsRes, logsRes, setupRes] = await Promise.all([
        getFinalists(round_id),
        getAuditLog(round_id),
        getRoundSetup(round_id)
      ]);
      setFinalists(finalistsRes.data || []);
      setAuditLogs(logsRes.data || []);

      const setupData = setupRes.data;
      setRound(setupData.round);
      setCriteria(setupData.criteria || []);
      setAssignedJudges(setupData.judges || []);
      setAllAvailableJudges(setupData.all_available_judges || []);
      setTotalWeight(setupData.total_weight || 0);
      setWeightValid(setupData.weight_valid || false);
      
      const ids = (setupData.judges || []).map(j => j._id);
      setSelectedJudgeIds(ids);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Lỗi khi tải dữ liệu Chung kết.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [round_id]);

  const handleStatusChange = async (teamId, teamName, newStatus) => {
    const actionText = newStatus === 'ACTIVE' ? 'XÁC NHẬN' : 'LOẠI';
    const confirmMessage = `Bạn có chắc chắn muốn ${actionText} đội "${teamName}" vào danh sách chung kết?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionLoading(true);
    try {
      await updateTeamStatus(round_id, teamId, newStatus);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || "Thao tác thay đổi trạng thái thất bại.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJudgeCheckboxChange = (judgeId) => {
    setSelectedJudgeIds(prev => {
      if (prev.includes(judgeId)) {
        return prev.filter(id => id !== judgeId);
      } else {
        return [...prev, judgeId];
      }
    });
  };

  const handleSaveJudges = async () => {
    setSavingJudges(true);
    try {
      const res = await assignJudges(round_id, selectedJudgeIds);
      setAssignedJudges(res.data || []);
      alert("Lưu phân công Hội đồng Ban giám khảo thành công!");
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || "Không thể lưu danh sách Ban giám khảo.");
    } finally {
      setSavingJudges(false);
    }
  };

  const handleActivateRound = async () => {
    if (!weightValid) {
      alert("Tổng trọng số của tiêu chí chấm điểm phải bằng chính xác 1.0!");
      return;
    }
    if (assignedJudges.length === 0) {
      alert("Vui lòng phân công ít nhất 1 Judge trước khi kích hoạt!");
      return;
    }

    if (!window.confirm("Kích hoạt Round Chung kết? Sau khi kích hoạt, vòng thi này sẽ chính thức bắt đầu và BGK có thể tiến hành chấm điểm.")) {
      return;
    }

    setActivating(true);
    try {
      const res = await activateRound(round_id);
      if (res.data.success) {
        setRound(prev => ({ ...prev, is_active: true }));
        alert("🎉 Vòng thi đã được kích hoạt thành công!");
        await loadData();
      }
    } catch (err) {
      console.error(err);
      const serverErr = err.response?.data?.error;
      const serverMsg = err.response?.data?.message;
      if (serverErr === 'WEIGHT_INVALID') {
        alert(`Kích hoạt thất bại: Tổng trọng số tiêu chí không hợp lệ (${err.response?.data?.total_weight})`);
      } else {
        alert(serverMsg || "Kích hoạt vòng thi thất bại. Vui lòng kiểm tra lại cấu hình.");
      }
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)"
      }}>
        <div className="spinner" style={{
          width: "50px",
          height: "50px",
          border: "4px solid rgba(0, 240, 255, 0.1)",
          borderTop: "4px solid var(--cyan)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "16px",
          boxShadow: "var(--shadow-cyan)"
        }} />
        <p style={{
          fontFamily: "var(--font-display)",
          color: "var(--cyan)",
          letterSpacing: "1px"
        }}>ĐANG TẢI DỮ LIỆU...</p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-primary)",
        padding: "24px",
        textAlign: "center"
      }}>
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid var(--red)",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "500px",
          boxShadow: "0 0 30px rgba(239, 68, 68, 0.2)",
          backdropFilter: "blur(12px)"
        }}>
          <span style={{ fontSize: "3rem", marginBottom: "16px", display: "block" }}>⚠️</span>
          <h2 style={{
            color: "var(--red)",
            fontFamily: "var(--font-display)",
            marginBottom: "12px",
            fontSize: "1.5rem"
          }}>LỖI HỆ THỐNG</h2>
          <p style={{
            color: "var(--text-secondary)",
            marginBottom: "24px",
            lineHeight: "1.6"
          }}>{error}</p>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "var(--gradient-primary)",
              color: "white",
              padding: "10px 24px",
              borderRadius: "8px",
              fontWeight: "600",
              boxShadow: "var(--shadow-cyan)",
              cursor: "pointer",
              transition: "transform 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
          >
            Quay lại trang trước
          </button>
        </div>
      </div>
    );
  }

  const isActivated = round?.is_active;

  // Stats calculation
  const confirmedTeamsCount = finalists.filter(f => f.status === 'ACTIVE').length;
  const estimatedDuration = confirmedTeamsCount * 20; // 20 minutes per team

  // Steps Configuration
  const steps = [
    { id: 'teams', step: 1, label: 'Xác nhận Đội thi', icon: '🏆', desc: 'Duyệt danh sách Chung kết' },
    { id: 'judges', step: 2, label: 'Cấu hình Giám khảo', icon: '👥', desc: 'Chọn ban giám khảo độc lập' },
    { id: 'criteria', step: 3, label: 'Tiêu chí & Kích hoạt', icon: '📋', desc: 'Kiểm tra tiêu chí & kích hoạt' }
  ];

  return (
    <FrozenOverlay isActive={isFrozen}>
    <div style={{
      background: "var(--bg-primary)",
      minHeight: "100vh",
      padding: "40px 24px",
      color: "var(--text-primary)"
    }}>
      <div className="container" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        
        {/* Top Back Button */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: "600",
              border: "1px solid var(--border)",
              cursor: "pointer",
              transition: "all 0.2s",
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "#fff";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            ← Quay lại trang chi tiết Hackathon
          </button>
        </div>

        {/* Header */}
        <header style={{
          textAlign: "left",
          marginBottom: "24px",
          position: "relative"
        }}>
          <h1 style={{
            fontSize: "2.1rem",
            fontWeight: "800",
            letterSpacing: "1px",
            marginBottom: "8px",
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            color: "#fff",
            textShadow: "0 0 10px rgba(0, 240, 255, 0.3)"
          }}>
            {round?.name || "Kích hoạt Vòng thi Chung kết"}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Thực hiện quy trình thiết lập theo các bước dưới đây để chuẩn bị và kích hoạt vòng thi chung kết.
          </p>
        </header>

        {/* Stepper Navigation Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '20px 28px',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {steps.map((s, idx) => {
            const isCurrent = activeTab === s.id;
            const isFinished = (s.step === 1 && confirmedTeamsCount > 0) || (s.step === 2 && assignedJudges.length > 0);
            
            return (
              <React.Fragment key={s.id}>
                {/* Step Item */}
                <div 
                  onClick={() => setActiveTab(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    flex: '1',
                    minWidth: '220px',
                    transition: 'all 0.2s',
                    padding: '8px',
                    borderRadius: '8px',
                    background: isCurrent ? 'rgba(0, 240, 255, 0.02)' : 'transparent'
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isCurrent ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.04)',
                    color: isCurrent ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${isCurrent ? 'var(--cyan)' : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    boxShadow: isCurrent ? 'var(--shadow-cyan)' : 'none',
                    transition: 'all 0.2s'
                  }}>
                    {s.step}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: isCurrent ? 'var(--cyan)' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>{s.icon} {s.label}</span>
                      {isFinished && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓</span>}
                    </div>
                    <div style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {s.desc}
                    </div>
                  </div>
                </div>

                {/* Line Separator between steps */}
                {idx < steps.length - 1 && (
                  <div style={{
                    flex: '0.2',
                    height: '2px',
                    background: isFinished ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.08)',
                    minWidth: '20px'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Dynamic Layout Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2.3fr 1fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          
          {/* Main Card View (Left Column) */}
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            
            {/* ─── STEP 1: TEAMS ─── */}
            {activeTab === 'teams' && (
              <div>
                <div>
                  <h3 style={{
                    fontSize: '1.15rem',
                    color: '#fff',
                    marginBottom: '20px',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase',
                    borderLeft: '4px solid var(--cyan)',
                    paddingLeft: '10px'
                  }}>
                    Bước 1: Xác nhận số đội vào Chung kết ({finalists.length} đội ứng viên)
                  </h3>

                  {finalists.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '16px',
                      marginBottom: '28px'
                    }}>
                      {finalists.map((team) => {
                        const isActive = team.status === 'ACTIVE';
                        return (
                          <div
                            key={team.team_id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                              borderRadius: '12px',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              transition: 'all 0.2s',
                              boxShadow: isActive ? '0 0 15px rgba(16, 185, 129, 0.05)' : '0 0 15px rgba(239, 68, 68, 0.05)'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>
                                  {team.team_name}
                                </h4>
                                {team.is_wildcard && (
                                  <span style={{
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    color: '#a855f7',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                  }}>
                                    Wild Card
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                <p style={{ margin: '3px 0' }}>Bảng đấu: <strong style={{ color: '#fff' }}>{team.assigned_group}</strong></p>
                                <p style={{ margin: '3px 0' }}>Điểm trung bình: <strong style={{ color: 'var(--cyan)' }}>{team.weighted_avg_score.toFixed(2)}</strong></p>
                                <div style={{ margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>Trạng thái:</span>
                                  <span style={{
                                    color: isActive ? '#10b981' : '#ef4444',
                                    background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                  }}>
                                    {team.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleStatusChange(team.team_id, team.team_name, 'ACTIVE')}
                                disabled={isActive || actionLoading}
                                style={{
                                  flex: 1,
                                  background: isActive ? 'rgba(16, 185, 129, 0.05)' : '#10b981',
                                  color: isActive ? 'rgba(255,255,255,0.3)' : 'white',
                                  border: isActive ? '1px solid rgba(16, 185, 129, 0.2)' : 'none',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  fontSize: '0.8rem',
                                  cursor: isActive ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => handleStatusChange(team.team_id, team.team_name, 'ELIMINATED')}
                                disabled={!isActive || actionLoading}
                                style={{
                                  flex: 1,
                                  background: !isActive ? 'rgba(239, 68, 68, 0.05)' : '#ef4444',
                                  color: !isActive ? 'rgba(255,255,255,0.3)' : 'white',
                                  border: !isActive ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  fontSize: '0.8rem',
                                  cursor: !isActive ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                Loại
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '28px' }}>
                      Không tìm thấy đội thi chung kết phù hợp.
                    </div>
                  )}
                </div>

                {/* Step Controls */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '20px' }}>
                  <button
                    onClick={() => setActiveTab('judges')}
                    style={{
                      background: 'var(--gradient-primary)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-cyan)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                  >
                    Tiếp tục: Cấu hình Giám khảo →
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2: JUDGES ─── */}
            {activeTab === 'judges' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{
                      fontSize: '1.15rem',
                      color: '#fff',
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      textTransform: 'uppercase',
                      borderLeft: '4px solid var(--cyan)',
                      paddingLeft: '10px'
                    }}>
                      Bước 2: Cấu hình & Chọn Ban giám khảo
                    </h3>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--orange)',
                      fontWeight: 'bold',
                      background: 'rgba(245, 158, 11, 0.06)',
                      border: '1px dashed rgba(245, 158, 11, 0.15)',
                      padding: '4px 10px',
                      borderRadius: '4px'
                    }}>
                      ⚠️ Panel độc lập – không dùng lại Judge của Vòng Sơ loại!
                    </span>
                  </div>

                  {/* List of Judges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {allAvailableJudges.length > 0 ? (
                      allAvailableJudges.map((judge, idx) => {
                        const isChecked = selectedJudgeIds.includes(judge._id);
                        return (
                          <div
                            key={judge._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: isChecked ? 'rgba(0, 240, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                              border: `1px solid ${isChecked ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'}`,
                              borderRadius: '10px',
                              padding: '12px 16px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleJudgeCheckboxChange(judge._id)}
                                disabled={isActivated}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: isActivated ? 'not-allowed' : 'pointer',
                                  accentColor: 'var(--cyan)'
                                }}
                              />
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(0, 240, 255, 0.15) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                color: 'var(--cyan)',
                                border: '1px solid rgba(0, 240, 255, 0.2)',
                                textTransform: 'uppercase'
                              }}>
                                {judge.full_name?.substring(0, 2) || 'JD'}
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: isChecked ? 'var(--cyan)' : '#fff', fontWeight: '600' }}>
                                  {judge.full_name}
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {judge.email}
                                </p>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                                ID: J-00{idx + 1}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.2)', cursor: 'default' }}>⋮⋮</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        Không tìm thấy tài khoản giám khảo để phân công.
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0, 240, 255, 0.02)',
                    border: '1px solid rgba(0, 240, 255, 0.08)',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    marginBottom: '28px'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Đã chọn: <strong style={{ color: 'var(--cyan)' }}>{selectedJudgeIds.length}</strong> | Hiện tại đang gán: <strong style={{ color: '#fff' }}>{assignedJudges.length}</strong>
                    </span>
                    <button
                      onClick={handleSaveJudges}
                      disabled={savingJudges || isActivated}
                      style={{
                        background: isActivated ? 'rgba(255,255,255,0.03)' : 'rgba(0, 240, 255, 0.08)',
                        color: isActivated ? 'rgba(255,255,255,0.15)' : 'var(--cyan)',
                        border: `1px solid ${isActivated ? 'rgba(255,255,255,0.08)' : 'rgba(0, 240, 255, 0.25)'}`,
                        padding: '8px 18px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        cursor: (savingJudges || isActivated) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        textTransform: 'uppercase'
                      }}
                    >
                      {savingJudges ? 'Đang lưu...' : 'Lưu phân công'}
                    </button>
                  </div>
                </div>

                {/* Step Controls */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '20px'
                }}>
                  <button
                    onClick={() => setActiveTab('teams')}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    ← Quay lại: Đội thi
                  </button>

                  <button
                    onClick={() => setActiveTab('criteria')}
                    style={{
                      background: 'var(--gradient-primary)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-cyan)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                  >
                    Tiếp tục: Cấu hình Tiêu chí →
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: CRITERIA & ACTIVATION ─── */}
            {activeTab === 'criteria' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{
                    fontSize: '1.15rem',
                    color: '#fff',
                    marginBottom: '20px',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase',
                    borderLeft: '4px solid var(--cyan)',
                    paddingLeft: '10px'
                  }}>
                    Bước 3: Thiết lập Tiêu chí & Kích hoạt vòng thi
                  </h3>

                  {/* List of Criteria */}
                  <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tên tiêu chí</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Mô tả</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Trọng số</th>
                        </tr>
                      </thead>
                      <tbody>
                        {criteria.length > 0 ? (
                          criteria.map(crit => (
                            <tr key={crit._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                              <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#fff', fontWeight: '600' }}>
                                {crit.name}
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                                {crit.description || 'N/A'}
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--cyan)', textAlign: 'right', fontWeight: 'bold' }}>
                                {crit.weight.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              Chưa cấu hình tiêu chí chấm điểm nào cho vòng thi này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Status checklist checkmarks */}
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '28px'
                  }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Điều kiện kích hoạt vòng thi</h5>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: weightValid ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{weightValid ? '✓' : '✗'}</span>
                        <span>Tổng trọng số tiêu chí phải bằng đúng 1.0 (Hiện tại: <strong style={{ color: weightValid ? '#10b981' : '#ef4444' }}>{totalWeight.toFixed(2)}</strong>)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span style={{ color: assignedJudges.length > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{assignedJudges.length > 0 ? '✓' : '✗'}</span>
                        <span>Đã phân công ít nhất 1 giám khảo (Hiện tại: <strong>{assignedJudges.length}</strong>)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step Controls */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '20px'
                }}>
                  <button
                    onClick={handleActivateRound}
                    disabled={!weightValid || assignedJudges.length === 0 || isActivated || activating}
                    style={{
                      width: '100%',
                      background: (isActivated || !weightValid || assignedJudges.length === 0) ? 'rgba(255,255,255,0.03)' : 'var(--gradient-primary)',
                      color: (isActivated || !weightValid || assignedJudges.length === 0) ? 'rgba(255,255,255,0.15)' : 'white',
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      letterSpacing: '0.5px',
                      cursor: (!weightValid || assignedJudges.length === 0 || isActivated || activating) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: (isActivated || !weightValid || assignedJudges.length === 0) ? 'none' : 'var(--shadow-cyan)',
                      textTransform: 'uppercase'
                    }}
                  >
                    {activating ? 'Đang kích hoạt...' : isActivated ? 'Vòng thi đã kích hoạt thành công' : '🚀 Kích hoạt Vòng thi'}
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      onClick={() => setActiveTab('judges')}
                      style={{
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      ← Quay lại: Giám khảo
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Sidebar Columns (Right Column) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* SYSTEM STATUS Card */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)",
              position: 'relative',
              overflow: 'hidden'
            }}>
              <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '0.75rem',
                letterSpacing: '1px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                fontWeight: '700'
              }}>
                SYSTEM STATUS
              </h4>
              
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '1.25rem',
                fontWeight: '800',
                color: isActivated ? 'var(--cyan)' : 'var(--orange)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {isActivated ? "Đã kích hoạt" : "Chờ kích hoạt"}
              </h3>
              
              <p style={{
                margin: '0 0 16px 0',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                {isActivated 
                  ? "Vòng thi chung kết đã được cấu hình và kích hoạt thành công trên toàn hệ thống."
                  : "Đang chờ thiết lập hội đồng ban giám khảo và kiểm duyệt trọng số tiêu chí chấm điểm."
                }
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: isActivated ? 'var(--cyan)' : 'var(--text-secondary)',
                fontWeight: '600'
              }}>
                <span style={{ fontSize: '1rem' }}>✓</span>
                <span>Đồng bộ hóa thời gian thực</span>
              </div>

              {/* Cyberpunk Gear SVG Icon Background */}
              <div style={{
                position: 'absolute',
                right: '-15px',
                bottom: '-15px',
                opacity: 0.05,
                pointerEvents: 'none'
              }}>
                <svg width="100" height="100" viewBox="0 0 24 24" fill="var(--cyan)">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.04,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
                </svg>
              </div>
            </div>

            {/* Thống kê nhanh Card */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)"
            }}>
              <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '0.75rem',
                letterSpacing: '1px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                fontWeight: '700'
              }}>
                Thống kê nhanh
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ứng viên</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{confirmedTeamsCount} Nhóm</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min((confirmedTeamsCount / 12) * 100, 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--purple) 0%, var(--cyan) 100%)',
                      boxShadow: 'var(--shadow-cyan)'
                    }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Thời lượng dự kiến</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{estimatedDuration} Phút</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min((estimatedDuration / 240) * 100, 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--cyan) 0%, #10b981 100%)',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
                    }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Audit Log Panel at the Bottom */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(12px)",
          marginTop: "32px"
        }}>
          <h3 style={{
            fontSize: '1.15rem',
            color: '#fff',
            marginBottom: '20px',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            borderLeft: '4px solid var(--orange)',
            paddingLeft: '10px'
          }}>
            Lịch sử thao tác (Audit Log)
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Thời gian</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Hành động</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Trạng thái cũ</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Trạng thái mới</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Người thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => {
                    const oldValStr = typeof log.old_value === 'object' ? (log.old_value?.status !== undefined ? log.old_value.status : JSON.stringify(log.old_value)) : String(log.old_value);
                    const newValStr = typeof log.new_value === 'object' ? (log.new_value?.status !== undefined ? log.new_value.status : JSON.stringify(log.new_value)) : String(log.new_value);
                    
                    return (
                      <tr
                        key={log._id}
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {new Date(log.performed_at || log.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                          {log.action === 'ROUND_ACTIVATED' ? 'Kích hoạt Vòng thi' : 'Cập nhật trạng thái đội'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                          <span style={{
                            color: oldValStr === 'ACTIVE' || oldValStr === 'true' ? '#10b981' : '#ef4444',
                            background: oldValStr === 'ACTIVE' || oldValStr === 'true' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {oldValStr}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                          <span style={{
                            color: newValStr === 'ACTIVE' || newValStr === 'true' ? '#10b981' : '#ef4444',
                            background: newValStr === 'ACTIVE' || newValStr === 'true' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {newValStr}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--cyan)' }}>
                          {log.performed_by?.name || log.performed_by?.email || log.actor_email || 'System'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Chưa có lịch sử thay đổi trạng thái nào cho các đội thi này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
    </FrozenOverlay>
  );
}
