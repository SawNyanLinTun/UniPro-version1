import React, { FormEvent, useState } from 'react';
import { X, LogIn, UserPlus, KeyRound } from 'lucide-react';
import { useAuth, type AuthRole } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type Mode = 'signin' | 'register' | 'otp';

const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signUp,
    verifySignupOtp,
    signInWithPassword,
  } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AuthRole>('student');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isAuthModalOpen) return null;

  const resetMessages = () => setError(null);

  const switchMode = (next: Mode) => {
    resetMessages();
    setMode(next);
  };

  const handleClose = () => {
    resetMessages();
    setMode('signin');
    setOtp('');
    closeAuthModal();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
      } else if (mode === 'register') {
        await signUp({ email, password, fullName, role });
        setMode('otp');
      } else {
        await verifySignupOtp(email, otp);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md glass-card p-8 rounded-[28px]">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text"
          aria-label={t('nav.close')}
        >
          <X size={18} />
        </button>

        <h2 className="font-display text-xl font-bold mb-2">{t('auth.welcome')}</h2>
        <p className="text-sm text-text-secondary mb-6">
          {mode === 'otp' ? t('auth.otpSubtitle') : t('auth.subtitle')}
        </p>

        <form onSubmit={onSubmit} className="grid gap-3">
          {mode !== 'otp' && (
            <>
              {mode === 'register' && (
                <>
                  <label className="grid gap-1 text-xs text-text-muted">
                    {t('auth.fullName')}
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text"
                      autoComplete="name"
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-text-muted">
                    {t('auth.role')}
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as AuthRole)}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text"
                    >
                      <option value="student">{t('auth.roleStudent')}</option>
                      <option value="company">{t('auth.roleCompany')}</option>
                    </select>
                  </label>
                </>
              )}
              <label className="grid gap-1 text-xs text-text-muted">
                {t('auth.email')}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text"
                  autoComplete="email"
                />
              </label>
              <label className="grid gap-1 text-xs text-text-muted">
                {t('auth.password')}
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
              </label>
            </>
          )}

          {mode === 'otp' && (
            <label className="grid gap-1 text-xs text-text-muted">
              {t('auth.otpCode')}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text tracking-[0.3em] text-center font-mono"
                autoComplete="one-time-code"
                placeholder="000000"
              />
            </label>
          )}

          {error && (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-60"
          >
            {mode === 'signin' && (
              <>
                <LogIn size={16} /> {busy ? t('auth.working') : t('common.signIn')}
              </>
            )}
            {mode === 'register' && (
              <>
                <UserPlus size={16} /> {busy ? t('auth.working') : t('auth.createAccount')}
              </>
            )}
            {mode === 'otp' && (
              <>
                <KeyRound size={16} /> {busy ? t('auth.working') : t('auth.verifyCode')}
              </>
            )}
          </button>
        </form>

        {mode !== 'otp' && (
          <div className="mt-4 text-center text-sm text-text-secondary">
            {mode === 'signin' ? (
              <button
                type="button"
                className="underline hover:text-text"
                onClick={() => switchMode('register')}
              >
                {t('auth.switchToRegister')}
              </button>
            ) : (
              <button
                type="button"
                className="underline hover:text-text"
                onClick={() => switchMode('signin')}
              >
                {t('auth.switchToSignIn')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
