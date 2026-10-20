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

// Scroll to top helper on navigation
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          {/* Layer 1: Full-website animated galaxy background covering entire viewport */}
          <GlobalGalaxyBackground />

          {/* Layer 2: Page content layered over the global galaxy */}
          <div className="relative z-10 flex flex-col min-h-screen bg-transparent text-[#F8FAFC]">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                
                {/* Competitions: Dynamic Firestore-backed routes */}
                <Route path="/competitions" element={<CompetitionsHubPage />} />
                <Route path="/competitions/:slug" element={<DynamicCompetitionPage />} />
                
                {/* Team & Store */}
                <Route path="/team" element={<TeamPage />} />
                <Route path="/store" element={<StorePage />} />
                
                {/* Student Profile & Auth */}
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                
                {/* Administration */}
                <Route path="/admin" element={<AdminPage />} />
                
                {/* Legal & Governance */}
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                
                {/* 404 Fallback */}
                <Route path="*" element={<NotFoundPage />} />
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
