import React from 'react';

export default function LeaderboardTable({ groupName, teams }) {
  const getRankClassAndStyle = (rank) => {
    if (rank === 1) {
      return {
        style: {
          background: "linear-gradient(90deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)",
          borderLeft: "4px solid #f59e0b",
        },
        badge: "🥇"
      };
    }
    if (rank === 2) {
      return {
        style: {
          background: "linear-gradient(90deg, rgba(148, 163, 184, 0.1) 0%, rgba(148, 163, 184, 0.02) 100%)",
          borderLeft: "4px solid #94a3b8",
        },
        badge: "🥈"
      };
    }
    if (rank === 3) {
      return {
        style: {
          background: "linear-gradient(90deg, rgba(180, 83, 9, 0.1) 0%, rgba(180, 83, 9, 0.02) 100%)",
          borderLeft: "4px solid #b45309",
        },
        badge: "🥉"
      };
    }
    return {
      style: {
        borderLeft: "4px solid transparent",
      },
      badge: rank.toString()
    };
  };

  return (
    <div className="leaderboard-table-card" style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "16px",
      padding: "24px",
      marginBottom: "32px",
      boxShadow: "var(--shadow-cyan)",
      backdropFilter: "blur(12px)",
      transition: "all var(--transition-base)"
    }}>
      <h3 className="group-title" style={{
        fontSize: "1.4rem",
        fontWeight: "bold",
        marginBottom: "20px",
        color: "var(--cyan)",
        fontFamily: "var(--font-display)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "10px"
      }}>
        <span style={{
          width: "6px",
          height: "20px",
          background: "var(--gradient-primary)",
          borderRadius: "4px",
          display: "inline-block"
        }}></span>
        Bảng: {groupName}
      </h3>
      <div style={{ overflowX: "auto" }}>
        <table className="leaderboard-table" style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0 8px",
          textAlign: "left"
        }}>
          <thead>
            <tr style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px" }}>
              <th style={{ padding: "12px 16px", fontWeight: "600", width: "80px" }}>STT</th>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Tên đội thi</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "right", width: "150px" }}>Điểm Trung Bình</th>
            </tr>
          </thead>
          <tbody>
            {teams && teams.length > 0 ? (
              teams.map((team, idx) => {
                const { style, badge } = getRankClassAndStyle(team.rank);
                return (
                  <tr
                    key={team.team_id}
                    style={{
                      transition: "transform var(--transition-fast), box-shadow var(--transition-fast)",
                      ...style
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.008) translateX(4px)";
                      e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 240, 255, 0.05)";
                      e.currentTarget.style.borderColor = "var(--border-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "var(--border)";
                    }}
                  >
                    <td style={{
                      padding: "16px",
                      borderRadius: "0px",
                      fontWeight: "bold",
                      fontSize: team.rank <= 3 ? "1.2rem" : "1rem",
                      background: "rgba(10, 14, 23, 0.3)",
                      borderTop: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: team.rank === 1 ? "rgba(245, 158, 11, 0.15)" : 
                                    team.rank === 2 ? "rgba(148, 163, 184, 0.15)" :
                                    team.rank === 3 ? "rgba(180, 83, 9, 0.15)" : "transparent",
                        color: team.rank === 1 ? "#f59e0b" : team.rank === 2 ? "#cbd5e1" : team.rank === 3 ? "#f97316" : "var(--text-secondary)"
                      }}>
                        {badge}
                      </div>
                    </td>
                    <td style={{
                      padding: "16px",
                      fontWeight: team.rank <= 3 ? "600" : "500",
                      background: "rgba(10, 14, 23, 0.3)",
                      borderTop: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                      color: team.rank === 1 ? "#f59e0b" : team.rank === 2 ? "#cbd5e1" : team.rank === 3 ? "#f97316" : "var(--text-primary)"
                    }}>
                      {team.team_name}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderRadius: "0 8px 8px 0",
                      textAlign: "right",
                      fontWeight: "bold",
                      fontFamily: "var(--font-display)",
                      fontSize: "1.1rem",
                      background: "rgba(10, 14, 23, 0.3)",
                      borderTop: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                      borderRight: "1px solid var(--border)",
                      color: team.rank === 1 ? "#f59e0b" : team.rank === 2 ? "#cbd5e1" : team.rank === 3 ? "#f97316" : "var(--cyan)"
                    }}>
                      {team.weighted_avg_score.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="3" style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  borderRadius: "8px",
                  background: "var(--bg-nest)",
                  border: "1px dashed var(--border)"
                }}>
                  Chưa có xếp hạng cho bảng đấu này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
