import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
  </div>
);

/**
 * Wraps admin-only routes. Redirects non-admin users to home.
 * Must be used inside ProtectedRoute (i.e. user is already authenticated).
 * Forwards the parent Outlet context (scrollRef) so nested pages can use it.
 */
export default function AdminRoute() {
  const { user, isLoadingAuth, authChecked } = useAuth();
  const context = useOutletContext();

  if (isLoadingAuth || !authChecked || !user) {
    return <LoadingFallback />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet context={context} />;
}