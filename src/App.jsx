import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
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

const PageTransition = ({ children }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
    {children}
  </motion.div>
);

const AuthenticatedApp = () => {
  const location = useLocation();
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
    <AnimatePresence mode="wait">
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
          <Route path="/move/:id" element={<PageTransition><MoveDetail /></PageTransition>} />
          <Route path="/driver-hub" element={<PageTransition><DriverHub /></PageTransition>} />
          <Route path="/driver-register" element={<PageTransition><DriverRegister /></PageTransition>} />
          <Route path="/available-jobs" element={<PageTransition><AvailableJobs /></PageTransition>} />
          <Route path="/my-trucks" element={<PageTransition><MyTrucks /></PageTransition>} />
          <Route path="/my-payouts" element={<PageTransition><MyPayouts /></PageTransition>} />
          <Route path="/storage" element={<PageTransition><Storage /></PageTransition>} />
          <Route path="/help" element={<PageTransition><HelpCenter /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        </Route>
      </Route>

      <Route path="*" element={<PageTransition><PageNotFound /></PageTransition>} />
    </Routes>
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
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App