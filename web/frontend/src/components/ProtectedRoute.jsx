import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export function GuestRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (user) return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
  return children;
}

export function AuthRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
