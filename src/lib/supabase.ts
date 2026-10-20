import { createClient } from '@supabase/supabase-js';
import { mockSupabase } from './mockSupabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your_supabase') &&
    !supabaseAnonKey.includes('your_supabase')
);

// If Supabase credentials are valid, use the real client; otherwise seamlessly fall back to local mock storage
export const supabase = (
  isSupabaseConfigured
    ? createClient(supabaseUrl as string, supabaseAnonKey as string)
    : (mockSupabase as any)
) as any;

