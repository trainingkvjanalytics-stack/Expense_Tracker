-- ============================================================================
-- Complete Database Setup for My Money Tracker
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jjmkpctjnpjjkpusduei/sql
-- ============================================================================

-- ============================================================================
-- 1. UTILITY: updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. TABLES (ordered by foreign key dependencies)
-- ============================================================================

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  currency_code TEXT      DEFAULT 'INR',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name    TEXT        NOT NULL,
  bank_name       TEXT,
  account_type    TEXT        NOT NULL CHECK (account_type IN ('savings', 'current', 'cash_wallet', 'other')),
  initial_balance NUMERIC(15,2) DEFAULT 0,
  opening_date    DATE        DEFAULT CURRENT_DATE,
  notes           TEXT,
  is_archived     BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  transaction_type TEXT        NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  color            TEXT,
  icon             TEXT,
  is_default       BOOLEAN     DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, name, transaction_type)
);

-- subcategories
CREATE TABLE IF NOT EXISTS public.subcategories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID        NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (category_id, name)
);

-- lent_records
CREATE TABLE IF NOT EXISTS public.lent_records (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name             TEXT        NOT NULL,
  original_amount         NUMERIC(15,2) NOT NULL CHECK (original_amount > 0),
  amount_repaid           NUMERIC(15,2) DEFAULT 0 CHECK (amount_repaid >= 0),
  outstanding_amount      NUMERIC(15,2) NOT NULL CHECK (outstanding_amount >= 0),
  date_lent               DATE        NOT NULL DEFAULT CURRENT_DATE,
  expected_repayment_date DATE        NOT NULL,
  account_id              UUID        REFERENCES public.accounts(id) ON DELETE SET NULL,
  payment_mode            TEXT        CHECK (payment_mode IN ('cash', 'card', 'upi')),
  status                  TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'overdue', 'repaid')),
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- investments
CREATE TABLE IF NOT EXISTS public.investments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount            NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  investment_method TEXT        NOT NULL CHECK (investment_method IN ('sip', 'one_time')),
  investment_name   TEXT        NOT NULL,
  investment_type   TEXT        NOT NULL CHECK (investment_type IN ('mutual_fund', 'gold_fund', 'stocks', 'fixed_deposit', 'other')),
  investment_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  account_id        UUID        REFERENCES public.accounts(id) ON DELETE SET NULL,
  payment_mode      TEXT        CHECK (payment_mode IN ('cash', 'card', 'upi')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type       TEXT        NOT NULL CHECK (transaction_type IN ('income', 'expense', 'investment', 'lent', 'repayment', 'transfer')),
  amount                 NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  category_id            UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id         UUID        REFERENCES public.subcategories(id) ON DELETE SET NULL,
  account_id             UUID        REFERENCES public.accounts(id) ON DELETE SET NULL,
  destination_account_id UUID        REFERENCES public.accounts(id) ON DELETE SET NULL,
  payment_mode           TEXT        CHECK (payment_mode IN ('cash', 'card', 'upi')),
  transaction_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  description            TEXT,
  related_lent_id        UUID        REFERENCES public.lent_records(id) ON DELETE SET NULL,
  related_investment_id  UUID        REFERENCES public.investments(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- lent_repayments
CREATE TABLE IF NOT EXISTS public.lent_repayments (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lent_record_id          UUID        NOT NULL REFERENCES public.lent_records(id) ON DELETE CASCADE,
  amount                  NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  repayment_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  expected_remaining_date DATE,
  destination_account_id  UUID        REFERENCES public.accounts(id) ON DELETE SET NULL,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_opening_balance NUMERIC(15,2) DEFAULT 0,
  initial_balance_date    DATE        DEFAULT CURRENT_DATE,
  currency_code           TEXT        DEFAULT 'INR',
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories (user_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_user_id ON public.subcategories (user_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories (category_id);
CREATE INDEX IF NOT EXISTS idx_lent_records_user_id ON public.lent_records (user_id);
CREATE INDEX IF NOT EXISTS idx_lent_records_status ON public.lent_records (status);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON public.transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_lent_repayments_user_id ON public.lent_repayments (user_id);
CREATE INDEX IF NOT EXISTS idx_lent_repayments_lent_record_id ON public.lent_repayments (lent_record_id);

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_lent_records_updated_at ON public.lent_records;
CREATE TRIGGER trg_lent_records_updated_at
  BEFORE UPDATE ON public.lent_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_investments_updated_at ON public.investments;
CREATE TRIGGER trg_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. ROW LEVEL SECURITY & POLICIES
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

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (id = auth.uid());

-- accounts
DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "accounts_insert_own" ON public.accounts;
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "accounts_update_own" ON public.accounts;
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "accounts_delete_own" ON public.accounts;
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE USING (user_id = auth.uid());

-- categories
DROP POLICY IF EXISTS "categories_select_own" ON public.categories;
CREATE POLICY "categories_select_own" ON public.categories FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
CREATE POLICY "categories_insert_own" ON public.categories FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
CREATE POLICY "categories_update_own" ON public.categories FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;
CREATE POLICY "categories_delete_own" ON public.categories FOR DELETE USING (user_id = auth.uid());

-- subcategories
DROP POLICY IF EXISTS "subcategories_select_own" ON public.subcategories;
CREATE POLICY "subcategories_select_own" ON public.subcategories FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "subcategories_insert_own" ON public.subcategories;
CREATE POLICY "subcategories_insert_own" ON public.subcategories FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "subcategories_update_own" ON public.subcategories;
CREATE POLICY "subcategories_update_own" ON public.subcategories FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "subcategories_delete_own" ON public.subcategories;
CREATE POLICY "subcategories_delete_own" ON public.subcategories FOR DELETE USING (user_id = auth.uid());

-- transactions
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own" ON public.transactions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own" ON public.transactions FOR DELETE USING (user_id = auth.uid());

-- lent_records
DROP POLICY IF EXISTS "lent_records_select_own" ON public.lent_records;
CREATE POLICY "lent_records_select_own" ON public.lent_records FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "lent_records_insert_own" ON public.lent_records;
CREATE POLICY "lent_records_insert_own" ON public.lent_records FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "lent_records_update_own" ON public.lent_records;
CREATE POLICY "lent_records_update_own" ON public.lent_records FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "lent_records_delete_own" ON public.lent_records;
CREATE POLICY "lent_records_delete_own" ON public.lent_records FOR DELETE USING (user_id = auth.uid());

-- lent_repayments
DROP POLICY IF EXISTS "lent_repayments_select_own" ON public.lent_repayments;
CREATE POLICY "lent_repayments_select_own" ON public.lent_repayments FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "lent_repayments_insert_own" ON public.lent_repayments;
CREATE POLICY "lent_repayments_insert_own" ON public.lent_repayments FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "lent_repayments_update_own" ON public.lent_repayments;
CREATE POLICY "lent_repayments_update_own" ON public.lent_repayments FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "lent_repayments_delete_own" ON public.lent_repayments;
CREATE POLICY "lent_repayments_delete_own" ON public.lent_repayments FOR DELETE USING (user_id = auth.uid());

-- investments
DROP POLICY IF EXISTS "investments_select_own" ON public.investments;
CREATE POLICY "investments_select_own" ON public.investments FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "investments_insert_own" ON public.investments;
CREATE POLICY "investments_insert_own" ON public.investments FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "investments_update_own" ON public.investments;
CREATE POLICY "investments_update_own" ON public.investments FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "investments_delete_own" ON public.investments;
CREATE POLICY "investments_delete_own" ON public.investments FOR DELETE USING (user_id = auth.uid());

-- app_settings
DROP POLICY IF EXISTS "app_settings_select_own" ON public.app_settings;
CREATE POLICY "app_settings_select_own" ON public.app_settings FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "app_settings_insert_own" ON public.app_settings;
CREATE POLICY "app_settings_insert_own" ON public.app_settings FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "app_settings_update_own" ON public.app_settings;
CREATE POLICY "app_settings_update_own" ON public.app_settings FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "app_settings_delete_own" ON public.app_settings;
CREATE POLICY "app_settings_delete_own" ON public.app_settings FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- 6. DEFAULT CATEGORY SEEDER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Expense categories
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
    (p_user_id, 'Other',            'expense', '#9E9E9E', 'more-horizontal',  true)
  ON CONFLICT (user_id, name, transaction_type) DO NOTHING;

  -- Income categories
  INSERT INTO public.categories (user_id, name, transaction_type, color, icon, is_default)
  VALUES
    (p_user_id, 'Salary',           'income', '#4CAF50', 'banknote',         true),
    (p_user_id, 'Business Income',  'income', '#8BC34A', 'briefcase',        true),
    (p_user_id, 'Freelance Income', 'income', '#00BCD4', 'laptop',           true),
    (p_user_id, 'Interest',         'income', '#FFC107', 'percent',          true),
    (p_user_id, 'Rental Income',    'income', '#FF9800', 'building',         true),
    (p_user_id, 'Refund',           'income', '#2196F3', 'undo',             true),
    (p_user_id, 'Gift',             'income', '#E91E63', 'gift',             true),
    (p_user_id, 'Other',            'income', '#9E9E9E', 'more-horizontal',  true)
  ON CONFLICT (user_id, name, transaction_type) DO NOTHING;
END;
$$;

-- ============================================================================
-- 7. USER ONBOARDING TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.app_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM public.seed_default_categories(NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 8. ATOMIC LENT REPAYMENT FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_lent_repayment(
  p_lent_record_id          UUID,
  p_amount                  NUMERIC,
  p_repayment_date          DATE      DEFAULT CURRENT_DATE,
  p_expected_remaining_date DATE      DEFAULT NULL,
  p_destination_account_id  UUID      DEFAULT NULL,
  p_notes                   TEXT      DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lent_record     public.lent_records%ROWTYPE;
  v_new_repaid      NUMERIC(15,2);
  v_new_outstanding NUMERIC(15,2);
  v_new_status      TEXT;
  v_repayment_id    UUID;
  v_user_id         UUID;
BEGIN
  SELECT *
    INTO v_lent_record
    FROM public.lent_records
   WHERE id = p_lent_record_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lent record % not found.', p_lent_record_id;
  END IF;

  v_user_id := v_lent_record.user_id;

  IF v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied: you do not own this lent record.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Repayment amount must be greater than zero.';
  END IF;

  IF p_amount > v_lent_record.outstanding_amount THEN
    RAISE EXCEPTION 'Repayment amount (%) exceeds outstanding balance (%).',
      p_amount, v_lent_record.outstanding_amount;
  END IF;

  v_new_repaid      := v_lent_record.amount_repaid + p_amount;
  v_new_outstanding := v_lent_record.outstanding_amount - p_amount;
  v_new_status      := CASE WHEN v_new_outstanding = 0 THEN 'repaid' ELSE v_lent_record.status END;

  INSERT INTO public.lent_repayments (
    user_id,
    lent_record_id,
    amount,
    repayment_date,
    expected_remaining_date,
    destination_account_id,
    notes
  )
  VALUES (
    v_user_id,
    p_lent_record_id,
    p_amount,
    p_repayment_date,
    p_expected_remaining_date,
    p_destination_account_id,
    p_notes
  )
  RETURNING id INTO v_repayment_id;

  UPDATE public.lent_records
     SET amount_repaid      = v_new_repaid,
         outstanding_amount = v_new_outstanding,
         status             = v_new_status
   WHERE id = p_lent_record_id;

  INSERT INTO public.transactions (
    user_id,
    transaction_type,
    amount,
    account_id,
    payment_mode,
    transaction_date,
    description,
    related_lent_id
  )
  VALUES (
    v_user_id,
    'repayment',
    p_amount,
    p_destination_account_id,
    v_lent_record.payment_mode,
    p_repayment_date,
    COALESCE(p_notes, 'Repayment from ' || v_lent_record.person_name),
    p_lent_record_id
  );

  RETURN (
    SELECT row_to_json(r)
      FROM (
        SELECT *
          FROM public.lent_repayments
         WHERE id = v_repayment_id
      ) r
  );
END;
$$;

-- ============================================================================
-- 9. MONTHLY FINANCIAL SUMMARY AGGREGATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  p_user_id UUID,
  p_year    INT,
  p_month   INT
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date   DATE;
  v_result     JSON;
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied: you may only view your own summary.';
  END IF;

  v_start_date := make_date(p_year, p_month, 1);
  v_end_date   := (v_start_date + INTERVAL '1 month')::DATE - 1;

  SELECT json_build_object(
    'year',              p_year,
    'month',             p_month,
    'total_income',      COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income'),     0),
    'total_expenses',    COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense'),    0),
    'total_investments', COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'investment'), 0),
    'total_lent',        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'lent'),       0),
    'total_repayments',  COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'repayment'),  0)
  )
  INTO v_result
  FROM public.transactions
  WHERE user_id          = p_user_id
    AND transaction_date >= v_start_date
    AND transaction_date <= v_end_date;

  RETURN v_result;
END;
$$;
