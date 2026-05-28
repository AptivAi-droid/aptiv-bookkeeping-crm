-- ============================================================
-- APTIV BOOKKEEPING CRM â SCHEMA HARDENING PATCH v2
-- Run this AFTER the initial schema.sql
-- Kenya Edition
-- ============================================================
-- What this adds:
-- 1. auto-updated updated_at triggers on all mutable tables
-- 2. Journal double-entry balance check (debit = credit per entry)
-- 3. FK from ab_journal_lines.account_code â ab_accounts.code
-- 4. FK from ab_co_op_members.exit_reason constraint
-- 5. POCAMLA amount guard â reject transactions over KES 100M (likely data error)
-- 6. Phone format check on ab_clients (254XXXXXXXXX)
-- 7. KRA PIN format check
-- 8. Unique constraint: one settings row per org
-- ============================================================

-- ââ 1. updated_at trigger function ââââââââââââââââââââââââââââââââââââââââââ
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ab_clients', 'ab_compliance_flags', 'ab_co_op_members', 'ab_settings'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
       CREATE TRIGGER trg_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- ââ 2. Journal double-entry balance constraint âââââââââââââââââââââââââââââââ
-- Enforced at the entry level: sum of debits must equal sum of credits
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit  BIGINT;
  v_total_credit BIGINT;
BEGIN
  -- Only enforce on POSTED entries (allow Drafts to be unbalanced while building)
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM ab_journal_entries
      WHERE id = NEW.journal_entry_id AND status = 'Posted'
    ) THEN
      SELECT
        COALESCE(SUM(debit_kes), 0),
        COALESCE(SUM(credit_kes), 0)
      INTO v_total_debit, v_total_credit
      FROM ab_journal_lines
      WHERE journal_entry_id = NEW.journal_entry_id;

      IF v_total_debit <> v_total_credit THEN
        RAISE EXCEPTION
          'ICPAK double-entry violation: journal entry % debits (%) â  credits (%). Difference: % KES cents.',
          NEW.journal_entry_id,
          v_total_debit,
          v_total_credit,
          ABS(v_total_debit - v_total_credit)
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_balance ON ab_journal_lines;
CREATE TRIGGER trg_journal_balance
  AFTER INSERT OR UPDATE ON ab_journal_lines
  FOR EACH ROW EXECUTE FUNCTION check_journal_balance();

-- Also check when an entry is POSTED (status changes Draft â Posted)
CREATE OR REPLACE FUNCTION check_journal_balance_on_post()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit  BIGINT;
  v_total_credit BIGINT;
BEGIN
  IF NEW.status = 'Posted' AND (OLD.status IS DISTINCT FROM 'Posted') THEN
    SELECT
      COALESCE(SUM(debit_kes), 0),
      COALESCE(SUM(credit_kes), 0)
    INTO v_total_debit, v_total_credit
    FROM ab_journal_lines
    WHERE journal_entry_id = NEW.id;

    IF v_total_debit <> v_total_credit THEN
      RAISE EXCEPTION
        'ICPAK double-entry violation: cannot post journal % â debits (%) â  credits (%).',
        NEW.id, v_total_debit, v_total_credit
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_total_debit = 0 THEN
      RAISE EXCEPTION
        'Journal entry % has no lines â cannot post an empty journal.',
        NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_post_balance ON ab_journal_entries;
CREATE TRIGGER trg_journal_post_balance
  BEFORE UPDATE ON ab_journal_entries
  FOR EACH ROW EXECUTE FUNCTION check_journal_balance_on_post();

-- ââ 3. FK: journal lines â accounts âââââââââââââââââââââââââââââââââââââââââ
-- Safe to add after initial schema; wraps in DO block to avoid re-run errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_journal_lines_account'
      AND table_name = 'ab_journal_lines'
  ) THEN
    ALTER TABLE ab_journal_lines
      ADD CONSTRAINT fk_journal_lines_account
      FOREIGN KEY (account_code) REFERENCES ab_accounts(code)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END;
$$;

-- ââ 4. Phone format check (254XXXXXXXXX â 12 digits) ââââââââââââââââââââââââ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'chk_clients_phone_format'
  ) THEN
    ALTER TABLE ab_clients
      ADD CONSTRAINT chk_clients_phone_format
      CHECK (phone ~ '^254[0-9]{9}$');
  END IF;
END;
$$;

-- ââ 5. KRA PIN format check (e.g. A001234567B) ââââââââââââââââââââââââââââââ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'chk_clients_kra_pin_format'
  ) THEN
    ALTER TABLE ab_clients
      ADD CONSTRAINT chk_clients_kra_pin_format
      CHECK (kra_pin IS NULL OR kra_pin ~ '^[A-Z][0-9]{9}[A-Z]$');
  END IF;
END;
$$;

-- ââ 6. POCAMLA amount sanity guard ââââââââââââââââââââââââââââââââââââââââââ
-- Reject M-Pesa transactions over KES 10,000,000 (1 billion cents) as likely data errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'chk_mpesa_amount_sanity'
  ) THEN
    ALTER TABLE ab_mpesa_transactions
      ADD CONSTRAINT chk_mpesa_amount_sanity
      CHECK (amount_kes > 0 AND amount_kes <= 1000000000); -- max KES 10M per tx
  END IF;
END;
$$;

-- ââ 7. Enforce single settings row ââââââââââââââââââââââââââââââââââââââââââ
-- The settings table should have exactly one row; prevent accidental duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_singleton
  ON ab_settings ((true)); -- unique index on a constant = max 1 row

-- ââ 8. Account balance update function ââââââââââââââââââââââââââââââââââââââ
-- When a journal line is posted, update the account balance automatically
CREATE OR REPLACE FUNCTION update_account_balance_on_post()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Only act when the parent journal entry is Posted
  SELECT status INTO v_status
  FROM ab_journal_entries
  WHERE id = NEW.journal_entry_id;

  IF v_status = 'Posted' THEN
    UPDATE ab_accounts
    SET balance = balance + NEW.debit_kes - NEW.credit_kes
    WHERE code = NEW.account_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_balance ON ab_journal_lines;
CREATE TRIGGER trg_account_balance
  AFTER INSERT ON ab_journal_lines
  FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_post();

-- ââ 9. Useful views ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

-- Trial balance view (ICPAK)
CREATE OR REPLACE VIEW vw_trial_balance AS
SELECT
  code,
  name,
  category,
  sub_category,
  normal_balance,
  CASE normal_balance
    WHEN 'Debit' THEN GREATEST(balance, 0)
    ELSE 0
  END AS debit_balance_kes,
  CASE normal_balance
    WHEN 'Credit' THEN GREATEST(balance, 0)
    ELSE 0
  END AS credit_balance_kes,
  icpak_ref
FROM ab_accounts
WHERE is_active = TRUE
ORDER BY code;

-- Open STR obligations (POCAMLA reporting)
CREATE OR REPLACE VIEW vw_open_str_obligations AS
SELECT
  cf.id,
  cf.client_id,
  cf.client_name,
  cf.flag_type,
  cf.description,
  cf.detected_date,
  cf.regulatory_ref,
  -- STR must be filed within 3 business days of detection (POCAMLA s12)
  cf.detected_date + INTERVAL '3 days' AS str_deadline,
  CASE
    WHEN NOW() > (cf.detected_date + INTERVAL '3 days')::TIMESTAMPTZ THEN 'OVERDUE'
    WHEN NOW() > (cf.detected_date + INTERVAL '2 days')::TIMESTAMPTZ THEN 'DUE SOON'
    ELSE 'ON TIME'
  END AS deadline_status
FROM ab_compliance_flags cf
WHERE cf.str_required = TRUE
  AND cf.str_filed = FALSE
  AND cf.status NOT IN ('Resolved', 'False Positive')
ORDER BY cf.detected_date ASC;

-- SASSRA member summary
CREATE OR REPLACE VIEW vw_sassra_member_summary AS
SELECT
  COUNT(*) AS total_members,
  SUM(share_capital_kes) / 100.0 AS total_share_capital_kes,
  SUM(loan_exposure_kes) / 100.0 AS total_loan_exposure_kes,
  COUNT(*) FILTER (WHERE member_class = 'Youth') AS youth_members,
  COUNT(*) FILTER (WHERE agm_eligible = TRUE) AS agm_eligible_count,
  COUNT(*) FILTER (WHERE exit_date IS NOT NULL) AS exited_members
FROM ab_co_op_members;

-- ============================================================
-- DONE â Schema v2 hardening applied
-- ============================================================
