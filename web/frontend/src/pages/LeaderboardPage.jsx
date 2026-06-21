import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeaderboard, getTiebreakStatus } from '../api/leaderboard';
import { getWildCardCandidates } from '../api/wildcard';
import LeaderboardTable from '../components/LeaderboardTable';
import TiebreakAlert from '../components/TiebreakAlert';

export default function LeaderboardPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeGroup, setActiveGroup] = useState("");
  const [tiebreakGroups, setTiebreakGroups] = useState([]);
  const [wildcardEligible, setWildcardEligible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getLeaderboard(round_id)
      .then((res) => {
        if (isMounted) {
          setData(res.data);
          if (res.data.groups && res.data.groups.length > 0) {
            setActiveGroup(res.data.groups[0].group_name);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err);
          const errMsg = err.response?.data?.message || err.message || "Đã xảy ra lỗi khi tải bảng xếp hạng.";
          setError(errMsg);
          setLoading(false);
        }
      });

    getTiebreakStatus(round_id)
      .then((res) => {
        if (isMounted && res.data && res.data.success) {
          setTiebreakGroups(res.data.tiebreak_groups || []);
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải trạng thái phân tranh (bỏ qua):", err);
      });

    getWildCardCandidates(round_id)
      .then((res) => {
        if (isMounted) {
          setWildcardEligible(res.data?.eligible || false);
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải trạng thái Wild Card (bỏ qua):", err);
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
        }}>ĐANG TẢI BẢNG XẾP HẠNG...</p>
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
          }}>LỖI TRUY CẬP</h2>
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

  const activeGroupData = data?.groups?.find(g => g.group_name === activeGroup);

  return (
    <div style={{
      background: "var(--bg-primary)",
      minHeight: "100vh",
      padding: "40px 24px",
      color: "var(--text-primary)"
    }}>
      <div className="container" style={{ maxWidth: "1000px" }}>
        
        {/* Header */}
        <header style={{
          textAlign: "center",
          marginBottom: "40px",
          position: "relative"
        }}>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: "800",
            letterSpacing: "2px",
            marginBottom: "12px",
            fontFamily: "var(--font-display)",
            textTransform: "uppercase"
          }} className="gradient-text glow-text">
            BẢNG XẾP HẠNG CHÍNH THỨC
          </h1>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(0, 240, 255, 0.07)",
            border: "1px solid var(--border)",
            padding: "6px 16px",
            borderRadius: "20px",
            fontSize: "0.95rem",
            fontWeight: "500",
            color: "var(--cyan)",
            boxShadow: "0 0 15px rgba(0, 240, 255, 0.05)"
          }}>
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--green)",
              boxShadow: "0 0 8px var(--green)"
            }}></span>
            Vòng thi: {data?.round_name || "Sơ loại"}
          </div>

          {wildcardEligible && (
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => navigate(`/wildcard/${round_id}`)}
                style={{
                  background: 'rgba(168, 85, 247, 0.12)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 12px rgba(168, 85, 247, 0.1)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                  e.currentTarget.style.borderColor = '#a855f7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                }}
              >
                🔮 Xem Danh Sách Vé Vớt (Wild Card)
              </button>
            </div>
          )}
        </header>

        <TiebreakAlert tiebreakGroups={tiebreakGroups} />

        {/* Group Tabs Selection */}
        {data?.groups && data.groups.length > 0 ? (
          <>
            {data.groups.length > 1 && (
              <div className="tabs-container" style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "32px",
                borderBottom: "1px solid rgba(0, 240, 255, 0.1)",
                paddingBottom: "16px"
              }}>
                {data.groups.map((group) => {
                  const isActive = group.group_name === activeGroup;
                  return (
                    <button
                      key={group.group_name}
                      onClick={() => setActiveGroup(group.group_name)}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "0.95rem",
                        transition: "all var(--transition-fast)",
                        background: isActive ? "var(--gradient-primary)" : "rgba(17, 24, 39, 0.5)",
                        color: isActive ? "white" : "var(--text-secondary)",
                        border: isActive ? "1px solid transparent" : "1px solid var(--border)",
                        boxShadow: isActive ? "var(--shadow-cyan)" : "none"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = "var(--cyan)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }
                      }}
                    >
                      Bảng {group.group_name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Table Rendering */}
            {activeGroupData ? (
              <div className="animate-fade-in" style={{
                animation: "fadeIn 0.3s ease-out"
              }}>
                <LeaderboardTable
                  groupName={activeGroupData.group_name}
                  teams={activeGroupData.teams}
                />
              </div>
            ) : (
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)"
              }}>
                Không tìm thấy dữ liệu cho bảng đã chọn.
              </div>
            )}
          </>
        ) : (
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "60px 40px",
            textAlign: "center",
            boxShadow: "var(--shadow-cyan)",
            backdropFilter: "blur(12px)"
          }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "16px" }}>🏆</span>
            <h3 style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
              fontSize: "1.3rem",
              marginBottom: "8px"
            }}>Chưa có kết quả thi đấu</h3>
            <p style={{ color: "var(--text-secondary)" }}>
              Kết quả xếp hạng của vòng thi này chưa được cập nhật. Vui lòng quay lại sau.
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
