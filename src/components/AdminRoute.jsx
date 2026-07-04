import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * Wraps admin-only routes. Redirects non-admin users to home.
 * Must be used inside ProtectedRoute (i.e. user is already authenticated).
 */
export default function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}