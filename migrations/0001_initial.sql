-- vonBusch SoSS — Sales Offer Self Service
-- D1 Schema v1.0

-- Kunden-Auth Sessions (temporär, 48h gültig)
CREATE TABLE IF NOT EXISTS soss_sessions (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL,
  document_id TEXT NOT NULL,
  erp_id      TEXT NOT NULL,
  offer_number TEXT NOT NULL,
  contact_id  TEXT,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  ip_address  TEXT,
  used        INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON soss_sessions(expires_at);

-- Aufträge (signierte Bestellungen)
CREATE TABLE IF NOT EXISTS soss_orders (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL,
  company_id        TEXT NOT NULL,
  document_id       TEXT NOT NULL,
  erp_id            TEXT NOT NULL,
  offer_number      TEXT NOT NULL,
  contact_name      TEXT,
  contact_email     TEXT,
  financing_type    TEXT NOT NULL,  -- kauf / miete / leasing
  financing_partner TEXT,           -- BFL / DLL / GRENKE / MLF / vonBusch
  monthly_rate      REAL,
  total_value       REAL,
  contract_months   INTEGER,
  service_included  INTEGER DEFAULT 0,
  signature_r2_key  TEXT,           -- PNG der Unterschrift in R2
  signed_at         TEXT NOT NULL,
  ip_address        TEXT,
  user_agent        TEXT,
  status            TEXT DEFAULT 'pending',  -- pending / credit_check / approved / rejected
  crm_deal_id       TEXT,           -- angelegter Won-Deal im CRM
  crm_activity_id   TEXT,           -- Aktivität im CRM
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_company ON soss_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON soss_orders(status);

-- Bonitätsprüfungen
CREATE TABLE IF NOT EXISTS soss_credit_checks (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL,
  refinanzierer   TEXT NOT NULL,   -- BFL / DLL / GRENKE / MLF / vonBusch
  status          TEXT DEFAULT 'pending',  -- pending / approved / rejected
  checked_by      TEXT,            -- user_id aus CRM
  checked_at      TEXT,
  document_r2_key TEXT,            -- Bestätigungsdokument vom Refinanzierer
  archive_key     TEXT,            -- revisionssicher archiviert
  notes           TEXT,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_order ON soss_credit_checks(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_status ON soss_credit_checks(status);
