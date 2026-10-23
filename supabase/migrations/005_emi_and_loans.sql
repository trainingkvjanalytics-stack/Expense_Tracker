-- ============================================================================
-- Migration 005: EMI and Loan Module Schema
-- ============================================================================
-- Creates tables for tracking Loans/EMIs and their individual installment repayments.
-- Can be executed directly in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jjmkpctjnpjjkpusduei/sql
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. loans table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT          NOT NULL,
  loan_type        TEXT          NOT NULL DEFAULT 'other',
  principal_amount NUMERIC(15,2) NOT NULL CHECK (principal_amount > 0),
  interest_rate    NUMERIC(6,3)  NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  tenure_months    INTEGER       NOT NULL CHECK (tenure_months > 0),
  start_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
  repayment_day    INTEGER       NOT NULL DEFAULT 1 CHECK (repayment_day >= 1 AND repayment_day <= 31),
  account_id       UUID          REFERENCES public.accounts(id) ON DELETE SET NULL,
  monthly_emi      NUMERIC(15,2) NOT NULL DEFAULT 0,
  status           TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  notes            TEXT,
  created_at       TIMESTAMPTZ   DEFAULT now(),
  updated_at       TIMESTAMPTZ   DEFAULT now()
);

COMMENT ON TABLE public.loans IS 'Loan and EMI contracts tracked for repayment with amortization.';

-- --------------------------------------------------------------------------
-- 2. loan_payments table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id                 UUID          NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  user_id                 UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installment_number      INTEGER       NOT NULL CHECK (installment_number >= 0),
  scheduled_date          DATE          NOT NULL,
  scheduled_amount        NUMERIC(15,2) NOT NULL,
  actual_amount_paid      NUMERIC(15,2) NOT NULL CHECK (actual_amount_paid > 0),
  payment_date            DATE          NOT NULL DEFAULT CURRENT_DATE,
  principal_paid          NUMERIC(15,2) NOT NULL DEFAULT 0,
  interest_paid           NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_balance_after NUMERIC(15,2) NOT NULL DEFAULT 0,
  account_id              UUID          REFERENCES public.accounts(id) ON DELETE SET NULL,
  transaction_id          UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  payment_mode            TEXT          CHECK (payment_mode IN ('cash', 'card', 'upi')),
  payment_type            TEXT          NOT NULL DEFAULT 'regular_emi' CHECK (payment_type IN ('regular_emi', 'extra_prepayment')),
  is_extra                BOOLEAN       NOT NULL DEFAULT false,
  notes                   TEXT,
  created_at              TIMESTAMPTZ   DEFAULT now()
);

-- Idempotent column additions if table was created previously
ALTER TABLE public.loan_payments ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'regular_emi';
ALTER TABLE public.loan_payments ADD COLUMN IF NOT EXISTS is_extra BOOLEAN NOT NULL DEFAULT false;

COMMENT ON TABLE public.loan_payments IS 'Recorded installment payments and prepayments against a loan.';

-- --------------------------------------------------------------------------
-- 3. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_user_id ON public.loan_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON public.loan_payments(payment_date);

-- --------------------------------------------------------------------------
-- 4. Triggers
-- --------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_loans_updated_at ON public.loans;
CREATE TRIGGER trg_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 5. Row-Level Security (RLS)
-- --------------------------------------------------------------------------
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own loans"
  ON public.loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loans"
  ON public.loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loans"
  ON public.loans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loans"
  ON public.loans FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own loan payments"
  ON public.loan_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loan payments"
  ON public.loan_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loan payments"
  ON public.loan_payments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loan payments"
  ON public.loan_payments FOR DELETE
  USING (auth.uid() = user_id);
