import React from 'react';

const TYPE_STYLES = {
  success: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  danger: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  info: {
    background: 'rgba(6, 182, 212, 0.15)',
    color: '#06b6d4',
    border: '1px solid rgba(6, 182, 212, 0.3)',
  },
  neutral: {
    background: 'rgba(156, 163, 175, 0.15)',
    color: '#9ca3af',
    border: '1px solid rgba(156, 163, 175, 0.3)',
  },
};

export default function StatusBadge({ type = 'neutral', label }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.neutral;
  
  return (
    <span
      className={`status-badge status-badge--${type}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        ...style
      }}
    >
      {label}
    </span>
  );
}
