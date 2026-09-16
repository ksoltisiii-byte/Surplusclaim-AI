-- ============================================================================
-- SurplusClaim AI — Public e-sign flow (route /sign on the TanStack site)
-- Database schema required by src/lib/esign.ts — standard managed PostgreSQL
-- (Tiger Cloud) via DATABASE_URL; client is `postgres` (postgres.js).
--
-- Who runs this: the team lead, once DATABASE_URL is connected (Secrets →
-- database card). The code at /home/team/shared/site already builds and serves
-- WITHOUT these tables — sql() throws only when a query actually runs, and the
-- /sign page then shows an honest "not set up yet" message instead of crashing.
--
-- The tables mirror the local ops SQLite schema (data-pipeline/surplusclaim.db)
-- so the local workflow (verify → engage → file → recover → invoice) and the
-- public site can be kept in sync. ONLY `owners.sign_token`, `engagements.signature_png`
-- and `engagements.document_text` are new vs the local schema.
-- ============================================================================

-- One row per property with a potential surplus (local `properties` mirror).
CREATE TABLE IF NOT EXISTS properties (
  id               BIGSERIAL PRIMARY KEY,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  state            TEXT NOT NULL,
  zip_code         TEXT,
  county           TEXT,
  parcel_id        TEXT UNIQUE,
  cause_nbr        TEXT,
  auction_date     TEXT,
  sale_price       NUMERIC(12,2),
  mortgage_balance NUMERIC(12,2),
  surplus_amount   NUMERIC(12,2),
  status           TEXT,
  source           TEXT,
  lead_score       INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Homeowners. `sign_token` is the UNGUESSABLE per-owner deep-link key: the
-- /sign page is reached ONLY as /sign?token=<sign_token>. It must be a UUID
-- (gen_random_uuid()), never an id or a predictable value.
CREATE TABLE IF NOT EXISTS owners (
  id              BIGSERIAL PRIMARY KEY,
  property_id     BIGINT REFERENCES properties(id),
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT,
  phone           TEXT,
  mailing_address TEXT,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  opted_out       BOOLEAN NOT NULL DEFAULT FALSE,
  sign_token      TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Signed engagements captured by the public /sign page.
-- status: 'pending' → 'signed' on submit (server also blocks opted-out owners).
CREATE TABLE IF NOT EXISTS engagements (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      BIGINT NOT NULL REFERENCES owners(id),
  fee_percent   INTEGER NOT NULL DEFAULT 30,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'signed', 'cancelled')),
  signed_at     TIMESTAMPTZ,
  signer_name   TEXT,           -- full legal name entered by the signer
  signer_email  TEXT,           -- contact email (also written back to owners.email)
  signature_png TEXT,           -- base64 PNG data URL captured from the canvas pad
  document_text TEXT,           -- snapshot of the EXACT letter wording that was signed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagements_owner ON engagements(owner_id);

-- ----------------------------------------------------------------------------
-- How to issue a homeowner's sign link (example: Jane Smith, Dallas TX)
-- ----------------------------------------------------------------------------
-- 1) Insert the property (idempotent via parcel_id):
--    INSERT INTO properties (address, city, state, zip_code, county, parcel_id,
--                            cause_nbr, auction_date, sale_price, mortgage_balance,
--                            surplus_amount, status, source)
--    VALUES ('3903 ELSIE FAYE HEGGINS ST.', 'DALLAS', 'TX', '75210-2816',
--            'Dallas County', 'DALLAS-COUNTY-00000324253000000', 'TX-23-02084',
--            '2026-09-01', 153220, 37015.29, 116204.71, 'Sold', 'LGBS')
--    ON CONFLICT (parcel_id) DO NOTHING;
--
-- 2) Insert the owner + generate the token, then read the token back:
--    INSERT INTO owners (property_id, first_name, last_name, email, sign_token)
--    VALUES ((SELECT id FROM properties WHERE parcel_id = 'DALLAS-COUNTY-00000324253000000'),
--            'Jane', 'Smith', 'jane.smith@gmail.com', gen_random_uuid()::text)
--    RETURNING id, sign_token;
--
-- 3) Send: https://www.surplusclaimai.com/sign?token=<returned sign_token>
--    (only the lead/owner does the sending — outreach is theirs).
--
-- Notes
-- - gen_random_uuid() requires PostgreSQL 13+ (Tiger Cloud is standard PG, OK).
-- - The letter itself is composed server-side from owner + property + the
--   business details in src/data/business.ts (mirror of letters/config.json,
--   owner-ratified 2026-09-08). No business contact values are hardcoded in the
--   page component.
-- - After signing, engagements rows are written ONLY here. The local ops SQLite
--   (data-pipeline/surplusclaim.db) will need the signed engagement mirrored in
--   for the file/recover/invoice workflow — follow-up item for the lead.
-- ============================================================================