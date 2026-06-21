import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWildCardCandidates } from '../api/wildcard';
import StatusBadge from '../components/StatusBadge';

export default function WildCardPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getWildCardCandidates(round_id)
      .then((res) => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err);
          const errMsg = err.response?.data?.message || err.message || "Đã xảy ra lỗi khi tải danh sách Wild Card.";
          setError(errMsg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [round_id]);

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
        }}>ĐANG TẢI THÔNG TIN WILD CARD...</p>
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

  const { eligible, reason, candidates, wildcard_count } = data || {};

  if (!eligible) {
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
          background: "rgba(245, 158, 11, 0.05)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          borderRadius: "16px",
          padding: "40px",
          maxWidth: "600px",
          boxShadow: "0 0 30px rgba(245, 158, 11, 0.1)",
          backdropFilter: "blur(12px)"
        }}>
          <span style={{ fontSize: "3.5rem", marginBottom: "16px", display: "block" }}>🔒</span>
          <h2 style={{
            color: "#f59e0b",
            fontFamily: "var(--font-display)",
            marginBottom: "16px",
            fontSize: "1.6rem",
            letterSpacing: "1px"
          }}>WILD CARD CHƯA ĐƯỢC KÍCH HOẠT</h2>
          <p style={{
            color: "var(--text-secondary)",
            marginBottom: "28px",
            lineHeight: "1.7",
            fontSize: "0.95rem"
          }}>
            {reason || "Giải đấu hoặc vòng thi hiện tại chưa cấu hình kích hoạt tính năng vé vớt Wild Card."}
          </p>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: "white",
              padding: "10px 24px",
              borderRadius: "8px",
              fontWeight: "600",
              border: "1px solid var(--border)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.borderColor = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            Quay lại
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
            DANH SÁCH VÉ VỚT (WILD CARD)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Xem đề xuất các đội thi nhận vé vớt dựa trên điểm số cao nhất trong các đội không đạt Top N
          </p>
        </header>

        {/* Global & Round status Banner */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>🟢</span>
            <div>
              <h4 style={{ margin: 0, color: '#10b981', fontSize: '0.95rem', fontWeight: 'bold' }}>
                WILD CARD ĐANG HOẠT ĐỘNG
              </h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Điều kiện: Kích hoạt ở cả Global (Contest) và Round level
              </p>
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Số lượng suất vé vớt (wildcard_count): <strong style={{ color: '#fff' }}>{wildcard_count}</strong>
            </span>
          </div>
        </div>

        {/* Candidates Table */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(12px)"
        }}>
          
          <h3 style={{
            fontSize: '1.1rem',
            color: '#fff',
            marginBottom: '18px',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            borderLeft: '4px solid var(--cyan)',
            paddingLeft: '10px'
          }}>
            Đội thi đề cử ({candidates.length} đội)
          </h3>

          {candidates.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                    <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>STT</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>Tên Đội</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>Bảng Đấu</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", textAlign: "right" }}>Điểm Trung Bình</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", textAlign: "right" }}>Hạng Trong Bảng</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate, index) => (
                    <tr
                      key={candidate.team_id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "0.9rem" }}>
                        #{index + 1}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.9rem" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{candidate.team_name}</span>
                          <span
                            style={{
                              background: 'rgba(168, 85, 247, 0.15)',
                              color: '#a855f7',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              textTransform: 'uppercase'
                            }}
                          >
                            Wild Card
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {candidate.assigned_group}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--cyan)", fontWeight: "bold", fontSize: "0.95rem", textAlign: "right" }}>
                        {candidate.weighted_avg_score.toFixed(2)}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--orange)", fontWeight: "600", fontSize: "0.9rem", textAlign: "right" }}>
                        Hạng {candidate.rank_in_group}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.95rem"
            }}>
              Không tìm thấy ứng cử viên nào đáp ứng tiêu chuẩn Wild Card.
            </div>
          )}

          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem'
          }}>
            <span>ℹ️</span>
            <span>Danh sách đề xuất &mdash; Coordinator xác nhận cuối cùng</span>
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
