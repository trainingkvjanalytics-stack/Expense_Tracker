-- ============================================================================
-- Migration 001: Initial Schema for My Money Tracker
-- ============================================================================
-- Creates all tables, indexes, and the updated_at trigger function.
-- Table creation order respects foreign key dependencies.
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

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  currency_code TEXT      DEFAULT 'INR',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profile extending Supabase auth.users.';

-- --------------------------------------------------------------------------
-- accounts
-- --------------------------------------------------------------------------
CREATE TABLE public.accounts (
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

COMMENT ON TABLE public.accounts IS 'Bank accounts, wallets, and cash holdings.';

-- --------------------------------------------------------------------------
-- categories
-- --------------------------------------------------------------------------
CREATE TABLE public.categories (
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

COMMENT ON TABLE public.categories IS 'Income/expense categories per user.';

-- --------------------------------------------------------------------------
-- subcategories
-- --------------------------------------------------------------------------
CREATE TABLE public.subcategories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID        NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (category_id, name)
);

COMMENT ON TABLE public.subcategories IS 'Optional sub-categories within a category.';

-- --------------------------------------------------------------------------
-- lent_records  (must precede transactions)
-- --------------------------------------------------------------------------
CREATE TABLE public.lent_records (
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

COMMENT ON TABLE public.lent_records IS 'Money lent to other people, tracked until repaid.';

-- --------------------------------------------------------------------------
-- investments  (must precede transactions)
-- --------------------------------------------------------------------------
CREATE TABLE public.investments (
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

COMMENT ON TABLE public.investments IS 'SIP and one-time investment records.';

-- --------------------------------------------------------------------------
-- transactions
-- --------------------------------------------------------------------------
CREATE TABLE public.transactions (
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

COMMENT ON TABLE public.transactions IS 'All financial transactions: income, expense, transfer, investment, lent, repayment.';

-- --------------------------------------------------------------------------
-- lent_repayments
-- --------------------------------------------------------------------------
CREATE TABLE public.lent_repayments (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lent_record_id         UUID        NOT NULL REFERENCES public.lent_records(id) ON DELETE CASCADE,
  amount                 NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  repayment_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  expected_remaining_date DATE,
  destination_account_id UUID        REFERENCES public.accounts(id) ON DELETE SET NULL,
  notes                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.lent_repayments IS 'Individual repayment entries against a lent record.';

-- --------------------------------------------------------------------------
-- app_settings
-- --------------------------------------------------------------------------
CREATE TABLE public.app_settings (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_opening_balance NUMERIC(15,2) DEFAULT 0,
  initial_balance_date    DATE        DEFAULT CURRENT_DATE,
  currency_code           TEXT        DEFAULT 'INR',
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.app_settings IS 'Per-user application settings and onboarding data.';

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- profiles: PK is already the user id, no extra index needed.

-- accounts
CREATE INDEX idx_accounts_user_id ON public.accounts (user_id);

-- categories
CREATE INDEX idx_categories_user_id ON public.categories (user_id);

-- subcategories
CREATE INDEX idx_subcategories_user_id    ON public.subcategories (user_id);
CREATE INDEX idx_subcategories_category_id ON public.subcategories (category_id);

-- lent_records
CREATE INDEX idx_lent_records_user_id ON public.lent_records (user_id);
CREATE INDEX idx_lent_records_status  ON public.lent_records (status);

-- investments
CREATE INDEX idx_investments_user_id ON public.investments (user_id);

-- transactions
CREATE INDEX idx_transactions_user_id          ON public.transactions (user_id);
CREATE INDEX idx_transactions_transaction_date ON public.transactions (transaction_date);
CREATE INDEX idx_transactions_account_id       ON public.transactions (account_id);
CREATE INDEX idx_transactions_category_id      ON public.transactions (category_id);

-- lent_repayments
CREATE INDEX idx_lent_repayments_user_id        ON public.lent_repayments (user_id);
CREATE INDEX idx_lent_repayments_lent_record_id ON public.lent_repayments (lent_record_id);

-- app_settings: user_id already has a UNIQUE constraint (acts as index).

-- ============================================================================
-- 4. TRIGGERS: auto-update updated_at
-- ============================================================================
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lent_records_updated_at
  BEFORE UPDATE ON public.lent_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
