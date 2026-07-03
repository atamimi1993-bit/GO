import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// App pages
import AppLayout from '@/components/go/AppLayout';
import Home from '@/pages/Home';
import NewMove from '@/pages/NewMove';
import MyMoves from '@/pages/MyMoves';
import MoveDetail from '@/pages/MoveDetail';
import DriverHub from '@/pages/DriverHub';
import DriverRegister from '@/pages/DriverRegister';
import AvailableJobs from '@/pages/AvailableJobs';
import MyTrucks from '@/pages/MyTrucks';
import MyPayouts from '@/pages/MyPayouts';
import Storage from '@/pages/Storage';
import HelpCenter from '@/pages/HelpCenter';
import Profile from '@/pages/Profile';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/new-move" element={<NewMove />} />
          <Route path="/my-moves" element={<MyMoves />} />
          <Route path="/move/:id" element={<MoveDetail />} />
          <Route path="/driver-hub" element={<DriverHub />} />
          <Route path="/driver-register" element={<DriverRegister />} />
          <Route path="/available-jobs" element={<AvailableJobs />} />
          <Route path="/my-trucks" element={<MyTrucks />} />
          <Route path="/my-payouts" element={<MyPayouts />} />
          <Route path="/storage" element={<Storage />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App