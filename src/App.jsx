import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TabHistoryProvider } from '@/lib/TabHistoryContext';
import AppLayout from '@/components/go/AppLayout';

const PageNotFound = lazy(() => import('./lib/PageNotFound'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Home = lazy(() => import('@/pages/Home'));
const NewMove = lazy(() => import('@/pages/NewMove'));
const MyMoves = lazy(() => import('@/pages/MyMoves'));
const TrackingHub = lazy(() => import('@/pages/TrackingHub'));
const MoveDetail = lazy(() => import('@/pages/MoveDetail'));
const DriverHub = lazy(() => import('@/pages/DriverHub'));
const DriverRegister = lazy(() => import('@/pages/DriverRegister'));
const AvailableJobs = lazy(() => import('@/pages/AvailableJobs'));
const MyTrucks = lazy(() => import('@/pages/MyTrucks'));
const MyPayouts = lazy(() => import('@/pages/MyPayouts'));
const Storage = lazy(() => import('@/pages/Storage'));
const HelpCenter = lazy(() => import('@/pages/HelpCenter'));
const Profile = lazy(() => import('@/pages/Profile'));
const Support = lazy(() => import('@/pages/Support'));
const Admin = lazy(() => import('@/pages/Admin'));
const FreightDashboard = lazy(() => import('@/pages/FreightDashboard'));
const Revenue = lazy(() => import('@/pages/Revenue'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const DriverDashboard = lazy(() => import('@/pages/DriverDashboard'));

const PageTransition = ({ children }) => {
  const navType = useNavigationType();
  const isPop = navType === 'POP';
  return (
    <motion.div
      initial={{ x: isPop ? '-100%' : '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: isPop ? '100%' : '-100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
      style={{ position: 'relative', width: '100%', overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
};

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
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
    <AnimatePresence mode="popLayout">
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
    <Routes location={location} key={location.pathname}>
      <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
      <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
      <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
      <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/new-move" element={<PageTransition><NewMove /></PageTransition>} />
          <Route path="/my-moves" element={<PageTransition><MyMoves /></PageTransition>} />
          <Route path="/tracking" element={<PageTransition><TrackingHub /></PageTransition>} />
          <Route path="/move/:id" element={<PageTransition><MoveDetail /></PageTransition>} />
          <Route path="/driver-hub" element={<PageTransition><DriverHub /></PageTransition>} />
          <Route path="/driver-register" element={<PageTransition><DriverRegister /></PageTransition>} />
          <Route path="/available-jobs" element={<PageTransition><AvailableJobs /></PageTransition>} />
          <Route path="/my-trucks" element={<PageTransition><MyTrucks /></PageTransition>} />
          <Route path="/my-payouts" element={<PageTransition><MyPayouts /></PageTransition>} />
          <Route path="/storage" element={<PageTransition><Storage /></PageTransition>} />
          <Route path="/help" element={<PageTransition><HelpCenter /></PageTransition>} />
          <Route path="/support" element={<PageTransition><Support /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
          <Route path="/freight-dashboard" element={<PageTransition><FreightDashboard /></PageTransition>} />
          <Route path="/revenue" element={<PageTransition><Revenue /></PageTransition>} />
          <Route path="/leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
          <Route path="/driver-dashboard" element={<PageTransition><DriverDashboard /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        </Route>
      </Route>

      <Route path="*" element={<PageTransition><PageNotFound /></PageTransition>} />
    </Routes>
    </Suspense>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <TabHistoryProvider>
              <AuthenticatedApp />
            </TabHistoryProvider>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App