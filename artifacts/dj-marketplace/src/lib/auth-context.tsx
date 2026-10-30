import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';

export type MarketplaceRole = 'host' | 'dj' | 'admin';

export type MarketplaceProfile = {
  id: string;
  role: Exclude<MarketplaceRole, 'admin'>;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: MarketplaceProfile | null;
  role: MarketplaceRole | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    role: 'host' | 'dj',
    displayName: string,
  ) => Promise<{ confirmationRequired: boolean }>;
  resendConfirmation: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session?.user.id) {
      setProfile(null);
      return;
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, display_name, avatar_url, city')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    setProfile((data as MarketplaceProfile | null) ?? null);
  }, [session?.user.id]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setLoading(false);
    }).catch((sessionError: unknown) => {
      if (!mounted) return;
      setError(errorMessage(sessionError));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setError(null);
      if (!nextSession) setProfile(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!supabase || !session?.user.id) {
      setProfile(null);
      return;
    }

    void (async () => {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, display_name, avatar_url, city')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!mounted) return;
        if (profileError) setError(profileError.message);
        setProfile((data as MarketplaceProfile | null) ?? null);
        setLoading(false);
      } catch (profileError) {
        if (!mounted) return;
        setError(errorMessage(profileError));
        setProfile(null);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session?.user.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Authentication is unavailable until Supabase is configured.');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, role: 'host' | 'dj', displayName: string) => {
      if (!supabase) throw new Error('Authentication is unavailable until Supabase is configured.');
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { role, display_name: displayName.trim() },
        },
      });
      if (signUpError) throw signUpError;
      return { confirmationRequired: !data.session };
    },
    [],
  );

  const resendConfirmation = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Email confirmation is unavailable until Supabase is configured.');
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (resendError) throw resendError;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Password reset is unavailable until Supabase is configured.');
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError) throw resetError;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Password updates are unavailable until Supabase is configured.');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) throw updateError;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  }, []);

  const role: MarketplaceRole | null = session?.user.app_metadata?.role === 'admin'
    ? 'admin'
    : profile?.role ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      user: session?.user ?? null,
      profile,
      role,
      error,
      signIn,
      signUp,
      resendConfirmation,
      resetPassword,
      updatePassword,
      signOut,
      refreshProfile,
    }),
    [loading, session?.user, profile, role, error, signIn, signUp, resendConfirmation, resetPassword, updatePassword, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export { errorMessage };
