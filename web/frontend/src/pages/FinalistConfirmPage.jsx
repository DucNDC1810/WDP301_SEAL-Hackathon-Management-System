import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFinalists, updateTeamStatus, getAuditLog } from '../api/finalist';

export default function FinalistConfirmPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finalists, setFinalists] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [finalistsRes, logsRes] = await Promise.all([
        getFinalists(round_id),
        getAuditLog(round_id)
      ]);
      setFinalists(finalistsRes.data || []);
      setAuditLogs(logsRes.data || []);
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
      // Refetch both lists to update the UI
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || "Thao tác thay đổi trạng thái thất bại.");
    } finally {
      setActionLoading(false);
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
        }}>ĐANG TẢI DANH SÁCH CHUNG KẾT...</p>
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

  return (
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
          marginBottom: "32px",
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
            XÁC NHẬN DANH SÁCH CHUNG KẾT
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Xem xét và xác nhận hoặc loại các đội được chọn từ Top N và suất Wild Card
          </p>
        </header>

        {/* Finalist Cards Grid */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(12px)",
          marginBottom: "32px"
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            color: '#fff',
            marginBottom: '20px',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            borderLeft: '4px solid var(--cyan)',
            paddingLeft: '10px'
          }}>
            Đội đủ điều kiện chung kết ({finalists.length} đội)
          </h3>

          {finalists.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
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
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 0 15px rgba(16, 185, 129, 0.05)' : '0 0 15px rgba(239, 68, 68, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                  >
                    <div>
                      {/* Name & Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>
                          {team.team_name}
                        </h4>
                        {team.is_wildcard && (
                          <span style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#a855f7',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>
                            Wild Card
                          </span>
                        )}
                      </div>

                      {/* Detail Info */}
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        <p style={{ margin: '4px 0' }}>Bảng đấu: <strong style={{ color: '#fff' }}>{team.assigned_group}</strong></p>
                        <p style={{ margin: '4px 0' }}>Điểm trung bình: <strong style={{ color: 'var(--cyan)' }}>{team.weighted_avg_score.toFixed(2)}</strong></p>
                        <div style={{ margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Trạng thái:</span>
                          <span style={{
                            color: isActive ? '#10b981' : '#ef4444',
                            background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            {team.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        onClick={() => handleStatusChange(team.team_id, team.team_name, 'ACTIVE')}
                        disabled={isActive || actionLoading}
                        style={{
                          flex: 1,
                          background: isActive ? 'rgba(16, 185, 129, 0.05)' : '#10b981',
                          color: isActive ? 'rgba(255,255,255,0.3)' : 'white',
                          border: isActive ? '1px solid rgba(16, 185, 129, 0.2)' : 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          cursor: isActive ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? 'none' : '0 0 10px rgba(16, 185, 129, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive && !actionLoading) e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive && !actionLoading) e.currentTarget.style.opacity = '1';
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
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          cursor: !isActive ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: !isActive ? 'none' : '0 0 10px rgba(239, 68, 68, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          if (isActive && !actionLoading) e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          if (isActive && !actionLoading) e.currentTarget.style.opacity = '1';
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
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Không tìm thấy đội thi chung kết phù hợp.
            </div>
          )}
        </div>

        {/* Audit Log Panel */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(12px)"
        }}>
          <h3 style={{
            fontSize: '1.2rem',
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
                    const oldValStr = typeof log.old_value === 'object' ? log.old_value?.status : log.old_value;
                    const newValStr = typeof log.new_value === 'object' ? log.new_value?.status : log.new_value;
                    
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
                          Cập nhật trạng thái
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                          <span style={{
                            color: oldValStr === 'ACTIVE' ? '#10b981' : '#ef4444',
                            background: oldValStr === 'ACTIVE' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
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
                            color: newValStr === 'ACTIVE' ? '#10b981' : '#ef4444',
                            background: newValStr === 'ACTIVE' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
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

        {/* Back Button */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-start' }}>
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
  );
}
