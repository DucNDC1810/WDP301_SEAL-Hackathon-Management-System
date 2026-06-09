import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../context/AuthContext';

function AuthLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );
}

export function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export function GuestRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (user) {
    if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
    if (user?.roles?.some(r => r.role_name === 'mentor')) return <Navigate to="/mentor/dashboard" replace />;
    if (user?.roles?.some(r => r.role_name === 'judge')) return <Navigate to="/judge/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function MentorRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  const isMentor = isAdmin || user?.roles?.some(r => r.role_name === 'mentor');
  if (!isMentor) return <Navigate to="/" replace />;
  return children;
}

export function JudgeRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  // Mentors can also be assigned as INTERNAL judges for a specific pool
  const isJudge = isAdmin || user?.roles?.some(r => r.role_name === 'judge' || r.role_name === 'mentor');
  if (!isJudge) return <Navigate to="/" replace />;
  return children;
}

export function MentorScoringRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  // Mentor role users who also act as scorers (not their own mentored teams)
  const allowed = isAdmin || user?.roles?.some(r => r.role_name === 'mentor');
  if (!allowed) return <Navigate to="/" replace />;
  return children;
}
