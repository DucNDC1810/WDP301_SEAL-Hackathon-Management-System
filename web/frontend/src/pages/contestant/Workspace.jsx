import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThreeJSBackground from './ThreeJSBackground';

export default function Workspace() {
  const navigate = useNavigate();

  return (
    <div className="cd-page">
      <div className="cd-page__bg">
        <ThreeJSBackground />
      </div>
      <div className="cd-header">
        <div className="cd-header__logo">
          <span className="cd-header__logo-text">HACKATHON WORKSPACE</span>
        </div>
        <button className="cd-header__logout" onClick={() => navigate('/contestant')}>
          Quay lại Cài đặt
        </button>
      </div>
      <main className="cd-main" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h1 style={{ color: 'white', fontSize: '36px', fontFamily: 'var(--font-display)' }}>
          CHÀO MỪNG ĐẾN VỚI TRANG CHỦ THÍ SINH
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '20px', fontSize: '18px' }}>
          Bạn đã hoàn tất đăng ký và nộp bài. Hãy chuẩn bị sẵn sàng cho cuộc thi!
        </p>
      </main>
    </div>
  );
}
