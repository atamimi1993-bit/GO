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
import AdminRoute from '@/components/AdminRoute';
import { TabHistoryProvider } from '@/lib/TabHistoryContext';
import AppLayout from '@/components/go/AppLayout';

const PageNotFound = lazy(() => import('./lib/PageNotFound'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Home = lazy(() => import('@/pages/Home'));
const NewMove = lazy(() => import('@/pages/NewMove'));
const QuickDelivery = lazy(() => import('@/pages/QuickDelivery'));
const SavedAddresses = lazy(() => import('@/pages/SavedAddresses'));
const BusinessAccount = lazy(() => import('@/pages/BusinessAccount'));
const BusinessPlans = lazy(() => import('@/pages/BusinessPlans'));
const RecurringDeliveries = lazy(() => import('@/pages/RecurringDeliveries'));
const DeliveryHistory = lazy(() => import('@/pages/DeliveryHistory'));
const MyMoves = lazy(() => import('@/pages/MyMoves'));
const TrackingHub = lazy(() => import('@/pages/TrackingHub'));
const MoveDetail = lazy(() => import('@/pages/MoveDetail'));
const DriverHub = lazy(() => import('@/pages/DriverHub'));
const DriversWanted = lazy(() => import('@/pages/DriversWanted'));
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
const Terms = lazy(() => import('@/pages/Terms'));
const FinancialDashboard = lazy(() => import('@/pages/FinancialDashboard'));
const MetricsDashboard = lazy(() => import('@/pages/MetricsDashboard'));
const GrowthDashboard = lazy(() => import('@/pages/GrowthDashboard'));
const Rentals = lazy(() => import('@/pages/Rentals'));
const RentalDetail = lazy(() => import('@/pages/RentalDetail'));
const NewRental = lazy(() => import('@/pages/NewRental'));
const DriverReport = lazy(() => import('@/pages/DriverReport'));
const ReportDamage = lazy(() => import('@/pages/ReportDamage'));
const DriverDetail = lazy(() => import('@/pages/DriverDetail'));
const Overseer = lazy(() => import('@/pages/Overseer'));
const ScheduleOptimizer = lazy(() => import('@/pages/ScheduleOptimizer'));
const DriverUpgrade = lazy(() => import('@/pages/DriverUpgrade'));
const DriverExpenses = lazy(() => import('@/pages/DriverExpenses'));
const LeadMarketplace = lazy(() => import('@/pages/LeadMarketplace'));

const PageTransition = ({ children }) => {
  const navType = useNavigationType();
  const isPop = navType === 'POP';
  return (
    <motion.div
      initial={{ x: isPop ? '-100%' : '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: isPop ? '100%' : '-100%', opacity: 0 }}
      transition={isPop
        ? { type: 'tween', duration: 0.25, ease: 'easeOut' }
        : { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
      style={{ position: 'relative', width: '100%', overflowX: 'hidden', willChange: 'transform' }}
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
      <div role="status" aria-label="Loading" aria-live="polite" className="fixed inset-0 flex items-center justify-center">
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
      <div role="status" aria-label="Loading" aria-live="polite" className="fixed inset-0 flex items-center justify-center bg-background">
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
          <Route path="/quick-delivery" element={<PageTransition><QuickDelivery /></PageTransition>} />
          <Route path="/saved-addresses" element={<PageTransition><SavedAddresses /></PageTransition>} />
          <Route path="/business-account" element={<PageTransition><BusinessAccount /></PageTransition>} />
          <Route path="/business-plans" element={<PageTransition><BusinessPlans /></PageTransition>} />
          <Route path="/recurring-deliveries" element={<PageTransition><RecurringDeliveries /></PageTransition>} />
          <Route path="/delivery-history" element={<PageTransition><DeliveryHistory /></PageTransition>} />
          <Route path="/move/:id" element={<PageTransition><MoveDetail /></PageTransition>} />
          <Route path="/driver-hub" element={<PageTransition><DriverHub /></PageTransition>} />
          <Route path="/drivers-wanted" element={<PageTransition><DriversWanted /></PageTransition>} />
          <Route path="/driver-register" element={<PageTransition><DriverRegister /></PageTransition>} />
          <Route path="/available-jobs" element={<PageTransition><AvailableJobs /></PageTransition>} />
          <Route path="/my-trucks" element={<PageTransition><MyTrucks /></PageTransition>} />
          <Route path="/my-payouts" element={<PageTransition><MyPayouts /></PageTransition>} />
          <Route path="/storage" element={<PageTransition><Storage /></PageTransition>} />
          <Route path="/help" element={<PageTransition><HelpCenter /></PageTransition>} />
          <Route path="/support" element={<PageTransition><Support /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
          <Route path="/freight-dashboard" element={<PageTransition><FreightDashboard /></PageTransition>} />
          <Route path="/driver-dashboard" element={<PageTransition><DriverDashboard /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
          <Route path="/rentals" element={<PageTransition><Rentals /></PageTransition>} />
          <Route path="/rentals/new" element={<PageTransition><NewRental /></PageTransition>} />
          <Route path="/rentals/:id" element={<PageTransition><RentalDetail /></PageTransition>} />
          <Route path="/driver-report" element={<PageTransition><DriverReport /></PageTransition>} />
          <Route path="/scheduler" element={<PageTransition><ScheduleOptimizer /></PageTransition>} />
          <Route path="/driver-upgrade" element={<PageTransition><DriverUpgrade /></PageTransition>} />
          <Route path="/driver-expenses" element={<PageTransition><DriverExpenses /></PageTransition>} />
          <Route path="/lead-marketplace" element={<PageTransition><LeadMarketplace /></PageTransition>} />
          <Route path="/driver/:id" element={<PageTransition><DriverDetail /></PageTransition>} />
          <Route path="/report-damage/:id" element={<PageTransition><ReportDamage /></PageTransition>} />

          {/* Admin-only: AI oversight agent */}
          <Route element={<AdminRoute />}>
            <Route path="/overseer" element={<PageTransition><Overseer /></PageTransition>} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<AdminRoute />}>
            <Route path="/my-moves" element={<PageTransition><MyMoves /></PageTransition>} />
            <Route path="/tracking" element={<PageTransition><TrackingHub /></PageTransition>} />
            <Route path="/revenue" element={<PageTransition><Revenue /></PageTransition>} />
            <Route path="/financials" element={<PageTransition><FinancialDashboard /></PageTransition>} />
            <Route path="/metrics" element={<PageTransition><MetricsDashboard /></PageTransition>} />
            <Route path="/growth" element={<PageTransition><GrowthDashboard /></PageTransition>} />
          </Route>
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