import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth } from './lib/api';

// Pages
import LandingPage from './pages/Landing';
import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';
import AuthCallbackPage from './pages/auth/AuthCallback';
import DashboardLayout from './pages/app/DashboardLayout';
import Overview from './pages/app/Overview';
import PortfolioManager from './pages/app/PortfolioManager';
import FinancialGoals from './pages/app/FinancialGoals';
import ScenarioLab from './pages/app/ScenarioLab';
import StockSwitchAnalyzer from './pages/app/StockSwitchAnalyzer';
import ButterflyEffectEngine from './pages/app/ButterflyEffectEngine';
import ShockImmunity from './pages/app/ShockImmunity';
import Reports from './pages/app/Reports';
import Settings from './pages/app/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => auth.me(),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div role="status" aria-live="polite" className="neo-card w-full max-w-sm p-8 text-left">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-5">ShockLens / Session</p>
          <div className="h-1 bg-muted mb-5" aria-hidden="true">
            <div className="h-full w-1/3 bg-yellow animate-pulse" />
          </div>
          <p className="font-heading font-bold text-lg">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected app */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="portfolio" element={<PortfolioManager />} />
          <Route path="butterfly" element={<ButterflyEffectEngine />} />
          <Route path="immunity" element={<ShockImmunity />} />
          <Route path="switch-analyzer" element={<StockSwitchAnalyzer />} />
          <Route path="goals" element={<FinancialGoals />} />
          <Route path="scenarios" element={<ScenarioLab />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
