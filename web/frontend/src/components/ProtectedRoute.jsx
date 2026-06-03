import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export function GuestRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (user) return <Navigate to={isAdmin ? '/admin/dashboard' : '/'} replace />;
  return children;
}
