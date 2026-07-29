import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoundSetup, assignJudges, activateRound } from '../api/round';
import { useRoundStatus } from '../hooks/useRoundStatus';
import { FrozenOverlay } from '../components/FrozenOverlay';
import { notification, Modal } from 'antd';
import RefreshButton from '../components/RefreshButton';

export default function RoundActivatePage() {
  const { round_id } = useParams();
  const navigate = useNavigate();
  const { isFrozen } = useRoundStatus(round_id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [round, setRound] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [assignedJudges, setAssignedJudges] = useState([]);
  const [allAvailableJudges, setAllAvailableJudges] = useState([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [weightValid, setWeightValid] = useState(false);
  const [selectedJudgeIds, setSelectedJudgeIds] = useState([]);
  const [savingJudges, setSavingJudges] = useState(false);
  const [activating, setActivating] = useState(false);

  const loadSetup = async () => {
    try {
      const res = await getRoundSetup(round_id);
      const data = res.data;
      setRound(data.round);
      setCriteria(data.criteria || []);
      setAssignedJudges(data.judges || []);
      setAllAvailableJudges(data.all_available_judges || []);
      setTotalWeight(data.total_weight || 0);
      setWeightValid(data.weight_valid || false);
      
      // Initialize selected judge IDs from currently assigned judges
      const ids = (data.judges || []).map(j => j._id);
      setSelectedJudgeIds(ids);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Không thể tải dữ liệu kích hoạt vòng thi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetup();
  }, [round_id]);

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
      notification.success({
        message: 'Thành công',
        description: 'Lưu phân công Hội đồng Ban giám khảo thành công!',
      });
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
        description: 'Tổng trọng số của tiêu chí chấm điểm phải bằng chính xác 1.0!',
      });
      return;
    }
    if (assignedJudges.length === 0) {
      notification.warning({
        message: 'Thiếu ban giám khảo',
        description: 'Vui lòng phân công ít nhất 1 Judge trước khi kích hoạt!',
      });
      return;
    }

    Modal.confirm({
      title: 'Kích hoạt Vòng thi?',
      content: `Kích hoạt ${round?.name || 'vòng thi'}? Sau khi kích hoạt, vòng thi này sẽ chính thức bắt đầu và BGK có thể tiến hành chấm điểm.`,
      okText: 'Kích hoạt',
      cancelText: 'Hủy',
      onOk: async () => {
        setActivating(true);
        try {
          const res = await activateRound(round_id);
          if (res.data.success) {
            setRound(prev => ({ ...prev, is_active: true }));
            notification.success({
              message: 'Thành công',
              description: '🎉 Vòng thi đã được kích hoạt thành công!',
            });
            setTimeout(() => {
              const cId = round?.contest_id?._id || round?.contest_id;
              if (cId) {
                navigate(`/admin/hackathons/${cId}`);
              } else {
                navigate(`/admin/hackathons`);
              }
            }, 1500);
          }
        } catch (err) {
          console.error(err);
          const serverErr = err.response?.data?.error;
          const serverMsg = err.response?.data?.message;
          if (serverErr === 'WEIGHT_INVALID') {
            notification.error({
              message: 'Kích hoạt thất bại',
              description: `Tổng trọng số tiêu chí không hợp lệ (${err.response?.data?.total_weight})`,
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
        }}>ĐANG TẢI THIẾT LẬP VÒNG THI...</p>
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
          }}>LỖI THIẾT LẬP</h2>
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

  return (
    <FrozenOverlay isActive={isFrozen}>
    <div style={{
      background: "var(--bg-primary)",
      minHeight: "100vh",
      padding: "40px 24px",
      color: "var(--text-primary)"
    }}>
      <div className="container" style={{ maxWidth: "1000px", margin: "0 auto" }}>
        
        {/* Header */}
        <header style={{
          textAlign: "center",
          marginBottom: "36px",
          position: "relative"
        }}>
          <h1 style={{
            fontSize: "2.3rem",
            fontWeight: "800",
            letterSpacing: "2px",
            marginBottom: "12px",
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            color: "#fff",
            textShadow: "0 0 10px rgba(0, 240, 255, 0.4)"
          }}>
            KÍCH HOẠT {round?.name ? round.name.toUpperCase() : 'VÒNG THI'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Thiết lập Hội đồng Ban giám khảo độc lập và kiểm tra tiêu chí chấm điểm cho vòng thi: <strong style={{ color: 'var(--cyan)' }}>{round?.name}</strong>
          </p>

          <div style={{ marginTop: '14px' }}>
            <span style={{
              color: isActivated ? '#10b981' : '#f59e0b',
              background: isActivated ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${isActivated ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: isActivated ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'none'
            }}>
              Trạng thái: {isActivated ? "ĐÃ KÍCH HOẠT (Đang chạy)" : "CHƯA KÍCH HOẠT (Đang chờ)"}
            </span>
          </div>
          <div style={{ marginTop: '14px' }}>
            <RefreshButton onRefresh={loadSetup} />
          </div>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* SECTION 1 - Phân công Judge */}
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <h3 style={{
                fontSize: '1.15rem',
                color: '#fff',
                marginBottom: '10px',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                borderLeft: '4px solid var(--cyan)',
                paddingLeft: '10px'
              }}>
                Hội đồng Ban giám khảo (Judges)
              </h3>
              

              {/* Selector List */}
              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.15)',
                marginBottom: '16px'
              }}>
                {allAvailableJudges.length > 0 ? (
                  allAvailableJudges.map(judge => {
                    const isChecked = selectedJudgeIds.includes(judge._id);
                    return (
                      <label
                        key={judge._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isChecked ? 'rgba(0, 240, 255, 0.04)' : 'transparent',
                          transition: 'background 0.2s',
                          borderBottom: '1px solid rgba(255,255,255,0.02)'
                        }}
                        onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                        onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleJudgeCheckboxChange(judge._id)}
                          style={{
                            cursor: 'pointer',
                            accentColor: 'var(--cyan)',
                            width: '16px',
                            height: '16px'
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isChecked ? 'var(--cyan)' : '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {judge.full_name}
                            {judge.roles?.some(r => r.role_name === 'mentor') && (
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                color: 'var(--purple)',
                                background: 'rgba(168, 85, 247, 0.1)',
                                border: '1px solid rgba(168, 85, 247, 0.25)',
                                borderRadius: '4px',
                                padding: '1px 6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Mentor
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {judge.email}
                          </div>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Không có giám khảo nào được đăng ký trong hệ thống.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                <span>Đã chọn: <strong style={{ color: 'var(--cyan)' }}>{selectedJudgeIds.length}</strong> giám khảo</span>
                <span>Hiện tại đang gán: <strong style={{ color: '#fff' }}>{assignedJudges.length}</strong></span>
              </div>

              <button
                onClick={handleSaveJudges}
                disabled={savingJudges || isActivated}
                style={{
                  width: '100%',
                  background: isActivated ? 'rgba(255,255,255,0.05)' : 'rgba(0, 240, 255, 0.1)',
                  color: isActivated ? 'rgba(255,255,255,0.2)' : 'var(--cyan)',
                  border: `1px solid ${isActivated ? 'rgba(255,255,255,0.1)' : 'rgba(0, 240, 255, 0.3)'}`,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: (savingJudges || isActivated) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isActivated ? 'none' : '0 0 10px rgba(0, 240, 255, 0.05)'
                }}
                onMouseEnter={(e) => {
                  if (!savingJudges && !isActivated) {
                    e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)';
                    e.currentTarget.style.borderColor = 'var(--cyan)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!savingJudges && !isActivated) {
                    e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                  }
                }}
              >
                {savingJudges ? 'Đang lưu...' : 'Lưu phân công BGK'}
              </button>
            </div>
          </div>

          {/* SECTION 2 - Criteria & Kích hoạt */}
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <h3 style={{
                fontSize: '1.15rem',
                color: '#fff',
                marginBottom: '16px',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                borderLeft: '4px solid var(--purple)',
                paddingLeft: '10px'
              }}>
                Tiêu chí chấm điểm (Criteria)
              </h3>

              {/* Table of Criteria */}
              <div style={{ marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tên tiêu chí</th>
                      <th style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Trọng số</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.length > 0 ? (
                      criteria.map((crit) => (
                        <tr key={crit._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                          <td style={{ padding: '10px 10px', fontSize: '0.85rem', color: '#fff' }}>
                            <div>{crit.name}</div>
                            {crit.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{crit.description}</div>}
                          </td>
                          <td style={{ padding: '10px 10px', fontSize: '0.85rem', color: 'var(--cyan)', textAlign: 'right', fontWeight: 'bold' }}>
                            {crit.weight.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Chưa có tiêu chí chấm điểm nào được tạo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Weight Status */}
              <div style={{
                background: weightValid ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                border: `1px solid ${weightValid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tổng trọng số hiện tại:</span>
                  <span style={{ marginLeft: '8px', fontSize: '1rem', fontWeight: 'bold', color: weightValid ? '#10b981' : '#ef4444' }}>
                    {totalWeight.toFixed(2)}
                  </span>
                </div>
                {!weightValid && (
                  <span style={{
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    ⚠️ Chưa đạt 1.0
                  </span>
                )}
              </div>
            </div>

            <div>
              {/* Warnings and Requirements */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: weightValid ? '#10b981' : '#ef4444' }}>{weightValid ? '✓' : '✗'}</span>
                  <span>Tổng trọng số tiêu chí bằng chính xác 1.0</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ color: assignedJudges.length > 0 ? '#10b981' : '#ef4444' }}>{assignedJudges.length > 0 ? '✓' : '✗'}</span>
                  <span>Đã phân công ít nhất 1 Giám khảo (Hiện tại: {assignedJudges.length})</span>
                </div>
              </div>

              <button
                onClick={handleActivateRound}
                disabled={!weightValid || assignedJudges.length === 0 || isActivated || activating}
                style={{
                  width: '100%',
                  background: (isActivated || !weightValid || assignedJudges.length === 0) ? 'rgba(255,255,255,0.05)' : 'var(--gradient-primary)',
                  color: (isActivated || !weightValid || assignedJudges.length === 0) ? 'rgba(255,255,255,0.2)' : 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: (!weightValid || assignedJudges.length === 0 || isActivated || activating) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (isActivated || !weightValid || assignedJudges.length === 0) ? 'none' : 'var(--shadow-cyan)'
                }}
                onMouseEnter={(e) => {
                  if (weightValid && assignedJudges.length > 0 && !isActivated && !activating) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (weightValid && assignedJudges.length > 0 && !isActivated && !activating) {
                    e.currentTarget.style.transform = 'none';
                  }
                }}
              >
                {activating ? 'Đang kích hoạt...' : isActivated ? 'Vòng thi Đã Kích hoạt' : '🚀 Kích hoạt Vòng thi'}
              </button>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: "600",
              border: "1px solid var(--border)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            Quay lại trang trước
          </button>
        </div>

      </div>
    </div>
    </FrozenOverlay>
  );
}
