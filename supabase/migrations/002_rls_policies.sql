-- ============================================================================
-- Migration 002: Row-Level Security Policies for My Money Tracker
-- ============================================================================
-- Every table is locked down so users can only access their own data.
-- profiles uses `id = auth.uid()`; all other tables use `user_id = auth.uid()`.
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lent_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lent_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings    ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. POLICIES: profiles  (keyed on id, not user_id)
-- ============================================================================
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (id = auth.uid());

-- ============================================================================
-- 3. POLICIES: accounts
-- ============================================================================
CREATE POLICY "accounts_select_own"
  ON public.accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "accounts_insert_own"
  ON public.accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "accounts_update_own"
  ON public.accounts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "accounts_delete_own"
  ON public.accounts FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 4. POLICIES: categories
-- ============================================================================
CREATE POLICY "categories_select_own"
  ON public.categories FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "categories_insert_own"
  ON public.categories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "categories_update_own"
  ON public.categories FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "categories_delete_own"
  ON public.categories FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 5. POLICIES: subcategories
-- ============================================================================
CREATE POLICY "subcategories_select_own"
  ON public.subcategories FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "subcategories_insert_own"
  ON public.subcategories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "subcategories_update_own"
  ON public.subcategories FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "subcategories_delete_own"
  ON public.subcategories FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 6. POLICIES: transactions
-- ============================================================================
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "transactions_update_own"
  ON public.transactions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "transactions_delete_own"
  ON public.transactions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 7. POLICIES: lent_records
-- ============================================================================
CREATE POLICY "lent_records_select_own"
  ON public.lent_records FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "lent_records_insert_own"
  ON public.lent_records FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lent_records_update_own"
  ON public.lent_records FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lent_records_delete_own"
  ON public.lent_records FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 8. POLICIES: lent_repayments
-- ============================================================================
CREATE POLICY "lent_repayments_select_own"
  ON public.lent_repayments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "lent_repayments_insert_own"
  ON public.lent_repayments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lent_repayments_update_own"
  ON public.lent_repayments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lent_repayments_delete_own"
  ON public.lent_repayments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 9. POLICIES: investments
-- ============================================================================
CREATE POLICY "investments_select_own"
  ON public.investments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "investments_insert_own"
  ON public.investments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "investments_update_own"
  ON public.investments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "investments_delete_own"
  ON public.investments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 10. POLICIES: app_settings
-- ============================================================================
CREATE POLICY "app_settings_select_own"
  ON public.app_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "app_settings_insert_own"
  ON public.app_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "app_settings_update_own"
  ON public.app_settings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "app_settings_delete_own"
  ON public.app_settings FOR DELETE
  USING (user_id = auth.uid());
