import { createClient } from '@supabase/supabase-js';

// Default to the project's production Supabase credentials if environment variables
// are not configured in the hosting environment (e.g., Vercel deployment settings)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://jjmkpctjnpjjkpusduei.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_jo0QuJktwfVIK_oYukHKtA_KLZZ-fLR';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Live production Supabase client connecting directly to your PostgreSQL database and Supabase Auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey) as any;
