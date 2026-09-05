import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, currentUser } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(currentUser?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
