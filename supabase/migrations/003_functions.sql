-- ============================================================================
-- Migration 003: Database Functions for My Money Tracker
-- ============================================================================
-- 1. handle_new_user()          – auth trigger for onboarding
-- 2. process_lent_repayment()   – atomic repayment processing
-- 3. get_monthly_summary()      – monthly income/expense aggregation
-- ============================================================================

-- ============================================================================
-- 1. handle_new_user()
--    Triggered AFTER INSERT on auth.users. Creates a profile, default
--    app_settings, and seeds default categories via seed_default_categories().
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                       -- bypass RLS during signup
SET search_path = public
AS $$
BEGIN
  -- Create profile row
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );

  -- Create default app settings
  INSERT INTO public.app_settings (user_id)
  VALUES (NEW.id);

  -- Seed default categories (defined in 004_seed_categories.sql)
  PERFORM public.seed_default_categories(NEW.id);

  RETURN NEW;
END;
$$;

-- Attach the trigger to Supabase auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user()
  IS 'Auth trigger: provisions profile, app_settings, and default categories for new users.';

-- ============================================================================
-- 2. process_lent_repayment()
--    Atomically validates and records a repayment against a lent_record.
--    - Ensures repayment amount does not exceed outstanding balance.
--    - Creates a lent_repayments row.
--    - Updates lent_records (amount_repaid, outstanding_amount, status).
--    - Creates a 'repayment' transaction for audit trail.
--    Returns the new lent_repayments row as JSON.
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
  -- Lock the lent record to prevent concurrent modifications
  SELECT *
    INTO v_lent_record
    FROM public.lent_records
   WHERE id = p_lent_record_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lent record % not found.', p_lent_record_id;
  END IF;

  v_user_id := v_lent_record.user_id;

  -- Verify the caller owns this record
  IF v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied: you do not own this lent record.';
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Repayment amount must be greater than zero.';
  END IF;

  IF p_amount > v_lent_record.outstanding_amount THEN
    RAISE EXCEPTION 'Repayment amount (%) exceeds outstanding balance (%).',
      p_amount, v_lent_record.outstanding_amount;
  END IF;

  -- Calculate new values
  v_new_repaid      := v_lent_record.amount_repaid + p_amount;
  v_new_outstanding := v_lent_record.outstanding_amount - p_amount;
  v_new_status      := CASE WHEN v_new_outstanding = 0 THEN 'repaid' ELSE v_lent_record.status END;

  -- 1) Insert repayment record
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

  -- 2) Update the lent record
  UPDATE public.lent_records
     SET amount_repaid      = v_new_repaid,
         outstanding_amount = v_new_outstanding,
         status             = v_new_status
   WHERE id = p_lent_record_id;

  -- 3) Create an audit transaction
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

  -- Return the newly created repayment
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

COMMENT ON FUNCTION public.process_lent_repayment(UUID, NUMERIC, DATE, DATE, UUID, TEXT)
  IS 'Atomically processes a lent repayment: validates, records repayment, updates lent_record, creates transaction.';

-- ============================================================================
-- 3. get_monthly_summary()
--    Aggregates transactions for the given user/year/month.
--    Returns a JSON object with:
--      total_income, total_expenses, total_investments, total_lent, total_repayments
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  p_user_id UUID,
  p_year    INT,
  p_month   INT
)
RETURNS JSON
LANGUAGE plpgsql
STABLE                                -- read-only, safe to cache
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date   DATE;
  v_result     JSON;
BEGIN
  -- Verify the caller is requesting their own data
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

COMMENT ON FUNCTION public.get_monthly_summary(UUID, INT, INT)
  IS 'Returns a JSON summary of income, expenses, investments, lent, and repayments for a given month.';
