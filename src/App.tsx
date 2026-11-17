import React, { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminLoginView } from './components/admin/AdminLoginView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { PublicPortfolio } from './components/sections/PublicPortfolio.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { SEED_PORTFOLIO } from './data/seed.ts';
import { loadPublicPortfolio } from './lib/firestoreStore.ts';
import type { PortfolioBundle } from './types/portfolio.ts';

type AppRoute = '/' | '/adminlogin' | '/adminlogin/dashboard';

function normalizeRoute(pathname: string): AppRoute {
  if (pathname.startsWith('/adminlogin/dashboard')) return '/adminlogin/dashboard';
  if (pathname.startsWith('/adminlogin')) return '/adminlogin';
  return '/';
}

function PortfolioRouter() {
  const { isOwnerAdmin, loading: authLoading } = useAuth();
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? normalizeRoute(window.location.pathname) : '/'
  );
  const [bundle, setBundle] = useState<PortfolioBundle>(SEED_PORTFOLIO);

  const navigate = useCallback((target: AppRoute) => {
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setRoute(target);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizeRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refreshPublicBundle = useCallback(async () => {
    const live = await loadPublicPortfolio();
    setBundle(live);
  }, []);

  useEffect(() => {
    void refreshPublicBundle();
  }, [refreshPublicBundle]);

  // Redirect authenticated owner automatically from /adminlogin to /adminlogin/dashboard
  useEffect(() => {
    if (!authLoading && route === '/adminlogin' && isOwnerAdmin) {
      navigate('/adminlogin/dashboard');
    }
  }, [authLoading, isOwnerAdmin, navigate, route]);

  if (route === '/adminlogin/dashboard') {
    if (authLoading) {
      return (
        <div className="min-h-dvh blueprint-grid-canvas flex items-center justify-center font-mono text-xs text-[var(--bp-ink)]">
          VERIFYING ADMIN SESSION...
        </div>
      );
    }
    if (!isOwnerAdmin) {
      return (
        <AdminLoginView
          onBackPublic={() => navigate('/')}
          onEnterDashboard={() => navigate('/adminlogin/dashboard')}
        />
      );
    }
    return (
      <AdminDashboard
        onBackPublic={() => navigate('/')}
        onPublicDataChanged={refreshPublicBundle}
      />
    );
  }

  if (route === '/adminlogin') {
    return (
      <AdminLoginView
        onBackPublic={() => navigate('/')}
        onEnterDashboard={() => navigate('/adminlogin/dashboard')}
      />
    );
  }

  return (
    <PublicPortfolio
      bundle={bundle}
      onNavigateAdmin={() => navigate(isOwnerAdmin ? '/adminlogin/dashboard' : '/adminlogin')}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <PortfolioRouter />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
