-- ============================================================================
-- SQL Script: Clear All Dummy / Sample Data from Supabase
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jjmkpctjnpjjkpusduei/sql
-- ============================================================================
-- This script truncates all application tables while preserving:
-- 1. Table structures and schema definitions
-- 2. Foreign keys and indexes
-- 3. Row Level Security (RLS) policies
-- 4. Database triggers and functions
-- ============================================================================

-- Disable triggers temporarily to avoid cascading audit side-effects if needed
SET session_replication_role = 'replica';

-- Truncate all transaction and financial record tables
TRUNCATE TABLE public.lent_repayments CASCADE;
TRUNCATE TABLE public.transactions CASCADE;
TRUNCATE TABLE public.investments CASCADE;
TRUNCATE TABLE public.lent_records CASCADE;
TRUNCATE TABLE public.subcategories CASCADE;
TRUNCATE TABLE public.categories CASCADE;
TRUNCATE TABLE public.accounts CASCADE;
TRUNCATE TABLE public.app_settings CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Re-enable normal trigger behavior
SET session_replication_role = 'origin';

-- Verify counts are 0
SELECT 'profiles' AS table_name, count(*) AS remaining_count FROM public.profiles
UNION ALL
SELECT 'accounts', count(*) FROM public.accounts
UNION ALL
SELECT 'categories', count(*) FROM public.categories
UNION ALL
SELECT 'transactions', count(*) FROM public.transactions
UNION ALL
SELECT 'investments', count(*) FROM public.investments
UNION ALL
SELECT 'lent_records', count(*) FROM public.lent_records
UNION ALL
SELECT 'lent_repayments', count(*) FROM public.lent_repayments
UNION ALL
SELECT 'app_settings', count(*) FROM public.app_settings;
