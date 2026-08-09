"""SQLite persistence for surplus-claim leads and their lifecycle."""
from __future__ import annotations
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from typing import Iterator

DEFAULT_DB = Path(__file__).resolve().parent / "surplusclaim.db"
SCHEMA = """
PRAGMA foreign_keys = ON;
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
CREATE INDEX IF NOT EXISTS idx_properties_state_status ON properties(state, status);
CREATE INDEX IF NOT EXISTS idx_properties_surplus ON properties(surplus_amount);
CREATE INDEX IF NOT EXISTS idx_owners_contact ON owners(email, phone);
CREATE INDEX IF NOT EXISTS idx_outreach_owner ON outreach_log(owner_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
"""

class Database:
    def __init__(self, path: str | Path = DEFAULT_DB):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback(); raise
        finally: conn.close()
    def initialize(self) -> None:
        with self.connection() as conn: conn.executescript(SCHEMA)

    def seed_demo_data(self) -> int:
        """Create the schema and insert the canonical demo properties/owners.

        Import is deferred to avoid coupling schema users to the scraper module.
        Returns the number of properties accepted (safe to call repeatedly).
        """
        self.initialize()
        try:
            from .pipeline import DemoScraper
        except ImportError:
            from pipeline import DemoScraper
        count = 0
        with self.connection() as conn:
            for record in DemoScraper().fetch():
                conn.execute("""INSERT INTO properties(address,city,state,zip_code,county,parcel_id,auction_date,
                    sale_price,mortgage_balance,surplus_amount,source)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(parcel_id) DO UPDATE SET
                    surplus_amount=excluded.surplus_amount, updated_at=CURRENT_TIMESTAMP""",
                    (record.address, record.city, record.state, record.zip_code, record.county,
                     record.parcel_id, record.auction_date, record.sale_price, record.mortgage_balance,
                     record.surplus_amount, "demo"))
                pid = conn.execute("SELECT id FROM properties WHERE parcel_id=?", (record.parcel_id,)).fetchone()[0]
                conn.execute("""INSERT OR IGNORE INTO owners(property_id,first_name,last_name,email,phone,verified)
                    VALUES(?,?,?,?,?,1)""", (pid, record.owner_first_name, record.owner_last_name,
                    record.owner_email, record.owner_phone))
                count += 1
        return count
    def execute(self, sql: str, params: tuple = ()) -> int:
        with self.connection() as conn: return conn.execute(sql, params).lastrowid
    def fetchall(self, sql: str, params: tuple = ()) -> list[dict]:
        with self.connection() as conn: return [dict(r) for r in conn.execute(sql, params).fetchall()]
