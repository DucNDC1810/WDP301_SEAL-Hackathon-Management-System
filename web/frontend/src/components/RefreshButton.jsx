import { useState } from 'react';

const REFRESH_ICON_PATH = 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15';

/**
 * Nút "Làm mới" dùng chung cho các trang cần gọi lại hàm load dữ liệu
 * mà không reload cả trang (giữ nguyên state/scroll khác).
 *
 * Usage: <RefreshButton onRefresh={fetchData} />
 * onRefresh có thể là async — nút tự khoá và xoay icon trong lúc chờ.
 */
export default function RefreshButton({ onRefresh, label = 'Làm mới', size = 14, style = {} }) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      await onRefresh?.();
    } finally {
      setSpinning(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={spinning}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 8,
        border: '1px solid rgba(0,212,255,.25)',
        background: 'rgba(0,212,255,.06)',
        color: '#00d4ff',
        fontSize: 12,
        fontWeight: 700,
        cursor: spinning ? 'not-allowed' : 'pointer',
        opacity: spinning ? 0.7 : 1,
        transition: 'opacity .2s',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        width={size}
        height={size}
        style={{
          animation: spinning ? 'refresh-btn-spin 0.7s linear infinite' : 'none',
        }}
      >
        <path d={REFRESH_ICON_PATH} />
      </svg>
      <span>{spinning ? 'Đang tải...' : label}</span>
      <style>{`
        @keyframes refresh-btn-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
