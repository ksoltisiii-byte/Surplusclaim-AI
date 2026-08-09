"""Modular foreclosure source adapters and safe demo-data loader."""
from __future__ import annotations
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterable
try:
    from .database import Database
except ImportError:  # supports `python pipeline.py` from this directory
    from database import Database

@dataclass(frozen=True)
class ForeclosureRecord:
    address: str; city: str; state: str; zip_code: str; county: str; parcel_id: str
    auction_date: str; sale_price: float; mortgage_balance: float; surplus_amount: float
    owner_first_name: str; owner_last_name: str; owner_email: str; owner_phone: str

class Scraper:
    """Source adapter contract. Production adapters should return normalized records."""
    def fetch(self) -> Iterable[ForeclosureRecord]: raise NotImplementedError

class DemoScraper(Scraper):
    def __init__(self, records: Iterable[ForeclosureRecord] | None = None): self.records = list(records or demo_records())
    def fetch(self): return iter(self.records)

def demo_records() -> list[ForeclosureRecord]:
    today = date.today()
    return [
      ForeclosureRecord("1421 Market St", "Los Angeles", "CA", "90021", "Los Angeles", "CA-2024-001", (today-timedelta(days=32)).isoformat(), 485000, 392000, 93000, "Maria", "Santos", "maria.santos@example.com", "213-555-0142"),
      ForeclosureRecord("808 Bayview Dr", "Tampa", "FL", "33602", "Hillsborough", "FL-2024-002", (today-timedelta(days=95)).isoformat(), 310000, 249000, 61000, "James", "Carter", "james.carter@example.com", "813-555-0188"),
      ForeclosureRecord("2260 Elm Ave", "Dallas", "TX", "75201", "Dallas", "TX-2024-003", (today-timedelta(days=180)).isoformat(), 275000, 214000, 61000, "Aisha", "Patel", "aisha.patel@example.com", "214-555-0197"),
    ]

def load_records(db: Database, source: Scraper | None = None) -> int:
    """Upsert records and owners; returns number accepted. Does not send outreach."""
    db.initialize(); count = 0
    with db.connection() as conn:
      for r in (source or DemoScraper()).fetch():
        conn.execute("""INSERT INTO properties(address,city,state,zip_code,county,parcel_id,auction_date,sale_price,mortgage_balance,surplus_amount,source)
          VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(parcel_id) DO UPDATE SET surplus_amount=excluded.surplus_amount, updated_at=CURRENT_TIMESTAMP""", (*asdict(r) | {"owner_first_name":None,"owner_last_name":None,"owner_email":None,"owner_phone":None},) if False else (r.address,r.city,r.state,r.zip_code,r.county,r.parcel_id,r.auction_date,r.sale_price,r.mortgage_balance,r.surplus_amount,"demo"))
        pid = conn.execute("SELECT id FROM properties WHERE parcel_id=?", (r.parcel_id,)).fetchone()[0]
        conn.execute("INSERT OR IGNORE INTO owners(property_id,first_name,last_name,email,phone,verified) VALUES(?,?,?,?,?,1)", (pid,r.owner_first_name,r.owner_last_name,r.owner_email,r.owner_phone)); count += 1
    return count

if __name__ == "__main__":
    print(f"Loaded {load_records(Database())} demo foreclosure records")
