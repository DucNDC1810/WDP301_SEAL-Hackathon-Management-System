import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFinalists, updateTeamStatus, getAuditLog } from '../api/finalist';
import { getRoundSetup, assignJudges, activateRound, createCriteria, updateCriteria, deleteCriteria, getPools, updatePool, updateRound } from '../api/round';
import { useRoundStatus } from '../hooks/useRoundStatus';
import { FrozenOverlay } from '../components/FrozenOverlay';
import { notification, Modal } from 'antd';
import RefreshButton from '../components/RefreshButton';

export default function FinalistConfirmPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();
  const [nextRoundId, setNextRoundId] = useState(null);
  const { isFrozen } = useRoundStatus(nextRoundId || round_id);
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
  const [judgeSearchQuery, setJudgeSearchQuery] = useState('');
  const [pools, setPools] = useState([]);
  const [loadingPools, setLoadingPools] = useState(false);
  const [updatingPoolId, setUpdatingPoolId] = useState(null);
  const [poolDriveLinks, setPoolDriveLinks] = useState({});
  const [roundDriveLink, setRoundDriveLink] = useState('');
  const [updatingRoundLink, setUpdatingRoundLink] = useState(false);

  // Criteria inline management
  const EMPTY_CRIT = { name: '', weight: '', description: '' };
  const [showCritForm, setShowCritForm] = useState(false);
  const [critForm, setCritForm] = useState(EMPTY_CRIT);
  const [editingCritId, setEditingCritId] = useState(null);
  const [critSaving, setCritSaving] = useState(false);

  // Active step state: 'teams' | 'judges' | 'criteria'
  const [activeTab, setActiveTab] = useState('teams');
  const [selectedGroupTab, setSelectedGroupTab] = useState('');

  const loadData = async () => {
    try {
      const finalistsRes = await getFinalists(round_id);
      const logsRes = await getAuditLog(round_id);
      
      const finalistsData = finalistsRes.data?.finalists || [];
      const nextId = finalistsRes.data?.next_round_id || round_id;
      
      setFinalists(finalistsData);
      setAuditLogs(logsRes.data || []);
      setNextRoundId(nextId);

      const setupRes = await getRoundSetup(nextId);
      const setupData = setupRes.data;
      setRound(setupData.round);
      setRoundDriveLink(setupData.round?.drive_link || '');
      setCriteria(setupData.criteria || []);
      setAssignedJudges(setupData.judges || []);
      setAllAvailableJudges(setupData.all_available_judges || []);
      setTotalWeight(setupData.total_weight || 0);
      setWeightValid(setupData.weight_valid || false);
      
      const ids = (setupData.judges || []).map(j => j._id);
      setSelectedJudgeIds(ids);

      // Load pools
      if (setupData.round?.contest_id) {
        setLoadingPools(true);
        try {
          const poolsRes = await getPools(setupData.round.contest_id, nextId);
          const poolsData = poolsRes.data?.data || [];
          setPools(poolsData);
          
          // Pre-populate poolDriveLinks
          const links = {};
          poolsData.forEach(p => {
            links[p._id] = p.drive_link || '';
          });
          setPoolDriveLinks(links);
        } catch (poolErr) {
          console.error("Lỗi tải pools:", poolErr);
        } finally {
          setLoadingPools(false);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Lỗi khi tải dữ liệu Chung kết.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePoolLink = async (poolId) => {
    const driveLink = poolDriveLinks[poolId] || '';
    setUpdatingPoolId(poolId);
    try {
      await updatePool(poolId, { drive_link: driveLink });
      notification.success({
        message: 'Thành công',
        description: 'Đã cập nhật link đề bài cho bảng đấu.',
      });
      await loadData();
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Lỗi',
        description: err.response?.data?.message || err.message || 'Lỗi khi cập nhật đề bài.',
      });
    } finally {
      setUpdatingPoolId(null);
    }
  };

  const handleUpdateRoundLink = async () => {
    setUpdatingRoundLink(true);
    try {
      await updateRound(nextRoundId, { drive_link: roundDriveLink });
      notification.success({
        message: 'Thành công',
        description: 'Đã cập nhật link đề bài cho Vòng Chung kết thành công.',
      });
      await loadData();
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Lỗi',
        description: err.response?.data?.message || err.message || 'Lỗi khi cập nhật đề bài.',
      });
    } finally {
      setUpdatingRoundLink(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [round_id]);

  // ── Criteria handlers ─────────────────────────────────────────────────────
  const handleOpenCritForm = (crit = null) => {
    if (crit) {
      setEditingCritId(crit._id);
      setCritForm({ name: crit.name, weight: String(crit.weight), description: crit.description || '' });
    } else {
      setEditingCritId(null);
      setCritForm(EMPTY_CRIT);
    }
    setShowCritForm(true);
  };

  const handleSaveCrit = async (e) => {
    e.preventDefault();
    const targetId = nextRoundId || round_id;
    const payload = { name: critForm.name, weight: parseFloat(critForm.weight), description: critForm.description };
    setCritSaving(true);
    try {
      if (editingCritId) {
        await updateCriteria(targetId, editingCritId, payload);
      } else {
        await createCriteria(targetId, payload);
      }
      setShowCritForm(false);
      setEditingCritId(null);
      setCritForm(EMPTY_CRIT);
      await loadData();
    } catch (err) {
      notification.error({
        message: 'Lỗi',
        description: err.response?.data?.message || err.message || "Lỗi khi lưu tiêu chí.",
      });
    } finally {
      setCritSaving(false);
    }
  };

  const handleDeleteCrit = async (critId, critName) => {
    Modal.confirm({
      title: 'Xóa tiêu chí?',
      content: `Bạn có chắc chắn muốn xóa tiêu chí "${critName}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        const targetId = nextRoundId || round_id;
        try {
          await deleteCriteria(targetId, critId);
          await loadData();
        } catch (err) {
          notification.error({
            message: 'Lỗi',
            description: err.response?.data?.message || err.message || "Lỗi khi xóa tiêu chí.",
          });
        }
      }
    });
  };

  const handleStatusChange = async (teamId, teamName, newStatus) => {
    const actionText = newStatus === 'ACTIVE' ? 'XÁC NHẬN' : 'LOẠI';
    const confirmMessage = `Bạn có chắc chắn muốn ${actionText} đội "${teamName}" vào danh sách chung kết?`;
    
    Modal.confirm({
      title: `${actionText} đội thi?`,
      content: confirmMessage,
      okText: actionText,
      cancelText: 'Hủy',
      okButtonProps: newStatus === 'ACTIVE' ? {} : { danger: true },
      onOk: async () => {
        setActionLoading(true);
        try {
          await updateTeamStatus(round_id, teamId, newStatus);
          await loadData();
        } catch (err) {
          console.error(err);
          notification.error({
            message: 'Lỗi',
            description: err.response?.data?.message || err.message || "Thao tác thay đổi trạng thái thất bại.",
          });
        } finally {
          setActionLoading(false);
        }
      }
    });
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
      const res = await assignJudges(nextRoundId || round_id, selectedJudgeIds);
      setAssignedJudges(res.data || []);
      notification.success({
        message: 'Thành công',
        description: "Lưu phân công Hội đồng Ban giám khảo thành công!",
      });
      await loadData();
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Lỗi',
        description: err.response?.data?.message || err.message || "Không thể lưu danh sách Ban giám khảo.",
      });
    } finally {
      setSavingJudges(false);
    }
  };

  const handleActivateRound = async () => {
    if (!weightValid) {
      notification.warning({
        message: 'Tổng trọng số không hợp lệ',
        description: "Tổng trọng số của tiêu chí chấm điểm phải bằng chính xác 1.0!",
      });
      return;
    }
    if (assignedJudges.length === 0) {
      notification.warning({
        message: 'Thiếu ban giám khảo',
        description: "Vui lòng phân công ít nhất 1 Judge trước khi kích hoạt!",
      });
      return;
    }

    Modal.confirm({
      title: 'Kích hoạt Vòng thi?',
      content: 'Kích hoạt Round Chung kết? Sau khi kích hoạt, vòng thi này sẽ chính thức bắt đầu và BGK có thể tiến hành chấm điểm.',
      okText: 'Kích hoạt',
      cancelText: 'Hủy',
      onOk: async () => {
        setActivating(true);
        try {
          const res = await activateRound(nextRoundId || round_id);
          if (res.data.success) {
            setRound(prev => ({ ...prev, is_active: true }));
            notification.success({
              message: 'Thành công',
              description: "🎉 Vòng thi đã được kích hoạt thành công!",
            });
            await loadData();
          }
        } catch (err) {
          console.error(err);
          const serverErr = err.response?.data?.error;
          const serverMsg = err.response?.data?.message;
          if (serverErr === 'WEIGHT_INVALID') {
            notification.error({
              message: 'Kích hoạt thất bại',
              description: `Kích hoạt thất bại: Tổng trọng số tiêu chí không hợp lệ (${err.response?.data?.total_weight})`,
            });
          } else {
            notification.error({
              message: 'Kích hoạt thất bại',
              description: serverMsg || "Kích hoạt vòng thi thất bại. Vui lòng kiểm tra lại cấu hình.",
            });
          }
        } finally {
          setActivating(false);
        }
      }
    });
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

  // Group finalists by assigned_group
  const groupedFinalists = finalists.reduce((groups, team) => {
    const groupName = team.assigned_group || 'Chưa phân bảng';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(team);
    return groups;
  }, {});

  // Sort groups alphabetically and sort teams within each group by weighted_avg_score desc
  const sortedGroupNames = Object.keys(groupedFinalists).sort((a, b) => a.localeCompare(b, 'vi'));
  sortedGroupNames.forEach(groupName => {
    groupedFinalists[groupName].sort((a, b) => {
      const scoreA = Number(a.weighted_avg_score) || 0;
      const scoreB = Number(b.weighted_avg_score) || 0;
      return scoreB - scoreA;
    });
  });

  const activeGroupTab = selectedGroupTab || (sortedGroupNames.length > 0 ? sortedGroupNames[0] : '');

  // Steps Configuration
  const steps = [
    { id: 'teams', step: 1, label: 'Xác nhận Đội thi', icon: '🏆', desc: 'Duyệt danh sách Chung kết' },
    { id: 'judges', step: 2, label: 'Cấu hình Giám khảo', icon: '👥', desc: 'Chọn ban giám khảo độc lập' },
    { id: 'problems', step: 3, label: 'Cấu hình Đề bài', icon: '📂', desc: 'Cập nhật Google Drive đề bài' },
    { id: 'criteria', step: 4, label: 'Tiêu chí & Kích hoạt', icon: '📋', desc: 'Kiểm tra tiêu chí & kích hoạt' }
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
          <div style={{ marginTop: '12px' }}>
            <RefreshButton onRefresh={loadData} />
          </div>
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
          flexWrap: 'nowrap',
          gap: '12px',
          overflowX: 'auto'
        }}>
          {steps.map((s, idx) => {
            const isCurrent = activeTab === s.id;
            const isFinished = (s.step === 1 && confirmedTeamsCount > 0) || (s.step === 2 && assignedJudges.length > 0) || (s.step === 3 && round?.drive_link);
            
            return (
              <React.Fragment key={s.id}>
                {/* Step Item */}
                <div 
                  onClick={() => setActiveTab(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    flex: '1 1 auto',
                    transition: 'all 0.2s',
                    padding: '8px',
                    borderRadius: '8px',
                    background: isCurrent ? 'rgba(0, 240, 255, 0.02)' : 'transparent',
                    minWidth: 'max-content'
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
                    transition: 'all 0.2s',
                    flexShrink: 0
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
                    flex: '1',
                    height: '2px',
                    background: isFinished ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.08)',
                    minWidth: '15px',
                    maxWidth: '60px'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Main Card View (Full Width) */}
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
                    <div>
                      {/* Tabs Bar */}
                      <div style={{
                        display: 'flex',
                        gap: '10px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingBottom: '12px',
                        marginBottom: '24px',
                        overflowX: 'auto',
                        scrollbarWidth: 'none'
                      }}>
                        {sortedGroupNames.map((groupName) => {
                          const teamsInGroup = groupedFinalists[groupName];
                          const activeInGroupCount = teamsInGroup.filter(t => t.status === 'ACTIVE').length;
                          const isCurrent = activeGroupTab === groupName;

                          return (
                            <button
                              key={groupName}
                              onClick={() => setSelectedGroupTab(groupName)}
                              style={{
                                background: isCurrent ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                color: isCurrent ? 'var(--cyan)' : 'var(--text-secondary)',
                                border: `1px solid ${isCurrent ? 'rgba(0, 240, 255, 0.3)' : 'var(--border)'}`,
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                whiteSpace: 'nowrap',
                                boxShadow: isCurrent ? 'var(--shadow-cyan)' : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (!isCurrent) {
                                  e.currentTarget.style.color = '#fff';
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isCurrent) {
                                  e.currentTarget.style.color = 'var(--text-secondary)';
                                  e.currentTarget.style.borderColor = 'var(--border)';
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                }
                              }}
                            >
                              <span>📂 {groupName}</span>
                              <span style={{
                                fontSize: '0.72rem',
                                background: isCurrent ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: isCurrent ? 'var(--cyan)' : 'var(--text-secondary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                              }}>
                                {activeInGroupCount}/{teamsInGroup.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Tab Content */}
                      {activeGroupTab && groupedFinalists[activeGroupTab] && (() => {
                        const teamsInGroup = groupedFinalists[activeGroupTab];
                        const activeInGroupCount = teamsInGroup.filter(t => t.status === 'ACTIVE').length;
                        return (
                          <div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '16px',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}>
                              <h4 style={{
                                fontSize: '1rem',
                                color: 'var(--cyan)',
                                margin: 0,
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontFamily: 'var(--font-display)',
                                textTransform: 'uppercase'
                              }}>
                                {activeGroupTab}
                              </h4>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Đã chọn: <strong style={{ color: '#10b981' }}>{activeInGroupCount}</strong> / {teamsInGroup.length} đội
                              </span>
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                              gap: '16px',
                              marginBottom: '20px'
                            }}>
                              {teamsInGroup.map((team) => {
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
                          </div>
                        );
                      })()}
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
                  </div>

                  {/* Search Input for Judges */}
                  <div style={{ marginBottom: '16px' }}>
                    <input
                      type="text"
                      placeholder="🔍 Tìm kiếm giám khảo theo tên hoặc email..."
                      value={judgeSearchQuery}
                      onChange={(e) => setJudgeSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        fontSize: '0.85rem',
                        color: '#fff',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--cyan)';
                        e.target.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.2)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border)';
                        e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.2)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                      }}
                    />
                  </div>

                  {/* List of Judges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {(() => {
                      const filteredJudges = allAvailableJudges.filter(j => 
                        j.full_name?.toLowerCase().includes(judgeSearchQuery.toLowerCase()) ||
                        j.email?.toLowerCase().includes(judgeSearchQuery.toLowerCase())
                      );
                      return filteredJudges.length > 0 ? (
                        filteredJudges.map((judge, idx) => {
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
                        Không tìm thấy tài khoản giám khảo phù hợp với từ khóa tìm kiếm.
                      </div>
                    );
                  })()}
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
                    onClick={() => setActiveTab('problems')}
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
                    Tiếp tục: Cấu hình Đề bài →
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: PROBLEMS & DRIVE LINKS ─── */}
            {activeTab === 'problems' && (
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
                      Bước 3: Cấu hình Đề bài Vòng Chung kết
                    </h3>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                    Nhập đường dẫn Google Drive hoặc tài liệu đề bài chính thức cho Vòng thi Chung kết dưới đây. Đề bài này sẽ được phát và hiển thị trực tiếp cho tất cả các đội thi vượt qua vòng loại.
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '24px',
                      marginBottom: '24px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>
                          Liên kết tài liệu Đề bài (Google Drive / OneDrive...)
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Vui lòng đảm bảo quyền truy cập liên kết ở chế độ công khai hoặc chia sẻ cho các đội thi.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Nhập đường dẫn đề bài (ví dụ: https://drive.google.com/drive/folders/...)"
                        value={roundDriveLink}
                        onChange={(e) => setRoundDriveLink(e.target.value)}
                        disabled={isActivated}
                        style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '0.85rem',
                          color: '#fff',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                      />
                      <button
                        onClick={handleUpdateRoundLink}
                        disabled={updatingRoundLink || isActivated}
                        style={{
                          background: 'rgba(0, 240, 255, 0.08)',
                          color: 'var(--cyan)',
                          border: '1px solid rgba(0, 240, 255, 0.25)',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          cursor: (updatingRoundLink || isActivated) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {updatingRoundLink ? 'Đang lưu...' : 'Lưu đề bài'}
                      </button>
                      {round?.drive_link && (
                        <a
                          href={round.drive_link}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            width: '40px',
                            height: '40px',
                            textDecoration: 'none',
                            fontSize: '1rem',
                            transition: 'all 0.2s'
                          }}
                          title="Mở link đề bài"
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        >
                          🔗
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <button
                      onClick={() => setActiveTab('judges')}
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
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      ← Quay lại: Giám khảo
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
              </div>
            )}

                        {/* ─── STEP 4: CRITERIA & ACTIVATION ─── */}
            {activeTab === 'criteria' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  {/* Header row */}
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
                      Bước 3: Thiết lập Tiêu chí & Kích hoạt vòng thi
                    </h3>
                    {!isActivated && (
                      <button
                        type="button"
                        onClick={() => handleOpenCritForm(null)}
                        style={{
                          background: 'rgba(0, 240, 255, 0.08)',
                          color: 'var(--cyan)',
                          border: '1px solid rgba(0, 240, 255, 0.25)',
                          padding: '7px 16px',
                          borderRadius: '7px',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        ＋ Thêm tiêu chí
                      </button>
                    )}
                  </div>

                  {/* Inline add/edit form */}
                  {showCritForm && (
                    <form onSubmit={handleSaveCrit} style={{
                      background: 'rgba(0, 240, 255, 0.03)',
                      border: '1px solid rgba(0, 240, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '18px',
                      marginBottom: '20px',
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr',
                      gap: '12px',
                      alignItems: 'end'
                    }}>
                      {/* Name */}
                      <div>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                          Tên tiêu chí *
                        </label>
                        <input
                          required
                          value={critForm.name}
                          onChange={e => setCritForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="vd: Tính đổi mới sáng tạo"
                          style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      {/* Weight */}
                      <div>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                          Trọng số (0 – 1) *
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={critForm.weight}
                          onChange={e => setCritForm(f => ({ ...f, weight: e.target.value }))}
                          placeholder="0.25"
                          style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      {/* Description */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                          Mô tả
                        </label>
                        <input
                          value={critForm.description}
                          onChange={e => setCritForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Mô tả ngắn về tiêu chí này..."
                          style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      {/* Buttons */}
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => { setShowCritForm(false); setEditingCritId(null); setCritForm(EMPTY_CRIT); }}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                            padding: '7px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={critSaving}
                          style={{
                            background: 'var(--gradient-primary)',
                            border: 'none',
                            color: '#fff',
                            padding: '7px 20px',
                            borderRadius: '6px',
                            cursor: critSaving ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            boxShadow: 'var(--shadow-cyan)'
                          }}
                        >
                          {critSaving ? 'Đang lưu...' : editingCritId ? 'Cập nhật' : 'Thêm tiêu chí'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Criteria table */}
                  <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tên tiêu chí</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Mô tả</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Trọng số</th>
                          {!isActivated && (
                            <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Thao tác</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {criteria.length > 0 ? (
                          criteria.map(crit => (
                            <tr key={crit._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                              <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#fff', fontWeight: '600' }}>
                                {crit.name}
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                                {crit.description || <em style={{ opacity: 0.4 }}>N/A</em>}
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--cyan)', textAlign: 'right', fontWeight: 'bold' }}>
                                {Number(crit.weight).toFixed(2)}
                              </td>
                              {!isActivated && (
                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCritForm(crit)}
                                      style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#aaa',
                                        padding: '4px 10px',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'var(--cyan)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCrit(crit._id, crit.name)}
                                      style={{
                                        background: 'rgba(239,68,68,0.06)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        color: '#ef4444',
                                        padding: '4px 10px',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={isActivated ? 3 : 4} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              Chưa có tiêu chí nào. Nhấn <strong style={{ color: 'var(--cyan)' }}>＋ Thêm tiêu chí</strong> để bắt đầu.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Status checklist */}
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
                      onClick={() => setActiveTab('problems')}
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
                      ← Quay lại: Đề bài
                    </button>
                  </div>
                </div>
              </div>
            )}

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
