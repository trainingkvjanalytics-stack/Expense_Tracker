import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, realSupabase, isSupabaseConfigured, isDemoMode, resetDemoDatabase } from '@/lib/supabase';
import { mockSupabase } from '@/lib/mockSupabase';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isDemo: boolean;
  signInWithDemo: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(() => isDemoMode());

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        if (isDemoMode()) {
          const { data } = await mockSupabase.auth.getSession();
          if (isMounted) {
            setSession(data.session as any);
            setUser((data.session?.user as any) ?? null);
            setIsDemo(true);
          }
          return;
        }

        const client = isSupabaseConfigured && realSupabase ? realSupabase : supabase;
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setIsDemo(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const authErr = err as AuthError;
          setError(authErr.message || 'Failed to get current session');
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes from Supabase client
    const client = isSupabaseConfigured && realSupabase ? realSupabase : supabase;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event: unknown, currentSession: any) => {
      if (isMounted && !isDemoMode()) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const signInWithDemo = async () => {
    setError(null);
    localStorage.setItem('my_money_tracker_demo_session', 'true');
    setIsDemo(true);

    // Seed mock database if not already present
    if (!localStorage.getItem('my_money_tracker_accounts')) {
      resetDemoDatabase();
    }

    const { data } = await mockSupabase.auth.signInWithPassword({
      email: 'demo@mymoneytracker.app',
      password: 'demo',
    });

    setUser(data.user as any);
    setSession(data.session as any);
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ) => {
    setError(null);
    localStorage.removeItem('my_money_tracker_demo_session');
    setIsDemo(false);

    try {
      const client = isSupabaseConfigured && realSupabase ? realSupabase : supabase;
      const { data, error: signUpError } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return { user: null, session: null, error: signUpError };
      }

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err: unknown) {
      const authErr = err as AuthError;
      setError(authErr.message || 'An error occurred during sign up');
      return { user: null, session: null, error: authErr };
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);

    // If demo user is requested, immediately switch to demo mode
    if (email.trim().toLowerCase() === 'demo@mymoneytracker.app') {
      await signInWithDemo();
      return {
        user: { id: '00000000-0000-0000-0000-000000000001', email: 'demo@mymoneytracker.app' } as any,
        session: { access_token: 'demo' } as any,
        error: null,
      };
    }

    // Normal Supabase sign-in
    localStorage.removeItem('my_money_tracker_demo_session');
    setIsDemo(false);

    try {
      const client = isSupabaseConfigured && realSupabase ? realSupabase : supabase;
      const { data, error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return { user: null, session: null, error: signInError };
      }

      setUser(data.user);
      setSession(data.session);
      return { user: data.user, session: data.session, error: null };
    } catch (err: unknown) {
      const authErr = err as AuthError;
      setError(authErr.message || 'An error occurred during sign in');
      return { user: null, session: null, error: authErr };
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      if (!isDemoMode()) {
        const client = isSupabaseConfigured && realSupabase ? realSupabase : supabase;
        await client.auth.signOut();
      }
    } catch (e) {
      console.warn('SignOut warning:', e);
    } finally {
      // Unconditionally clear all user state and local storage
      localStorage.removeItem('my_money_tracker_demo_session');
      localStorage.removeItem('my_money_tracker_auth_user');
      setUser(null);
      setSession(null);
      setIsDemo(false);
    }
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      const client = isSupabaseConfigured && realSupabase ? realSupabase : supabase;
      const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return { error: resetError };
      }

      return { error: null };
    } catch (err: unknown) {
      const authErr = err as AuthError;
      setError(authErr.message || 'Failed to send password reset email');
      return { error: authErr };
    }
  };

  const updatePassword = async (newPassword: string) => {
    setError(null);
    try {
      const client = isSupabaseConfigured && realSupabase ? realSupabase : supabase;
      const { error: updateError } = await client.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return { error: updateError };
      }

      return { error: null };
    } catch (err: unknown) {
      const authErr = err as AuthError;
      setError(authErr.message || 'Failed to update password');
      return { error: authErr };
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      error,
      isDemo,
      signInWithDemo,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [user, session, loading, error, isDemo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
