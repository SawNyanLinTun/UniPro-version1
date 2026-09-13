import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { requireSupabase, supabase } from '../services/supabase';

export type AuthRole = 'student' | 'company' | 'admin';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  /** Kept for nav/profile placeholders until student profile is wired */
  university?: string;
};

type RequestOtpInput = {
  email: string;
  fullName: string;
  role?: AuthRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  session: Session | null;
  accessToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  /** Emails a one-time code. Creates the account on first use, signs an existing one in otherwise. */
  requestOtp: (input: RequestOtpInput) => Promise<void>;
  /** Verifies the code and signs the user in. Leaves the modal open so it can offer setPassword next. */
  verifyOtp: (email: string, code: string) => Promise<void>;
  /** Sets a password on the now-signed-in account, so future logins don't need a fresh email code. */
  setPassword: (password: string) => Promise<void>;
  /** For returning users who set a password — skips the email code entirely. */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapSessionToUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata ?? {};
  const roleRaw = (meta.role as string | undefined)?.toLowerCase();
  const role: AuthRole =
    roleRaw === 'company' || roleRaw === 'admin' || roleRaw === 'student'
      ? roleRaw
      : 'student';
  const name =
    (meta.full_name as string | undefined)?.trim() ||
    session.user.email?.split('@')[0] ||
    'User';
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name,
    role,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const requestOtp = useCallback(async ({ email, fullName, role = 'student' }: RequestOtpInput) => {
    const client = requireSupabase();
    // shouldCreateUser: true means this one call covers both signup and sign-in —
    // the metadata below only ever lands on a brand-new account; Supabase leaves
    // an existing user's metadata untouched.
    const { error } = await client.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: {
          role,
          full_name: fullName.trim(),
        },
      },
    });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (error) throw error;
    setSession(data.session);
    // Modal stays open — AuthModal moves to its own "set a password" step next.
  }, []);

  const setPassword = useCallback(async (password: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    setSession(data.session);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const user = useMemo(() => mapSessionToUser(session), [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      accessToken: session?.access_token ?? null,
      loading,
      isAuthenticated: !!session,
      isAuthModalOpen,
      openAuthModal: () => setIsAuthModalOpen(true),
      closeAuthModal: () => setIsAuthModalOpen(false),
      requestOtp,
      verifyOtp,
      setPassword,
      signInWithPassword,
      signOut,
    }),
    [
      user,
      session,
      loading,
      isAuthModalOpen,
      requestOtp,
      verifyOtp,
      setPassword,
      signInWithPassword,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
