import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * Wraps admin-only routes. Redirects non-admin users to home.
 * Must be used inside ProtectedRoute (i.e. user is already authenticated).
 * Forwards the parent Outlet context (scrollRef) so nested pages can use it.
 */
export default function AdminRoute() {
  const { user } = useAuth();
  const context = useOutletContext();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet context={context} />;
}