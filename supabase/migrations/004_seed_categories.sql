-- ============================================================================
-- Migration 004: Default Category Seeder for My Money Tracker
-- ============================================================================
-- Provides seed_default_categories(p_user_id) which inserts a curated set of
-- expense and income categories with colors and Lucide icon names.
-- This function is called by handle_new_user() (migration 003).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER                       -- bypass RLS so the trigger can insert
SET search_path = public
AS $$
BEGIN
  -- ========================================================================
  -- EXPENSE CATEGORIES
  -- ========================================================================
  INSERT INTO public.categories (user_id, name, transaction_type, color, icon, is_default)
  VALUES
    (p_user_id, 'Food and Dining',  'expense', '#FF6384', 'utensils',         true),
    (p_user_id, 'Groceries',        'expense', '#36A2EB', 'shopping-cart',    true),
    (p_user_id, 'Transportation',   'expense', '#FFCE56', 'bus',              true),
    (p_user_id, 'Fuel',             'expense', '#4BC0C0', 'fuel',             true),
    (p_user_id, 'Rent and Housing', 'expense', '#9966FF', 'home',             true),
    (p_user_id, 'Utilities',        'expense', '#FF9F40', 'zap',              true),
    (p_user_id, 'Shopping',         'expense', '#E7E9ED', 'shopping-bag',     true),
    (p_user_id, 'Healthcare',       'expense', '#C9CBCF', 'heart-pulse',      true),
    (p_user_id, 'Education',        'expense', '#7C4DFF', 'graduation-cap',   true),
    (p_user_id, 'Entertainment',    'expense', '#FF6F61', 'film',             true),
    (p_user_id, 'Travel',           'expense', '#00BCD4', 'plane',            true),
    (p_user_id, 'Personal Care',    'expense', '#8BC34A', 'sparkles',         true),
    (p_user_id, 'Family',           'expense', '#FF5722', 'users',            true),
    (p_user_id, 'Subscriptions',    'expense', '#607D8B', 'repeat',           true),
    (p_user_id, 'Insurance',        'expense', '#795548', 'shield',           true),
    (p_user_id, 'Other',            'expense', '#9E9E9E', 'more-horizontal',  true);

  -- ========================================================================
  -- INCOME CATEGORIES
  -- ========================================================================
  INSERT INTO public.categories (user_id, name, transaction_type, color, icon, is_default)
  VALUES
    (p_user_id, 'Salary',           'income', '#4CAF50', 'banknote',         true),
    (p_user_id, 'Business Income',  'income', '#8BC34A', 'briefcase',        true),
    (p_user_id, 'Freelance Income', 'income', '#00BCD4', 'laptop',           true),
    (p_user_id, 'Interest',         'income', '#FFC107', 'percent',          true),
    (p_user_id, 'Rental Income',    'income', '#FF9800', 'building',         true),
    (p_user_id, 'Refund',           'income', '#2196F3', 'undo',             true),
    (p_user_id, 'Gift',             'income', '#E91E63', 'gift',             true),
    (p_user_id, 'Other',            'income', '#9E9E9E', 'more-horizontal',  true);
END;
$$;

COMMENT ON FUNCTION public.seed_default_categories(UUID)
  IS 'Seeds the default expense and income categories for a newly registered user.';
