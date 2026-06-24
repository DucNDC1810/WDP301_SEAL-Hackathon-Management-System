/**
 * ReliabilityBadge — hiển thị badge màu cho chỉ số ICC / Krippendorff Alpha.
 * Props:
 *   value: Number | null
 *   label: string  (tên chỉ số, ví dụ "ICC" hoặc "Krippendorff α")
 */
export default function ReliabilityBadge({ value, label }) {
  const config = getConfig(value);
  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '16px 24px',
      borderRadius: 14,
      background: config.bg,
      border: `1px solid ${config.border}`,
      minWidth: 130,
    }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {label}
      </span>
      <span style={{ fontSize: '1.9rem', fontWeight: 800, color: config.color, lineHeight: 1 }}>
        {value !== null && value !== undefined ? value.toFixed(3) : '—'}
      </span>
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        color: config.color,
        background: config.tagBg,
        border: `1px solid ${config.border}`,
        padding: '2px 10px',
        borderRadius: 20,
      }}>
        {config.label}
      </span>
    </div>
  );
}

function getConfig(value) {
  if (value === null || value === undefined) {
    return {
      color: '#6b7280',
      bg: 'rgba(107,114,128,0.08)',
      border: 'rgba(107,114,128,0.2)',
      tagBg: 'rgba(107,114,128,0.12)',
      label: 'Chưa tính',
    };
  }
  if (value < 0.5) {
    return {
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.08)',
      border: 'rgba(239,68,68,0.25)',
      tagBg: 'rgba(239,68,68,0.12)',
      label: 'Kém',
    };
  }
  if (value <= 0.75) {
    return {
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.25)',
      tagBg: 'rgba(245,158,11,0.12)',
      label: 'Trung bình',
    };
  }
  return {
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
    tagBg: 'rgba(16,185,129,0.12)',
    label: 'Tốt',
  };
}
