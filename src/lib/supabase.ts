import { createClient } from '@supabase/supabase-js';
import { mockSupabase, resetDemoDatabase } from './mockSupabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your_supabase') &&
    !supabaseAnonKey.includes('your_supabase')
);

export const realSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('my_money_tracker_demo_session') === 'true';
};

// Smart proxy: routes to mockSupabase when demo session is active, or real Supabase otherwise
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    if (isDemoMode()) {
      return (mockSupabase as any)[prop];
    }
    if (realSupabase) {
      return (realSupabase as any)[prop];
    }
    return (mockSupabase as any)[prop];
  },
});

export { resetDemoDatabase };

