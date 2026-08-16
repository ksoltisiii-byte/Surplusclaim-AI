"""Import normalized foreclosure auction records from CSV or JSON."""
from __future__ import annotations
import csv, json
from pathlib import Path
from typing import Any
try:
    from .database import Database
    from .pipeline import ForeclosureRecord, Scraper
except ImportError:
    from database import Database
    from pipeline import ForeclosureRecord, Scraper

REQUIRED = ("address", "city", "state", "zip", "county", "parcel_id", "auction_date", "sale_price", "mortgage_balance")

def _record(row: dict[str, Any]) -> ForeclosureRecord:
    missing = [k for k in REQUIRED if not str(row.get(k, "")).strip()]
    if missing: raise ValueError("missing required fields: " + ", ".join(missing))
    sale, mortgage = float(row["sale_price"]), float(row["mortgage_balance"])
    surplus = round(sale - mortgage, 2)
    if surplus <= 0: raise ValueError("surplus must be positive")
    return ForeclosureRecord(str(row["address"]).strip(), str(row["city"]).strip(), str(row["state"]).upper().strip(), str(row["zip"]).strip(), str(row["county"]).strip(), str(row["parcel_id"]).strip(), str(row["auction_date"]).strip()[:10], sale, mortgage, surplus, str(row.get("first_name", row.get("owner_first_name", ""))).strip(), str(row.get("last_name", row.get("owner_last_name", ""))).strip(), str(row.get("email", row.get("owner_email", ""))).strip(), str(row.get("phone", row.get("owner_phone", ""))).strip())

def read_records(path: str | Path) -> list[ForeclosureRecord]:
    path = Path(path)
    with path.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f)) if path.suffix.lower() == ".csv" else json.load(f)
    if isinstance(rows, dict): rows = rows.get("records", [])
    records = []
    for i, row in enumerate(rows, 1):
        try: records.append(_record(row))
        except (TypeError, ValueError) as exc: print(f"Skipping row {i}: {exc}")
    return records

class RealDataScraper(Scraper):
    def __init__(self, path: str | Path): self.path = Path(path)
    def fetch(self): return iter(read_records(self.path))

def import_file(db: Database, path: str | Path) -> int:
    """Validate and upsert imported records, marking their source as import."""
    db.initialize(); records = list(RealDataScraper(path).fetch())
    with db.connection() as conn:
        for r in records:
            conn.execute("""INSERT INTO properties(address,city,state,zip_code,county,parcel_id,auction_date,sale_price,mortgage_balance,surplus_amount,source) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(parcel_id) DO UPDATE SET surplus_amount=excluded.surplus_amount, sale_price=excluded.sale_price, mortgage_balance=excluded.mortgage_balance, source='import', updated_at=CURRENT_TIMESTAMP""", (r.address,r.city,r.state,r.zip_code,r.county,r.parcel_id,r.auction_date,r.sale_price,r.mortgage_balance,r.surplus_amount,"import"))
            pid = conn.execute("SELECT id FROM properties WHERE parcel_id=?", (r.parcel_id,)).fetchone()[0]
            if r.owner_first_name or r.owner_last_name:
                conn.execute("INSERT OR IGNORE INTO owners(property_id,first_name,last_name,email,phone,verified) VALUES(?,?,?,?,?,0)", (pid,r.owner_first_name or "Unknown",r.owner_last_name or "Owner",r.owner_email,r.owner_phone))
    return len(records)
