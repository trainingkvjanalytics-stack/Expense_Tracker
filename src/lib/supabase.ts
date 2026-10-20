import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your .env file.');
}

// Live production Supabase client connecting directly to your PostgreSQL database and Supabase Auth
export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string) as any;
