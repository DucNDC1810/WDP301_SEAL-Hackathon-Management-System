// Bảng màu dùng chung cho các trang student (Overview, Profile, Results, Submit, Team)
// theo theme hiện tại. Gọi getStudentColors(theme) bên trong component (không phải
// module-level) để màu đổi ngay khi user bấm toggle theme trong StudentLayout.

const DARK = {
  bg: '#070b14', card: '#0c1524', card2: '#0d1825', line: '#1b2740', line2: '#162036',
  text: '#e6eef9', text2: '#c9d6e8', muted: '#7e90ab', dim: '#5a708f',
  cyan: '#00d4ff', purple: '#7c3aed', purple2: '#a855f7',
  green: '#22c55e', amber: '#f59e0b', gold: '#facc15', red: '#f87171',
};

const LIGHT = {
  bg: '#f0f4f8', card: '#ffffff', card2: '#f8fafc', line: '#e2e8f0', line2: '#e2e8f0',
  text: '#0f172a', text2: '#334155', muted: '#64748b', dim: '#94a3b8',
  cyan: '#0098b5', purple: '#7c3aed', purple2: '#7c3aed',
  green: '#16a34a', amber: '#d97706', gold: '#ca8a04', red: '#dc2626',
};

export const getStudentColors = (theme) => (theme === 'light' ? LIGHT : DARK);
