import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../contestant/ContestantDashboard.css'; // Reusing Cyberpunk layout

function Leaderboard() {
  const [rankings, setRankings] = useState([
    { id: '1', rank: 1, team_name: 'Cyber Punx', score: 95.5, ai_feedback: 'Code tối ưu cực tốt. Kiến trúc tuyệt vời.' },
    { id: '2', rank: 2, team_name: 'Neon Runners', score: 92.0, ai_feedback: 'UI/UX xuất sắc nhưng cần tối ưu database.' },
    { id: '3', rank: 3, team_name: 'Byte Bashers', score: 88.5, ai_feedback: 'Ý tưởng sáng tạo, cần cải thiện demo.' },
    { id: '4', rank: 4, team_name: 'Null Pointers', score: 85.0, ai_feedback: 'Thiếu pitch deck, code khá ổn.' },
  ]);

  return (
    <div className="cd-page" style={{ minHeight: '100vh', overflowY: 'auto' }}>
      <div className="cd-page__bg">
        <div className="cd-page__grid-lines" />
        <div className="cd-page__glow cd-page__glow--1" />
        <div className="cd-page__glow cd-page__glow--2" />
      </div>

      <header className="cd-header">
        <Link to="/" className="cd-header__logo">
          <span className="cd-header__logo-icon">⬡</span>
          <span className="cd-header__logo-text">SEAL Leaderboard</span>
        </Link>
        <div className="cd-header__user">
          <Link to="/login" className="admin-btn-primary" style={{ textDecoration: 'none' }}>
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="cd-main" style={{ maxWidth: '900px', margin: '40px auto' }}>
        <div className="cd-welcome" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="gradient-text" style={{ fontSize: '3rem', margin: 0 }}>
            BẢNG VÀNG THÀNH TÍCH
          </h1>
          <p className="cd-welcome__subtitle">Siêu cúp Hackathon 2026 - AI Powered Review</p>
        </div>

        <div className="cd-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '15px 20px', color: 'var(--text-secondary)' }}>Hạng</th>
                <th style={{ padding: '15px 20px', color: 'var(--text-secondary)' }}>Đội Thi</th>
                <th style={{ padding: '15px 20px', color: 'var(--text-secondary)' }}>Điểm Số</th>
                <th style={{ padding: '15px 20px', color: 'var(--text-secondary)' }}>AI Nhận Xét Nhanh</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((team) => (
                <tr key={team.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.3s' }}>
                  <td style={{ padding: '15px 20px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {team.rank === 1 ? '🥇 ' : team.rank === 2 ? '🥈 ' : team.rank === 3 ? '🥉 ' : `#${team.rank}`}
                  </td>
                  <td style={{ padding: '15px 20px', color: 'var(--primary)', fontWeight: 'bold' }}>
                    {team.team_name}
                  </td>
                  <td style={{ padding: '15px 20px', fontSize: '1.5rem', color: '#fff', textShadow: '0 0 10px var(--primary)' }}>
                    {team.score}
                  </td>
                  <td style={{ padding: '15px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {team.ai_feedback}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default Leaderboard;
