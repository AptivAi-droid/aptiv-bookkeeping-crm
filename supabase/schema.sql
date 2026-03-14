-- ============================================================
-- APTIV BOOKKEEPING CRM — SUPABASE SCHEMA
-- Kenya Edition
-- Regulatory Compliance:
--   • CBK (Central Bank of Kenya) — KYC/AML directives
--   • POCAMLA (Proceeds of Crime and Anti-Money Laundering Act)
--   • SASSRA (Sacco Societies Regulatory Authority)
--   • ICPAK (Institute of Certified Public Accountants of Kenya)
--   • Commissioner of Co-operatives — Co-operative Societies Act
--   • Data Protection Act (Kenya, 2019)
-- Currency: KES (Kenya Shillings)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ab_clients  (CRM Core — KYC/AML compliant)
-- CBK KYC Directive 2013 + POCAMLA s44 requirements
-- ============================================================
CREATE TABLE ab_clients (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crm_id                 TEXT UNIQUE NOT NULL,          -- e.g. APTIV-KE-00001
  -- Personal Identification
  first_name             TEXT NOT NULL,
  last_name              TEXT NOT NULL,
  date_of_birth          DATE,
  gender                 TEXT CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
  nationality            TEXT DEFAULT 'Kenyan',
  -- Kenya ID Documents (CBK KYC — at least one required)
  national_id_number     TEXT,                          -- Kenyan National ID
  passport_number        TEXT,                          -- Passport
  alien_id_number        TEXT,                          -- Alien ID (non-citizens)
  kra_pin                TEXT,                          -- KRA PIN (tax compliance)
  -- Contact
  phone                  TEXT NOT NULL,                 -- 254XXXXXXXXX format
  email                  TEXT,
  physical_address       TEXT,
  county                 TEXT,                          -- Kenya county
  postal_address         TEXT,
  -- SACCO / Co-operative Membership
  member_number          TEXT,                          -- SACCO member number
  sacco_share_capital    BIGINT DEFAULT 0,              -- KES (stored in cents)
  sacco_savings_balance  BIGINT DEFAULT 0,              -- KES (stored in cents)
  sacco_loan_balance     BIGINT DEFAULT 0,              -- KES (stored in cents)
  co_op_reg_number       TEXT,                          -- Commissioner of Co-operatives
  -- KYC Status (CBK Directive)
  kyc_status             TEXT NOT NULL DEFAULT 'Pending'
                         CHECK (kyc_status IN ('Verified', 'Pending', 'Incomplete', 'Rejected', 'Under Review')),
  kyc_verified_date      DATE,
  kyc_verified_by        UUID,
  kyc_doc_id_verified    BOOLEAN DEFAULT FALSE,         -- ID document verified
  kyc_doc_address_verified BOOLEAN DEFAULT FALSE,       -- Proof of address verified
  kyc_doc_income_verified  BOOLEAN DEFAULT FALSE,       -- Source of funds verified
  -- AML Risk Rating (POCAMLA + CBK)
  aml_risk_rating        TEXT NOT NULL DEFAULT 'Low'
                         CHECK (aml_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  aml_pep_status         BOOLEAN DEFAULT FALSE,         -- Politically Exposed Person
  aml_sanctions_checked  BOOLEAN DEFAULT FALSE,         -- UN/OFAC/AU sanctions check
  aml_sanctions_date     DATE,
  -- Source of Funds (POCAMLA s44)
  source_of_funds        TEXT,
  source_of_funds_docs   BOOLEAN DEFAULT FALSE,
  -- SASSRA-specific (for SACCO clients)
  sassra_member_class    TEXT CHECK (sassra_member_class IN ('Individual', 'Corporate', 'Institutional', 'Youth', NULL)),
  sassra_admission_date  DATE,
  -- Client Status
  status                 TEXT NOT NULL DEFAULT 'Active'
                         CHECK (status IN ('Active', 'Dormant', 'Suspended', 'Exited', 'Deceased')),
  client_type            TEXT NOT NULL DEFAULT 'Individual'
                         CHECK (client_type IN ('Individual', 'Corporate', 'Co-operative', 'Partnership', 'NGO')),
  -- Bookkeeping Bridge
  bookkeeping_member_id  UUID,                          -- Linked roots-bookkeeping member ID
  bridge_synced          BOOLEAN DEFAULT FALSE,
  bridge_last_sync       TIMESTAMPTZ,
  -- M-Pesa
  mpesa_phone            TEXT,                          -- Registered M-Pesa number
  -- Metadata
  onboarded_by           UUID,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ab_kyc_documents (KYC document tracking — CBK)
-- ============================================================
CREATE TABLE ab_kyc_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES ab_clients(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL CHECK (doc_type IN (
                    'National ID', 'Passport', 'Alien ID', 'KRA PIN',
                    'Utility Bill', 'Bank Statement', 'Pay Slip',
                    'Business Registration', 'Co-op Certificate', 'Other')),
  doc_reference   TEXT,
  doc_number      TEXT,
  issue_date      DATE,
  expiry_date     DATE,
  verified        BOOLEAN DEFAULT FALSE,
  verified_by     UUID,
  verified_date   DATE,
  storage_url     TEXT,                                  -- Supabase Storage path
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. ab_mpesa_transactions (M-Pesa Daraja integration)
-- All amounts in KES (stored as integer cents)
-- ============================================================
CREATE TABLE ab_mpesa_transactions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID REFERENCES ab_clients(id) ON DELETE SET NULL,
  client_name           TEXT,
  -- Daraja fields
  merchant_request_id   TEXT,
  checkout_request_id   TEXT,
  mpesa_receipt         TEXT UNIQUE,                     -- M-Pesa transaction ID
  phone_number          TEXT NOT NULL,
  amount_kes            BIGINT NOT NULL,                 -- KES in cents
  transaction_type      TEXT NOT NULL DEFAULT 'C2B'
                        CHECK (transaction_type IN ('STK Push', 'C2B', 'B2C', 'B2B')),
  transaction_date      TIMESTAMPTZ,
  result_code           TEXT,
  result_desc           TEXT,
  status                TEXT NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'Completed', 'Failed', 'Reversed', 'Queried')),
  -- Bookkeeping sync
  bookkeeping_tx_id     UUID,                            -- Linked roots-bookkeeping tx ID
  bookkeeping_synced    BOOLEAN DEFAULT FALSE,
  -- AML flag (POCAMLA — KES 1,000,000 threshold)
  aml_flag              BOOLEAN DEFAULT FALSE,
  -- Metadata
  narrative             TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. ab_compliance_flags (Kenya regulatory — POCAMLA, CBK, SASSRA)
-- ============================================================
CREATE TABLE ab_compliance_flags (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID REFERENCES ab_clients(id) ON DELETE SET NULL,
  client_name         TEXT,
  mpesa_tx_id         UUID REFERENCES ab_mpesa_transactions(id) ON DELETE SET NULL,
  severity            TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  flag_type           TEXT NOT NULL,
  description         TEXT NOT NULL,
  -- Regulatory reference
  regulatory_body     TEXT CHECK (regulatory_body IN ('CBK', 'SASSRA', 'ICPAK', 'Commissioner of Co-operatives', 'POCAMLA', 'KRA', 'DPO')),
  regulatory_ref      TEXT,                             -- e.g. "POCAMLA s44(1)"
  -- Reporting obligation
  str_required        BOOLEAN DEFAULT FALSE,            -- Suspicious Transaction Report to CBK
  str_filed           BOOLEAN DEFAULT FALSE,
  str_filed_date      DATE,
  str_reference       TEXT,
  -- Status
  status              TEXT NOT NULL DEFAULT 'Open'
                      CHECK (status IN ('Open', 'In Review', 'Escalated', 'STR Filed', 'Resolved', 'False Positive')),
  detected_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_to         UUID,
  resolved_date       DATE,
  resolution_notes    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ab_accounts (Kenya Chart of Accounts — ICPAK/IFRS)
-- ============================================================
CREATE TABLE ab_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
  sub_category    TEXT,
  normal_balance  TEXT NOT NULL CHECK (normal_balance IN ('Debit', 'Credit')),
  balance         BIGINT NOT NULL DEFAULT 0,            -- KES cents
  is_active       BOOLEAN DEFAULT TRUE,
  icpak_ref       TEXT,                                 -- ICPAK/IFRS standard reference
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. ab_transactions (Bookkeeping ledger — KES)
-- ============================================================
CREATE TABLE ab_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id       UUID REFERENCES ab_clients(id) ON DELETE SET NULL,
  client_name     TEXT,
  type            TEXT NOT NULL CHECK (type IN (
                    'Deposit', 'Withdrawal', 'Loan Disbursement', 'Loan Repayment',
                    'Fee', 'Interest', 'Share Purchase', 'Dividend', 'M-Pesa In', 'M-Pesa Out')),
  amount_kes      BIGINT NOT NULL CHECK (amount_kes > 0), -- KES cents
  account_code    TEXT NOT NULL,
  description     TEXT,
  reference       TEXT NOT NULL,
  mpesa_receipt   TEXT,                                 -- if M-Pesa sourced
  status          TEXT NOT NULL DEFAULT 'Posted'
                  CHECK (status IN ('Posted', 'Draft', 'Unallocated', 'Reversed')),
  pocamla_flag    BOOLEAN DEFAULT FALSE,                -- >KES 1M triggers POCAMLA review
  reconciled      BOOLEAN DEFAULT FALSE,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ab_journal_entries (Double-entry — ICPAK/IFRS)
-- ============================================================
CREATE TABLE ab_journal_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference    TEXT UNIQUE NOT NULL,
  entry_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  description  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'Draft'
               CHECK (status IN ('Draft', 'Posted', 'Reversed')),
  reversed_by  UUID,
  reversal_date DATE,
  reversal_notes TEXT,
  created_by   UUID,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. ab_journal_lines
-- ============================================================
CREATE TABLE ab_journal_lines (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id  UUID NOT NULL REFERENCES ab_journal_entries(id) ON DELETE CASCADE,
  account_code      TEXT NOT NULL,
  account_name      TEXT NOT NULL,
  debit_kes         BIGINT NOT NULL DEFAULT 0 CHECK (debit_kes >= 0),
  credit_kes        BIGINT NOT NULL DEFAULT 0 CHECK (credit_kes >= 0),
  description       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. ab_reconciliations (Bank recon — including M-Pesa float)
-- ============================================================
CREATE TABLE ab_reconciliations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period                TEXT NOT NULL,
  bank_balance_kes      BIGINT,
  mpesa_float_kes       BIGINT,                         -- M-Pesa float balance
  book_balance_kes      BIGINT,
  variance_kes          BIGINT,
  status                TEXT NOT NULL DEFAULT 'In Progress'
                        CHECK (status IN ('In Progress', 'Completed', 'Disputed')),
  unreconciled_items    INT DEFAULT 0,
  notes                 TEXT,
  completed_by          TEXT,
  completed_date        DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. ab_sassra_reports (SASSRA statutory returns)
-- ============================================================
CREATE TABLE ab_sassra_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type     TEXT NOT NULL CHECK (report_type IN (
                    'Monthly Returns', 'Quarterly Prudential', 'Annual Audited',
                    'Liquidity Ratio', 'Capital Adequacy', 'Loan Portfolio')),
  period          TEXT NOT NULL,                        -- e.g. "2025-Q1"
  due_date        DATE NOT NULL,
  submitted_date  DATE,
  status          TEXT NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending', 'Prepared', 'Submitted', 'Accepted', 'Queried', 'Overdue')),
  -- Key ratios (SASSRA Prudential Standards)
  capital_adequacy_ratio  NUMERIC(5,2),                 -- Min 10% (SASSRA)
  liquidity_ratio         NUMERIC(5,2),                 -- Min 15% (SASSRA)
  loan_to_asset_ratio     NUMERIC(5,2),                 -- Max 70% (SASSRA)
  external_borrowing_ratio NUMERIC(5,2),                -- Max 25% (SASSRA)
  total_assets_kes        BIGINT,
  total_deposits_kes      BIGINT,
  total_loans_kes         BIGINT,
  total_equity_kes        BIGINT,
  notes           TEXT,
  prepared_by     UUID,
  submitted_by    UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. ab_co_op_members (Commissioner of Co-operatives register)
-- ============================================================
CREATE TABLE ab_co_op_members (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID NOT NULL REFERENCES ab_clients(id) ON DELETE CASCADE,
  member_number         TEXT UNIQUE NOT NULL,
  admission_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  share_capital_kes     BIGINT NOT NULL DEFAULT 0,      -- KES cents
  shares_held           INTEGER DEFAULT 0,
  share_value_kes       BIGINT DEFAULT 100000,          -- KES 1,000 per share (cents)
  dividend_entitlement  BIGINT DEFAULT 0,
  loan_exposure_kes     BIGINT DEFAULT 0,
  member_class          TEXT NOT NULL DEFAULT 'Regular'
                        CHECK (member_class IN ('Regular', 'Associate', 'Institutional', 'Youth', 'Deceased')),
  exit_date             DATE,
  exit_reason           TEXT,
  -- AGM voting rights
  agm_eligible          BOOLEAN DEFAULT TRUE,
  agm_last_attended     DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. ab_users
-- ============================================================
CREATE TABLE ab_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id  UUID UNIQUE,
  email         TEXT UNIQUE NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'Viewer'
                CHECK (role IN ('Admin', 'COO', 'Compliance Officer', 'Viewer')),
  status        TEXT NOT NULL DEFAULT 'Active'
                CHECK (status IN ('Active', 'Inactive', 'Pending')),
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. ab_settings (Kenya org config)
-- ============================================================
CREATE TABLE ab_settings (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name                    TEXT NOT NULL DEFAULT 'Aptiv Bookkeeping CRM',
  registration_number         TEXT,                     -- Kenya Companies Act / Co-op reg
  cbk_licence_number          TEXT,                     -- Central Bank of Kenya
  sassra_registration         TEXT,                     -- SASSRA registration number
  icpak_registration          TEXT,                     -- ICPAK firm registration
  co_op_reg_number            TEXT,                     -- Commissioner of Co-operatives
  kra_pin                     TEXT,                     -- KRA PIN
  vat_number                  TEXT,                     -- VAT registration
  county                      TEXT,                     -- Kenya county of registration
  address                     TEXT,
  phone                       TEXT,
  email                       TEXT,
  financial_year_end          TEXT DEFAULT 'June',      -- Kenya common FY end
  currency                    TEXT DEFAULT 'KES',
  -- POCAMLA thresholds
  pocamla_cash_threshold      BIGINT DEFAULT 100000000, -- KES 1,000,000 (in cents)
  -- SASSRA minimums
  sassra_min_capital_ratio    NUMERIC(5,2) DEFAULT 10.00,
  sassra_min_liquidity_ratio  NUMERIC(5,2) DEFAULT 15.00,
  -- M-Pesa config
  mpesa_shortcode             TEXT,
  mpesa_env                   TEXT DEFAULT 'sandbox',
  -- Bookkeeping bridge
  bridge_api_url              TEXT,
  bridge_enabled              BOOLEAN DEFAULT FALSE,
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. ab_audit_log (permanent — Data Protection Act 2019)
-- ============================================================
CREATE TABLE ab_audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email    TEXT NOT NULL,
  user_role     TEXT,
  action        TEXT NOT NULL,
  description   TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_clients_kyc       ON ab_clients(kyc_status);
CREATE INDEX idx_clients_aml       ON ab_clients(aml_risk_rating);
CREATE INDEX idx_clients_status    ON ab_clients(status);
CREATE INDEX idx_clients_id_number ON ab_clients(national_id_number);
CREATE INDEX idx_clients_kra       ON ab_clients(kra_pin);
CREATE INDEX idx_mpesa_receipt     ON ab_mpesa_transactions(mpesa_receipt);
CREATE INDEX idx_mpesa_client      ON ab_mpesa_transactions(client_id);
CREATE INDEX idx_mpesa_aml         ON ab_mpesa_transactions(aml_flag) WHERE aml_flag = TRUE;
CREATE INDEX idx_tx_date           ON ab_transactions(date);
CREATE INDEX idx_tx_client         ON ab_transactions(client_id);
CREATE INDEX idx_tx_pocamla        ON ab_transactions(pocamla_flag) WHERE pocamla_flag = TRUE;
CREATE INDEX idx_flags_severity    ON ab_compliance_flags(severity);
CREATE INDEX idx_flags_status      ON ab_compliance_flags(status);
CREATE INDEX idx_flags_str         ON ab_compliance_flags(str_required) WHERE str_required = TRUE;
CREATE INDEX idx_audit_created     ON ab_audit_log(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE ab_clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_kyc_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_mpesa_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_compliance_flags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_journal_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_journal_lines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_reconciliations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_sassra_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_co_op_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_audit_log            ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM ab_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Clients — read all authenticated; write Admin/COO/Compliance
CREATE POLICY "clients_select" ON ab_clients FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "clients_insert" ON ab_clients FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('Admin', 'COO', 'Compliance Officer'));
CREATE POLICY "clients_update" ON ab_clients FOR UPDATE TO authenticated USING (get_user_role() IN ('Admin', 'COO', 'Compliance Officer'));
CREATE POLICY "clients_delete" ON ab_clients FOR DELETE TO authenticated USING (get_user_role() = 'Admin');

-- KYC Documents
CREATE POLICY "kyc_select" ON ab_kyc_documents FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "kyc_insert" ON ab_kyc_documents FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('Admin', 'COO', 'Compliance Officer'));
CREATE POLICY "kyc_update" ON ab_kyc_documents FOR UPDATE TO authenticated USING (get_user_role() IN ('Admin', 'COO', 'Compliance Officer'));

-- M-Pesa Transactions
CREATE POLICY "mpesa_select" ON ab_mpesa_transactions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "mpesa_insert" ON ab_mpesa_transactions FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "mpesa_update" ON ab_mpesa_transactions FOR UPDATE TO authenticated USING (get_user_role() IN ('Admin', 'COO'));

-- Compliance Flags
CREATE POLICY "flags_select" ON ab_compliance_flags FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "flags_insert" ON ab_compliance_flags FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "flags_update" ON ab_compliance_flags FOR UPDATE TO authenticated USING (get_user_role() IN ('Admin', 'COO', 'Compliance Officer'));

-- Transactions
CREATE POLICY "tx_select" ON ab_transactions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "tx_insert" ON ab_transactions FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('Admin', 'COO'));
CREATE POLICY "tx_update" ON ab_transactions FOR UPDATE TO authenticated USING (get_user_role() IN ('Admin', 'COO'));

-- Journal
CREATE POLICY "journal_select" ON ab_journal_entries FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "journal_insert" ON ab_journal_entries FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('Admin', 'COO'));
CREATE POLICY "journal_lines_select" ON ab_journal_lines FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "journal_lines_insert" ON ab_journal_lines FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('Admin', 'COO'));

-- SASSRA Reports — Compliance Officers can prepare
CREATE POLICY "sassra_select" ON ab_sassra_reports FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "sassra_insert" ON ab_sassra_reports FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('Admin', 'COO', 'Compliance Officer'));
CREATE POLICY "sassra_update" ON ab_sassra_reports FOR UPDATE TO authenticated USING (get_user_role() IN ('Admin', 'COO', 'Compliance Officer'));

-- Co-op Members
CREATE POLICY "coop_select" ON ab_co_op_members FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "coop_insert" ON ab_co_op_members FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('Admin', 'COO'));
CREATE POLICY "coop_update" ON ab_co_op_members FOR UPDATE TO authenticated USING (get_user_role() IN ('Admin', 'COO'));

-- Users
CREATE POLICY "users_select" ON ab_users FOR SELECT TO authenticated USING (get_user_role() = 'Admin' OR auth_user_id = auth.uid());
CREATE POLICY "users_insert" ON ab_users FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'Admin');
CREATE POLICY "users_update" ON ab_users FOR UPDATE TO authenticated USING (get_user_role() = 'Admin' OR auth_user_id = auth.uid());

-- Settings
CREATE POLICY "settings_select" ON ab_settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "settings_update" ON ab_settings FOR UPDATE TO authenticated USING (get_user_role() = 'Admin');

-- Audit Log — permanent, no delete
CREATE POLICY "audit_select" ON ab_audit_log FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "audit_insert" ON ab_audit_log FOR INSERT TO authenticated WITH CHECK (TRUE);
-- NO DELETE POLICY — Kenya Data Protection Act 2019 audit trail requirement

-- ============================================================
-- DEFAULT SEED: Kenya Chart of Accounts (ICPAK/IFRS)
-- ============================================================
INSERT INTO ab_accounts (code, name, category, sub_category, normal_balance, icpak_ref) VALUES
-- Assets
('1001', 'Cash and Cash Equivalents',         'Asset',     'Current Assets',       'Debit',  'IAS 7'),
('1002', 'M-Pesa Float',                       'Asset',     'Current Assets',       'Debit',  'IFRS 9'),
('1003', 'Member Savings — Current',           'Asset',     'Current Assets',       'Debit',  'IAS 32'),
('1004', 'Member Loans Receivable',            'Asset',     'Non-Current Assets',   'Debit',  'IFRS 9'),
('1005', 'Interest Receivable',                'Asset',     'Current Assets',       'Debit',  'IAS 18'),
('1006', 'Investment Securities',              'Asset',     'Non-Current Assets',   'Debit',  'IFRS 9'),
('1007', 'Property and Equipment',             'Asset',     'Non-Current Assets',   'Debit',  'IAS 16'),
('1008', 'Prepayments and Deposits',           'Asset',     'Current Assets',       'Debit',  'IAS 1'),
-- Liabilities
('2001', 'Member Deposits — Savings',          'Liability', 'Current Liabilities',  'Credit', 'IAS 32'),
('2002', 'Member Deposits — Fixed',            'Liability', 'Non-Current Liabs',    'Credit', 'IAS 32'),
('2003', 'External Borrowings',                'Liability', 'Non-Current Liabs',    'Credit', 'IAS 32'),
('2004', 'Interest Payable',                   'Liability', 'Current Liabilities',  'Credit', 'IAS 37'),
('2005', 'Tax Payable (KRA)',                  'Liability', 'Current Liabilities',  'Credit', 'IAS 12'),
('2006', 'Accounts Payable',                   'Liability', 'Current Liabilities',  'Credit', 'IAS 37'),
-- Equity
('3001', 'Share Capital',                      'Equity',    'Member Equity',        'Credit', 'IAS 32'),
('3002', 'Institutional Capital',              'Equity',    'Retained Earnings',    'Credit', 'IAS 1'),
('3003', 'Statutory Reserve (SASSRA 10%)',     'Equity',    'Reserves',             'Credit', 'SASSRA'),
('3004', 'Retained Surplus',                   'Equity',    'Retained Earnings',    'Credit', 'IAS 1'),
-- Income
('4001', 'Interest Income — Loans',            'Income',    'Operating Income',     'Credit', 'IFRS 15'),
('4002', 'Fee Income',                         'Income',    'Operating Income',     'Credit', 'IFRS 15'),
('4003', 'M-Pesa Transaction Fees',            'Income',    'Operating Income',     'Credit', 'IFRS 15'),
('4004', 'Investment Income',                  'Income',    'Other Income',         'Credit', 'IFRS 9'),
('4005', 'Late Payment Penalties',             'Income',    'Operating Income',     'Credit', 'IFRS 15'),
-- Expenses
('5001', 'Interest Expense — Deposits',        'Expense',   'Finance Costs',        'Debit',  'IAS 23'),
('5002', 'Staff Costs',                        'Expense',   'Operating Expenses',   'Debit',  'IAS 19'),
('5003', 'Administrative Expenses',            'Expense',   'Operating Expenses',   'Debit',  'IAS 1'),
('5004', 'SASSRA Levy (0.1% of assets)',        'Expense',   'Regulatory Costs',     'Debit',  'SASSRA'),
('5005', 'Provision for Loan Losses',          'Expense',   'Credit Risk',          'Debit',  'IFRS 9'),
('5006', 'Depreciation',                       'Expense',   'Operating Expenses',   'Debit',  'IAS 16'),
('5007', 'Audit Fees (ICPAK)',                 'Expense',   'Professional Fees',    'Debit',  'IAS 1');

-- DEFAULT SETTINGS
INSERT INTO ab_settings (org_name, currency, financial_year_end) VALUES
('Aptiv Bookkeeping CRM', 'KES', 'June');
