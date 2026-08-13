/**
 * Shared SQLite access for all SurplusClaim AI Node services.
 * Uses Node's built-in `node:sqlite` (DatabaseSync) — zero native dependencies.
 *
 * The SQLite file is shared with the Python data pipeline
 * (data-pipeline/surplusclaim.db, schema owned by data-pipeline/database.py).
 * WAL mode is enabled so the three Node servers + Python pipeline can all
 * read/write the same file concurrently.
 */
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config.json');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Normalize optional sections so a partial config (e.g. a teammate's overwrite)
// can never crash every server at startup.
config.services = Object.assign(
  { dashboard: { host: '0.0.0.0', port: 3000 }, website: { host: '0.0.0.0', port: 4000 }, intake: { host: '0.0.0.0', port: 5000 } },
  config.services || {}
);
config.claim_engine = Object.assign({ host: '127.0.0.1', port: 7100, path: '/generate', timeout_ms: 3000 }, config.claim_engine || {});
config.revenue_model = Object.assign({ pipeline_conversion_12mo: 0.25, average_recovery_months: 6 }, config.revenue_model || {});
config.email = Object.assign({ enabled: false, provider: 'sendgrid', from_address: 'Ksoltisiii@gmail.com' }, config.email || {});
config.sms = Object.assign({ enabled: false, provider: 'twilio' }, config.sms || {});
const DB_PATH = path.join(ROOT, config.database_path || 'data-pipeline/surplusclaim.db');

let _db = null;

function db() {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA journal_mode = WAL');
    _db.exec('PRAGMA busy_timeout = 5000');
    _db.exec('PRAGMA foreign_keys = ON');
    // Ensure schema exists even if the Python seed has not run yet.
    _db.exec(`
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY, address TEXT NOT NULL, city TEXT, state TEXT NOT NULL,
        zip_code TEXT, county TEXT, parcel_id TEXT UNIQUE, auction_date TEXT,
        sale_price REAL NOT NULL DEFAULT 0, mortgage_balance REAL NOT NULL DEFAULT 0,
        surplus_amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'identified',
        source TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS owners (
        id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT, phone TEXT, mailing_address TEXT,
        verified INTEGER NOT NULL DEFAULT 0, opted_out INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(property_id, first_name, last_name)
      );
      CREATE TABLE IF NOT EXISTS engagements (
        id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
        fee_percent REAL NOT NULL DEFAULT 30, status TEXT NOT NULL DEFAULT 'pending', signed_at TEXT,
        document_url TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS claims (
        id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL REFERENCES properties(id), owner_id INTEGER NOT NULL REFERENCES owners(id),
        claim_number TEXT UNIQUE, state TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', filed_at TEXT, recovered_amount REAL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS outreach_log (
        id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
        channel TEXT NOT NULL, direction TEXT NOT NULL DEFAULT 'outbound', template TEXT, message_id TEXT,
        status TEXT NOT NULL DEFAULT 'queued', sent_at TEXT, response_at TEXT, error TEXT
      );
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY, claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        amount REAL NOT NULL, payment_type TEXT NOT NULL DEFAULT 'recovery', status TEXT NOT NULL DEFAULT 'pending', paid_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS partners (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, partner_type TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY, partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL, property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'received', notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  return _db;
}

/** Run a SELECT that returns many rows (normalized plain objects). */
function rows(sql, ...params) {
  return db().prepare(sql).all(...params).map((r) => ({ ...r }));
}

/** Run a SELECT that returns a single row or null. */
function row(sql, ...params) {
  const r = db().prepare(sql).get(...params);
  return r ? { ...r } : null;
}

/** Run an INSERT/UPDATE/DELETE; returns { changes, lastInsertRowid }. */
function run(sql, ...params) {
  return db().prepare(sql).run(...params);
}

/** Close the handle (used by CLI/seed scripts). */
function close() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/* ---------------- lead scoring (mirrors data-pipeline/scoring.py) ------------ */

const STATE_DIFFICULTY = { CA: 0.55, FL: 0.75, TX: 0.65 };

function scoreLead(lead) {
  const surplus = Math.max(0, Number(lead.surplus_amount) || 0);
  const surplusScore = Math.min(surplus / 100000, 1) * 55;
  let days = 3650;
  if (lead.auction_date) {
    const d = new Date(String(lead.auction_date).slice(0, 10) + 'T00:00:00Z');
    if (!Number.isNaN(d.getTime())) {
      days = Math.max(0, (Date.now() - d.getTime()) / 86400000);
    }
  }
  const recencyScore = Math.max(0, 1 - Math.min(days, 730) / 730) * 30;
  const stateScore = (STATE_DIFFICULTY[String(lead.state || '').toUpperCase()] ?? 0.5) * 15;
  return Math.round(Math.max(0, Math.min(100, surplusScore + recencyScore + stateScore)));
}

function scoreLabel(score) {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}

function money(n) {
  return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

module.exports = { config, DB_PATH, db, rows, row, run, close, scoreLead, scoreLabel, money };
