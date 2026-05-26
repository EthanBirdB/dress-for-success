import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/staff/login" replace />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/staff/queue" replace />;
  return children;
}
