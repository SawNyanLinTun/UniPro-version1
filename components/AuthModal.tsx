import React, { FormEvent, useState } from 'react';
import { X, Mail, KeyRound, Lock, LogIn } from 'lucide-react';
import { useAuth, type AuthRole } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type Step = 'request' | 'otp' | 'password' | 'signin';

const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    requestOtp,
    verifyOtp,
    setPassword,
    signInWithPassword,
  } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AuthRole>('student');
  const [otp, setOtp] = useState('');
  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isAuthModalOpen) return null;

  const resetMessages = () => setError(null);

  const resetFields = () => {
    setOtp('');
    setPasswordValue('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    resetMessages();
    resetFields();
    setStep('request');
    closeAuthModal();
  };

  const backToEmail = () => {
    resetMessages();
    resetFields();
    setStep('request');
  };

  const skipPassword = () => {
    resetMessages();
    resetFields();
    setStep('request');
    closeAuthModal();
  };

  const switchToSignIn = () => {
    resetMessages();
    resetFields();
    setStep('signin');
  };

  const switchToCode = () => {
    resetMessages();
    resetFields();
    setStep('request');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      if (step === 'request') {
        await requestOtp({ email, fullName, role });
        setStep('otp');
      } else if (step === 'otp') {
        await verifyOtp(email, otp);
        setStep('password');
      } else if (step === 'password') {
        if (password !== confirmPassword) {
          throw new Error(t('auth.passwordMismatch'));
        }
        await setPassword(password);
        handleClose();
      } else {
        await signInWithPassword(email, password);
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    resetMessages();
    setBusy(true);
    try {
      await requestOtp({ email, fullName, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const subtitle =
    step === 'otp'
      ? t('auth.otpSubtitle')
      : step === 'password'
        ? t('auth.passwordSubtitle')
        : step === 'signin'
          ? t('auth.signInSubtitle')
          : t('auth.subtitle');

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
        <p className="text-sm text-text-secondary mb-6">{subtitle}</p>

        <form onSubmit={onSubmit} className="grid gap-3">
          {step === 'request' && (
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
            </>
          )}

          {step === 'signin' && (
            <>
              <label className="grid gap-1 text-xs text-text-muted">
                {t('auth.email')}
                <input
                  type="email"
                  required
                  autoFocus
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
                  value={password}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text"
                  autoComplete="current-password"
                />
              </label>
            </>
          )}

          {step === 'otp' && (
            <>
              <p className="text-xs text-text-muted -mt-1">{email}</p>
              <label className="grid gap-1 text-xs text-text-muted">
                {t('auth.otpCode')}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text tracking-[0.3em] text-center font-mono"
                  autoComplete="one-time-code"
                  placeholder="000000"
                />
              </label>
            </>
          )}

          {step === 'password' && (
            <>
              <label className="grid gap-1 text-xs text-text-muted">
                {t('auth.password')}
                <input
                  type="password"
                  required
                  minLength={6}
                  autoFocus
                  value={password}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text"
                  autoComplete="new-password"
                />
              </label>
              <label className="grid gap-1 text-xs text-text-muted">
                {t('auth.confirmPassword')}
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text"
                  autoComplete="new-password"
                />
              </label>
            </>
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
            {step === 'request' && (
              <>
                <Mail size={16} /> {busy ? t('auth.working') : t('auth.sendCode')}
              </>
            )}
            {step === 'otp' && (
              <>
                <KeyRound size={16} /> {busy ? t('auth.working') : t('auth.verifyCode')}
              </>
            )}
            {step === 'password' && (
              <>
                <Lock size={16} /> {busy ? t('auth.working') : t('auth.setPassword')}
              </>
            )}
            {step === 'signin' && (
              <>
                <LogIn size={16} /> {busy ? t('auth.working') : t('common.signIn')}
              </>
            )}
          </button>
        </form>

        {step === 'request' && (
          <div className="mt-4 text-center text-sm text-text-secondary">
            <button type="button" className="underline hover:text-text" onClick={switchToSignIn}>
              {t('auth.havePassword')}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
            <button type="button" className="underline hover:text-text" onClick={backToEmail}>
              {t('auth.changeEmail')}
            </button>
            <button type="button" className="underline hover:text-text" onClick={resendCode} disabled={busy}>
              {t('auth.resendCode')}
            </button>
          </div>
        )}

        {step === 'password' && (
          <div className="mt-4 text-center text-sm text-text-secondary">
            <button type="button" className="underline hover:text-text" onClick={skipPassword} disabled={busy}>
              {t('auth.skipForNow')}
            </button>
          </div>
        )}

        {step === 'signin' && (
          <div className="mt-4 text-center text-sm text-text-secondary">
            <button type="button" className="underline hover:text-text" onClick={switchToCode}>
              {t('auth.useCodeInstead')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
