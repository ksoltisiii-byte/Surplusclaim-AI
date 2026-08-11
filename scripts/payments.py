"""Payment ledger and contingency-fee calculations for recovered surplus funds."""
from __future__ import annotations
import sys
from pathlib import Path
from typing import Mapping
try:
    from data_pipeline.database import Database
except ImportError:
    import importlib
    Database = importlib.import_module("data-pipeline.database").Database

FEE_RATE = .30
REFERRAL_RATE = .15

def calculate_disbursement(recovered_amount: float, fee_rate: float = FEE_RATE) -> dict[str, float]:
    amount = max(0.0, float(recovered_amount)); fee = round(amount * fee_rate, 2)
    return {"recovered": amount, "fee": fee, "client_amount": round(amount - fee, 2)}

def record_payment(db: Database, claim_id: int, amount: float, status: str = "paid", payment_type: str = "recovery") -> int:
    if amount <= 0: raise ValueError("payment amount must be positive")
    db.initialize()
    return db.execute("INSERT INTO payments(claim_id,amount,payment_type,status,paid_at) VALUES(?,?,?,?,CASE WHEN ?='paid' THEN CURRENT_TIMESTAMP END)", (claim_id, amount, payment_type, status, status))

def claim_projection(db: Database, claim_id: int) -> dict[str, float]:
    rows = db.fetchall("SELECT COALESCE(SUM(amount),0) total FROM payments WHERE claim_id=? AND status='paid'", (claim_id,))
    return calculate_disbursement(rows[0]["total"])

def pipeline_projection(db: Database) -> dict[str, float]:
    rows = db.fetchall("SELECT COALESCE(SUM(amount),0) total FROM payments WHERE status='paid'")
    return calculate_disbursement(rows[0]["total"])

if __name__ == "__main__":
    print(pipeline_projection(Database()))
