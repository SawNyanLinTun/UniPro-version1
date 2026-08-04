import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import OrbBackground from './components/OrbBackground';
import Navigation from './components/Navigation';
import AuthModal from './components/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';

import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import SmartMatchPage from './pages/SmartMatchPage';
import SavedPage from './pages/SavedPage';
import ApplicationsPage from './pages/ApplicationsPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import ScholarshipLedgerPage from './pages/ScholarshipLedgerPage';

const LoadingFallback = () => {
  const { t } = useLanguage();
  return (
    <div className="h-screen w-full flex items-center justify-center text-primary text-sm animate-pulse font-display">
      {t('common.loading')}
    </div>
  );
};

const AppFooter = () => {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border mt-24 bg-surface">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="flex flex-col md:flex-row justify-between gap-12">
          <div className="max-w-sm">
            <div className="font-display font-bold text-lg tracking-tight mb-4">UniPro</div>
            <p className="text-text-secondary text-sm leading-relaxed">{t('footer.tagline')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
                {t('footer.platform')}
              </h4>
              <ul className="text-sm space-y-3">
                <li><a href="#/browse" className="text-text-secondary hover:text-text transition-colors">{t('footer.browse')}</a></li>
                <li><a href="#/smartmatch" className="text-text-secondary hover:text-text transition-colors">{t('footer.smartmatch')}</a></li>
                <li><a href="#/scholarship-ledger" className="text-text-secondary hover:text-text transition-colors">{t('footer.scholarships')}</a></li>
                <li><a href="#/about" className="text-text-secondary hover:text-text transition-colors">{t('footer.about')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
                {t('footer.account')}
              </h4>
              <ul className="text-sm space-y-3">
                <li><a href="#/saved" className="text-text-secondary hover:text-text transition-colors">{t('footer.saved')}</a></li>
                <li><a href="#/applications" className="text-text-secondary hover:text-text transition-colors">{t('footer.applications')}</a></li>
                <li><a href="#/profile" className="text-text-secondary hover:text-text transition-colors">{t('footer.profile')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
                {t('footer.connect')}
              </h4>
              <ul className="text-sm space-y-3">
                <li><a href="#" className="text-text-secondary hover:text-text transition-colors">LinkedIn</a></li>
                <li><a href="#" className="text-text-secondary hover:text-text transition-colors">X / Twitter</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-border text-xs text-text-muted flex flex-col md:flex-row justify-between gap-4">
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.mission')}</span>
        </div>
      </div>
    </footer>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen text-text font-sans selection:bg-primary selection:text-white pt-16">
          <OrbBackground />
          <Navigation />
          <AuthModal />

          <main>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/smartmatch" element={<SmartMatchPage />} />
                <Route path="/scholarship-ledger" element={<ScholarshipLedgerPage />} />
                <Route
                  path="/saved"
                  element={
                    <ProtectedRoute>
                      <SavedPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/applications"
                  element={
                    <ProtectedRoute>
                      <ApplicationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          <AppFooter />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
