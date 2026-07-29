import React from 'react';

const styles = `
  .podium-wrapper {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 20px;
    margin: 40px auto 40px;
    max-width: 680px;
    padding: 24px;
    background: rgba(10, 19, 34, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 24px;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  .podium-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    max-width: 180px;
  }
  
  .podium-item:hover {
    transform: translateY(-8px);
  }
  
  .podium-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin-bottom: 12px;
    position: relative;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    z-index: 2;
  }
  
  .podium-item.gold .podium-avatar {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
    border: 2px solid #fbbf24;
  }
  
  .podium-item.silver .podium-avatar {
    background: linear-gradient(135deg, #cbd5e1 0%, #64748b 100%);
    box-shadow: 0 0 15px rgba(203, 213, 225, 0.3);
    border: 2px solid #f1f5f9;
  }
  
  .podium-item.bronze .podium-avatar {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    box-shadow: 0 0 15px rgba(249, 115, 22, 0.3);
    border: 2px solid #ff9d5c;
  }
  
  .podium-crown {
    position: absolute;
    top: -24px;
    font-size: 1.8rem;
    animation: bounce 2s infinite alternate;
    z-index: 3;
  }
  
  @keyframes bounce {
    0% { transform: translateY(0) scale(1); }
    100% { transform: translateY(-4px) scale(1.05); }
  }
  
  .podium-team-name {
    font-weight: 700;
    font-size: 0.95rem;
    text-align: center;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
    color: #fff;
  }
  
  .podium-item.gold .podium-team-name {
    color: #fbbf24;
    text-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
    font-size: 1.05rem;
  }
  
  .podium-score {
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    margin-bottom: 12px;
    color: var(--cyan);
  }
  
  .podium-item.gold .podium-score {
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.15);
  }
  
  .podium-stand {
    width: 100%;
    border-radius: 16px 16px 8px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  
  .podium-item.gold .podium-stand {
    height: 150px;
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.05) 100%);
    border-color: rgba(245, 158, 11, 0.3);
    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.1);
  }
  
  .podium-item.silver .podium-stand {
    height: 110px;
    background: linear-gradient(180deg, rgba(203, 213, 225, 0.2) 0%, rgba(203, 213, 225, 0.05) 100%);
    border-color: rgba(203, 213, 225, 0.3);
    box-shadow: 0 8px 24px rgba(203, 213, 225, 0.08);
  }
  
  .podium-item.bronze .podium-stand {
    height: 80px;
    background: linear-gradient(180deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.05) 100%);
    border-color: rgba(249, 115, 22, 0.3);
    box-shadow: 0 8px 24px rgba(249, 115, 22, 0.08);
  }
  
  .podium-number {
    font-size: 4rem;
    font-weight: 900;
    line-height: 1;
    user-select: none;
  }
  
  .podium-item.gold .podium-number {
    color: rgba(245, 158, 11, 0.85);
    text-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
  }
  
  .podium-item.silver .podium-number {
    color: rgba(203, 213, 225, 0.8);
    text-shadow: 0 0 10px rgba(203, 213, 225, 0.4);
  }
  
  .podium-item.bronze .podium-number {
    color: rgba(249, 115, 22, 0.85);
    text-shadow: 0 0 10px rgba(249, 115, 22, 0.4);
  }
`;

export default function LeaderboardTable({ groupName, teams }) {
  const getRankClassAndStyle = (rank) => {
    return {
      style: {
        borderLeft: "4px solid transparent",
      },
      badge: rank.toString()
    };
  };

  const team1 = teams && teams[0];
  const team2 = teams && teams[1];
  const team3 = teams && teams[2];
  const restTeams = teams ? teams.slice(3) : [];

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
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
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
        {groupName === 'Kết quả chung cuộc' ? groupName : `Bảng: ${groupName}`}
      </h3>

      {teams && teams.length > 0 ? (
        <div>
          {/* Podium for top 3 */}
          <div className="podium-wrapper">
            {/* Rank 2 (Silver) */}
            {team2 ? (
              <div className="podium-item silver">
                <span className="podium-crown">🥈</span>
                <div className="podium-avatar">🥈</div>
                <div className="podium-team-name" title={team2.team_name}>{team2.team_name}</div>
                <div className="podium-score">{team2.weighted_avg_score.toFixed(2)}</div>
                <div className="podium-stand">
                  <span className="podium-number">2</span>
                </div>
              </div>
            ) : (
              <div className="podium-item silver" style={{ opacity: 0.1, pointerEvents: 'none' }}>
                <div className="podium-stand" style={{ height: 110 }} />
              </div>
            )}

            {/* Rank 1 (Gold) */}
            {team1 ? (
              <div className="podium-item gold">
                <span className="podium-crown" style={{ top: '-28px', fontSize: '2.2rem' }}>👑</span>
                <div className="podium-avatar">🥇</div>
                <div className="podium-team-name" title={team1.team_name}>{team1.team_name}</div>
                <div className="podium-score">{team1.weighted_avg_score.toFixed(2)}</div>
                <div className="podium-stand">
                  <span className="podium-number">1</span>
                </div>
              </div>
            ) : (
              <div className="podium-item gold" style={{ opacity: 0.1, pointerEvents: 'none' }}>
                <div className="podium-stand" style={{ height: 150 }} />
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {team3 ? (
              <div className="podium-item bronze">
                <span className="podium-crown">🥉</span>
                <div className="podium-avatar">🥉</div>
                <div className="podium-team-name" title={team3.team_name}>{team3.team_name}</div>
                <div className="podium-score">{team3.weighted_avg_score.toFixed(2)}</div>
                <div className="podium-stand">
                  <span className="podium-number">3</span>
                </div>
              </div>
            ) : (
              <div className="podium-item bronze" style={{ opacity: 0.1, pointerEvents: 'none' }}>
                <div className="podium-stand" style={{ height: 80 }} />
              </div>
            )}
          </div>

          {/* Table for Rank 4+ */}
          {restTeams.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: "24px" }}>
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
                  {restTeams.map((team, idx) => {
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
                          fontSize: "1rem",
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
                            background: "transparent",
                            color: "var(--text-secondary)"
                          }}>
                            {badge}
                          </div>
                        </td>
                        <td style={{
                          padding: "16px",
                          fontWeight: "500",
                          background: "rgba(10, 14, 23, 0.3)",
                          borderTop: "1px solid var(--border)",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--text-primary)"
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
                          color: "var(--cyan)"
                        }}>
                          {team.weighted_avg_score.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--text-muted)",
          borderRadius: "8px",
          background: "var(--bg-nest)",
          border: "1px dashed var(--border)"
        }}>
          Chưa có xếp hạng cho bảng đấu này.
        </div>
      )}
    </div>
  );
}
