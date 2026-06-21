import React from 'react';
import StatusBadge from './StatusBadge';

export default function TiebreakAlert({ tiebreakGroups }) {
  if (!tiebreakGroups || tiebreakGroups.length === 0) {
    return null;
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return 'Chưa nộp';
    return new Date(timeStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRuleBadge = (rule) => {
    switch (rule) {
      case 'SUBMISSION_TIME':
        return <StatusBadge type="info" label="Xét thời gian nộp" />;
      case 'PENALTY_SCORE':
        return <StatusBadge type="warning" label="Xét điểm phạt" />;
      case 'COORDINATOR_DECISION':
        return <StatusBadge type="danger" label="BTC quyết định" />;
      default:
        return <StatusBadge type="neutral" label="Chưa áp dụng luật" />;
    }
  };

  return (
    <div
      className="tiebreak-alert-container"
      style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(245, 158, 11, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <span style={{ fontSize: '1.4rem' }}>⚠️</span>
        <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '1.1rem', fontWeight: 'bold' }}>
          CẢNH BÁO: PHÁT HIỆN ĐỒNG ĐIỂM TẠI RANH GIỚI TRANH VÉ VÀO VÒNG TRONG
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {tiebreakGroups.map((group, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(10, 14, 23, 0.4)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.95rem' }}>
                Bảng đấu: <span style={{ color: '#fff' }}>{group.group_name}</span> &mdash; Ranh giới: <span style={{ color: '#fff' }}>Top {group.boundary_rank}</span>
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Số lượng đội đồng điểm: <strong style={{ color: '#fff' }}>{group.tied_teams.length}</strong>
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.2)', paddingBottom: '6px' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Tên Đội</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Điểm số</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Điểm phạt</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Thời Gian Nộp</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Luật Phân Tranh</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tied_teams.map((team) => (
                    <tr
                      key={team.team_id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>
                        {team.team_name}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--cyan)', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'right' }}>
                        {team.weighted_avg_score.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#ef4444', fontWeight: '500', fontSize: '0.9rem', textAlign: 'right' }}>
                        {team.penalty_score > 0 ? `-${team.penalty_score}` : '0'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {formatTime(team.submission_time)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {getRuleBadge(team.tiebreak_rule)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {team.tiebreak_status === 'RESOLVED' && <StatusBadge type="success" label="Đã giải quyết" />}
                          {team.tiebreak_status === 'PENDING' && <StatusBadge type="warning" label="Đang chờ" />}
                          {team.tiebreak_status === 'ESCALATED' && <StatusBadge type="danger" label="Escalate BTC" />}
                          {!team.tiebreak_status && <StatusBadge type="neutral" label="Chưa xử lý" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
