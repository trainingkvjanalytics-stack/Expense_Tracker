import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
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

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const authErr = err as AuthError;
          setError(authErr.message || 'Failed to get session');
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: unknown, currentSession: any) => {
      if (isMounted) {
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

  const signUp = async (email: string, password: string, fullName?: string) => {
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
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
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
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
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut warning:', e);
    } finally {
      setUser(null);
      setSession(null);
    }
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
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
      const { error: updateError } = await supabase.auth.updateUser({
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
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [user, session, loading, error]
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
