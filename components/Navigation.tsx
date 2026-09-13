import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Menu, X, User, Heart, Briefcase, Sparkles, Home, Info,
  LogIn, UserPlus, ChevronRight, LogOut, GraduationCap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ThemeLangControls from './ThemeLangControls';

const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, openAuthModal, signOut } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navLinks = [
    { name: t('nav.home'), path: '/', icon: <Home size={20} /> },
    { name: t('nav.browse'), path: '/browse', icon: <Briefcase size={20} /> },
    { name: t('nav.smartmatch'), path: '/smartmatch', icon: <Sparkles size={20} /> },
    { name: t('nav.scholarships'), path: '/scholarship-ledger', icon: <GraduationCap size={20} /> },
    { name: t('nav.saved'), path: '/saved', icon: <Heart size={20} /> },
    { name: t('nav.applications'), path: '/applications', icon: <Briefcase size={20} /> },
    { name: t('nav.about'), path: '/about', icon: <Info size={20} /> },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-[100] border-b border-border bg-bg/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex justify-between items-center gap-4">
          <NavLink to="/" className="flex items-center gap-3 font-display font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
            UniPro
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeLangControls />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-3 px-5 py-2 glass-card rounded-full hover:bg-surface-hover transition-all group"
            >
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-text-muted group-hover:text-text">
                {isOpen ? t('nav.close') : t('nav.menu')}
              </span>
              <div className="text-primary">
                {isOpen ? <X size={20} /> : <Menu size={20} />}
              </div>
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[90] transition-all duration-500 ease-in-out ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-bg/80 backdrop-blur-2xl" onClick={() => setIsOpen(false)} />

        <div className="relative h-full max-w-7xl mx-auto px-8 md:px-20 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32">
            <div className="space-y-4">
              <p className="font-mono text-[0.6rem] text-primary uppercase tracking-[0.3em] mb-8 opacity-50">
                {t('nav.menu')}
              </p>
              <div className="flex flex-col gap-2">
                {navLinks.map((link, index) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) => `
                      group flex items-center justify-between p-4 rounded-2xl transition-all duration-300
                      ${isActive ? 'bg-surface-elevated translate-x-4' : 'hover:bg-surface hover:translate-x-2'}
                    `}
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`p-3 rounded-xl transition-colors ${location.pathname === link.path ? 'bg-primary text-white' : 'bg-surface text-text-muted group-hover:text-text'}`}>
                        {link.icon}
                      </div>
                      <span className={`text-2xl font-bold tracking-tight ${location.pathname === link.path ? 'text-text' : 'text-text-secondary group-hover:text-text'}`}>
                        {link.name}
                      </span>
                    </div>
                    <ChevronRight size={20} className={`transition-all ${location.pathname === link.path ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-12">
              <div className="space-y-6">
                <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-[0.3em] opacity-70">
                  {t('nav.memberAccess')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {!isAuthenticated ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openAuthModal('signin')}
                        className="flex items-center justify-center gap-3 px-8 py-5 glass-card rounded-[24px] hover:bg-surface-hover transition-all font-mono text-[0.7rem] uppercase tracking-widest text-text active:scale-95"
                      >
                        <LogIn size={18} className="text-primary" /> {t('nav.signIn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => openAuthModal('request')}
                        className="flex items-center justify-center gap-3 px-8 py-5 bg-text text-bg rounded-[24px] hover:bg-primary hover:text-white transition-all font-mono text-[0.7rem] font-bold uppercase tracking-widest active:scale-95"
                      >
                        <UserPlus size={18} /> {t('nav.createAccount')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={signOut}
                      className="col-span-full flex items-center justify-center gap-3 px-8 py-5 glass-card rounded-[24px] hover:bg-error-muted border border-error/20 transition-all font-mono text-[0.7rem] uppercase tracking-widest text-error active:scale-95"
                    >
                      <LogOut size={18} /> {t('nav.signOut')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <p className="font-mono text-[0.6rem] text-accent uppercase tracking-[0.3em] opacity-70">
                  {t('nav.userProfile')}
                </p>
                <NavLink
                  to="/profile"
                  className="glass-card p-6 rounded-[32px] flex items-center gap-6 hover:border-border-strong transition-all group"
                >
                  <div className={`w-16 h-16 rounded-full p-1 transition-all ${isAuthenticated ? 'bg-gradient-to-br from-primary to-accent' : 'bg-surface'}`}>
                    <div className="w-full h-full rounded-full bg-bg flex items-center justify-center overflow-hidden">
                      <User size={32} className={isAuthenticated ? 'text-text' : 'text-text-muted'} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg group-hover:text-primary transition-colors">
                      {user?.name ?? t('nav.guest')}
                    </h4>
                    <p className="text-xs text-text-muted font-mono">
                      {user?.university ?? t('nav.signInHint')}
                    </p>
                  </div>
                  <ChevronRight size={24} className="text-text-muted group-hover:text-text transition-colors" />
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
