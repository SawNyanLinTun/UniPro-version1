import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { t } = useLanguage();

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold mb-3">{t('common.signInRequired')}</h1>
        <p className="text-text-secondary text-sm mb-8">{t('common.signInRequiredBody')}</p>
        <button
          type="button"
          onClick={openAuthModal}
          className="bg-primary text-white px-6 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {t('common.signIn')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
