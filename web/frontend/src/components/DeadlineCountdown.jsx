import { useEffect, useState, useCallback } from 'react';

/**
 * DeadlineCountdown
 * Props:
 *   deadline  — ISO date string or Date object
 *   onExpired — optional callback triggered when the countdown hits zero
 */
export default function DeadlineCountdown({ deadline, onExpired }) {
  const calcRemaining = useCallback(() => {
    if (!deadline) return null;
    return Math.max(0, new Date(deadline).getTime() - Date.now());
  }, [deadline]);

  const [remaining, setRemaining] = useState(calcRemaining());

  useEffect(() => {
    if (!deadline) return;

    const tick = () => {
      const ms = calcRemaining();
      setRemaining(ms);
      if (ms === 0) {
        clearInterval(timerId);
        // Auto-reload so FE syncs is_locked from BE
        onExpired ? onExpired() : window.location.reload();
      }
    };

    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [deadline, calcRemaining, onExpired]);

  if (remaining === null) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  const isUrgent = remaining < 10 * 60 * 1000; // < 10 minutes
  const isExpired = remaining === 0;

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '10px',
    background: isExpired
      ? 'rgba(239,68,68,0.15)'
      : isUrgent
        ? 'rgba(239,68,68,0.1)'
        : 'rgba(99,102,241,0.1)',
    border: `1px solid ${isExpired || isUrgent ? '#ef4444' : '#6366f1'}`,
    fontSize: '0.95rem',
    fontFamily: "'Be Vietnam Pro', 'Inter', monospace",
    color: isExpired || isUrgent ? '#ef4444' : '#a5b4fc',
    transition: 'all 0.3s ease',
  };

  const timerStyle = {
    fontWeight: 700,
    fontSize: '1.1rem',
    letterSpacing: '0.05em',
    fontVariantNumeric: 'tabular-nums',
    color: isExpired || isUrgent ? '#f87171' : '#c7d2fe',
  };

  if (isExpired) {
    return (
      <div style={containerStyle}>
        <span>⏰</span>
        <span style={timerStyle}>Đã hết giờ</span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <span>{isUrgent ? '🔴' : '⏱️'}</span>
      <span>Còn lại:</span>
      <span style={timerStyle}>
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
      {isUrgent && (
        <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600 }}>
          — Sắp hết hạn!
        </span>
      )}
    </div>
  );
}
