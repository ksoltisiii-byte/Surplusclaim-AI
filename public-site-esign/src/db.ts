import postgres from "postgres";

/**
 * Server-only handle to the team's database — standard managed PostgreSQL
 * (Tiger Cloud) via `DATABASE_URL`. Uses the `postgres` package (postgres.js),
 * a tagged-template client: `sql\`select ... where x = ${v}\`` binds `v` as a
 * parameter and returns an array of row objects.
 *
 * Resolved lazily (per call, not at module load) so the site still builds and
 * serves before a database is connected — the error only surfaces if a query
 * actually runs without `DATABASE_URL`. The connection is a lazy singleton:
 * the first query opens it, later calls reuse it.
 *
 * Use it only inside a `createServerFn()` handler or an `src/routes/api/*` route
 * (never client code):
 *
 *   const getPosts = createServerFn().handler(async () => {
 *     const rows = await sql()`select id, title, created_at from posts`;
 *     // Coerce non-primitive columns (timestamps arrive as JS Dates; BIGINT and
 *     // NUMERIC arrive as strings for precision) before returning to the client,
 *     // or React may refuse to render them:
 *     return rows.map((r) => ({ ...r, created_at: String(r.created_at) }));
 *   });
 *
 * Schema bootstrap: the e-sign tables (properties / owners / engagements) are
 * baked into the code (SCHEMA_SQL below, the DDL from the repo's
 * public-site-esign/SCHEMA.sql) and created idempotently (IF NOT EXISTS) on the
 * first connection of each process — the lead cannot run SCHEMA.sql by hand
 * because DATABASE_URL only reaches the live host runtime, not our shells.
 * Bootstrap is kicked off the moment the connection is created and, on the
 * single max:1 connection, is pipelined ahead of every later query — so the
 * /sign and the getDbStatus health server-function can never race a cold start. `schemaReady()`
 * lets a handler await that once-per-process bootstrap explicitly.
 */
let db: ReturnType<typeof postgres> | null = null;
let boot: Promise<boolean> | null = null;

/**
 * DDL for the public e-sign flow — byte-identical to the executable statements
 * in public-site-esign/SCHEMA.sql (its comment header and example INSERTs are
 * NOT part of the bootstrap; only CREATE TABLE / CREATE INDEX run here).
 * All statements are idempotent so re-running on a cold start is a no-op.
 */
const SCHEMA_SQL = `
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

CREATE TABLE IF NOT EXISTS engagements (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      BIGINT NOT NULL REFERENCES owners(id),
  fee_percent   INTEGER NOT NULL DEFAULT 30,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'signed', 'cancelled')),
  signed_at     TIMESTAMPTZ,
  signer_name   TEXT,
  signer_email  TEXT,
  signature_png TEXT,
  document_text TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagements_owner ON engagements(owner_id);
`;

function ensureSchema(client: ReturnType<typeof postgres>): Promise<boolean> {
  if (!boot) {
    boot = client
      .unsafe(SCHEMA_SQL)
      .then(() => true)
      .catch((err) => {
        console.error("[db] schema bootstrap failed:", (err as Error)?.message ?? err);
        return false;
      });
  }
  return boot;
}

export const sql = () => {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — connect a database (via the database card) before running queries.",
    );
  }
  db = postgres(url, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });
  // Fire-and-forget bootstrap: on the single connection it is ordered ahead of
  // any query issued later, so the tables exist before first use. The promise is
  // stored (never unhandled) and re-awaitable via schemaReady().
  void ensureSchema(db);
  return db;
};

/**
 * Await the once-per-process schema bootstrap (fires on first connection).
 * Resolves true if the DDL ran (or was already applied); false if it failed.
 * Throws if DATABASE_URL is unset — callers guarding on `configured` first.
 */
export const schemaReady = (): Promise<boolean> => {
  const client = sql();
  return ensureSchema(client);
};