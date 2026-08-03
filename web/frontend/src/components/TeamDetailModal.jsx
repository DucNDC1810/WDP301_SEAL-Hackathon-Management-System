import React, { useEffect, useState } from 'react';
import { getTeamRankingDetail } from '../api/ranking';

export function Avatar({ name, url, size = 40 }) {
  const initials = (name || '?').trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,240,255,0.25)' }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.25)',
      color: 'var(--cyan)', fontWeight: 700, fontSize: size * 0.38,
    }}>
      {initials || '?'}
    </div>
  );
}

/**
 * Modal chi tiết 1 đội thi (dùng chung cho các trang xếp hạng: TeamRankingPage, ResultsPage...).
 * Tự fetch dữ liệu qua GET /api/ranking/teams/:team_id/detail khi teamId thay đổi.
 */
export default function TeamDetailModal({ teamId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    getTeamRankingDetail(teamId)
      .then((res) => setDetail(res.data?.data))
      .catch((err) => setError(err.response?.data?.message || 'Không thể tải chi tiết đội thi.'))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (!teamId) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(17,24,39,0.97)', border: '1px solid rgba(0,240,255,0.2)',
          borderRadius: 16, maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto',
          padding: 28, boxShadow: '0 0 30px rgba(0,240,255,0.15)', backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--cyan)', fontSize: '1.3rem', margin: 0 }}>
            Chi tiết đội thi
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {loading && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>Đang tải...</p>
        )}

        {error && !loading && (
          <p style={{ color: 'var(--red)', textAlign: 'center', padding: '20px 0' }}>{error}</p>
        )}

        {detail && !loading && !error && (
          <div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', margin: '0 0 4px 0' }}>{detail.team_name}</h3>
            {detail.assigned_group && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 12px 0' }}>
                Bảng: {detail.assigned_group}
              </p>
            )}
            {detail.topic && (
              <div style={{ background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.12)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4 }}>Chủ đề</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{detail.topic.title}</div>
                {detail.topic.description && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>{detail.topic.description}</div>
                )}
              </div>
            )}

            <div style={{ fontSize: '0.85rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 10 }}>
              Thành viên ({(detail.members?.length || 0) + (detail.leader ? 1 : 0)})
            </div>

            {detail.leader && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <Avatar name={detail.leader.full_name} url={detail.leader.avatar_url} />
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{detail.leader.full_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Trưởng nhóm</div>
                </div>
              </div>
            )}

            {(detail.members || [])
              .filter((m) => m.full_name !== detail.leader?.full_name)
              .map((m, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <Avatar name={m.full_name} url={m.avatar_url} />
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.full_name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Thành viên</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
