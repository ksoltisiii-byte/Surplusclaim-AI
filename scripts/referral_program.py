"""Partner registration and referral commissions (15% of the 30% service fee)."""
from __future__ import annotations
from typing import Mapping
try:
    from data_pipeline.database import Database
except ImportError:
    import importlib
    Database = importlib.import_module("data-pipeline.database").Database

REFERRAL_RATE = .15

def register_partner(db: Database, name: str, email: str = "", phone: str = "", partner_type: str = "community") -> int:
    if not name.strip(): raise ValueError("partner name is required")
    db.initialize(); return db.execute("INSERT INTO partners(name,email,phone,partner_type) VALUES(?,?,?,?)", (name.strip(),email,phone,partner_type))

def record_referral(db: Database, partner_id: int, owner_id: int | None = None, property_id: int | None = None, notes: str = "") -> int:
    db.initialize(); return db.execute("INSERT INTO referrals(partner_id,owner_id,property_id,notes) VALUES(?,?,?,?)", (partner_id,owner_id,property_id,notes))

def commission(recovered_amount: float, contingency_rate: float = .30, referral_rate: float = REFERRAL_RATE) -> float:
    return round(max(0.0, float(recovered_amount)) * contingency_rate * referral_rate, 2)

def outreach_template(partner_name: str, client_name: str, recovered_amount: float) -> str:
    return (f"Hello {partner_name}, thank you for referring {client_name}. "
            f"Once the ${recovered_amount:,.2f} recovery is paid, your referral commission will be calculated at 15% of our 30% contingency fee.")
