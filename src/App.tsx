import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { GlobalGalaxyBackground } from './components/layout/GlobalGalaxyBackground';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { HomePage } from './pages/Home/HomePage';
import { AboutPage } from './pages/About/AboutPage';
import { CompetitionsHubPage } from './pages/Competitions/CompetitionsHubPage';
import { ZeroCodePage } from './pages/Competitions/ZeroCodePage';
import { CTFPage } from './pages/Competitions/CTFPage';
import { HackathonPage } from './pages/Competitions/HackathonPage';
import { CodeRushPage } from './pages/Competitions/CodeRushPage';
import { TeamPage } from './pages/Team/TeamPage';
import { StorePage } from './pages/Store/StorePage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { LoginPage } from './pages/Auth/LoginPage';
import { SignupPage } from './pages/Auth/SignupPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { AdminPage } from './pages/Admin/AdminPage';
import { PrivacyPage } from './pages/Legal/PrivacyPage';
import { TermsPage } from './pages/Legal/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { DynamicCompetitionPage } from './pages/Competitions/DynamicCompetitionPage';
import { useBroadcastPopups } from './features/notifications/useBroadcastPopups';
import { BroadcastPopup } from './features/notifications/BroadcastPopup';
import { BroadcastToast } from './components/common/BroadcastToast';
import { CopyGuard } from './components/common/CopyGuard';

// Scroll to top helper on navigation
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

// Broadcast popup listener and modal container
const BroadcastPopupContainer: React.FC = () => {
  const { activePopup, dismissPopup } = useBroadcastPopups();
  if (!activePopup) return null;
  return <BroadcastPopup notification={activePopup} onDismiss={dismissPopup} />;
};

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <CopyGuard />
          <BroadcastPopupContainer />
          <BroadcastToast />
          {/* Layer 1: Full-website animated galaxy background covering entire viewport */}
          <GlobalGalaxyBackground />

          {/* Layer 2: Page content layered over the global galaxy */}
          <div className="relative z-10 flex flex-col min-h-screen bg-transparent text-[#F8FAFC]">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
                <Route path="/about" element={<ErrorBoundary><AboutPage /></ErrorBoundary>} />
                
                {/* Competitions: Dynamic Firestore-backed routes */}
                <Route path="/competitions" element={<ErrorBoundary><CompetitionsHubPage /></ErrorBoundary>} />
                <Route path="/competitions/:slug" element={<ErrorBoundary><DynamicCompetitionPage /></ErrorBoundary>} />
                
                {/* Team & Store */}
                <Route path="/team" element={<ErrorBoundary><TeamPage /></ErrorBoundary>} />
                <Route path="/store" element={<ErrorBoundary><StorePage /></ErrorBoundary>} />
                
                {/* Student Profile & Auth */}
                <Route path="/profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
                <Route path="/login" element={<ErrorBoundary><LoginPage /></ErrorBoundary>} />
                <Route path="/signup" element={<ErrorBoundary><SignupPage /></ErrorBoundary>} />
                <Route path="/forgot-password" element={<ErrorBoundary><ForgotPasswordPage /></ErrorBoundary>} />
                
                {/* Administration */}
                <Route path="/admin" element={<ErrorBoundary><AdminPage /></ErrorBoundary>} />
                
                {/* Legal & Governance */}
                <Route path="/privacy" element={<ErrorBoundary><PrivacyPage /></ErrorBoundary>} />
                <Route path="/terms" element={<ErrorBoundary><TermsPage /></ErrorBoundary>} />
                
                {/* 404 Fallback */}
                <Route path="*" element={<ErrorBoundary><NotFoundPage /></ErrorBoundary>} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
