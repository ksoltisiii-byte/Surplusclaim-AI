"""Transparent 0-100 lead scoring."""
from __future__ import annotations
from datetime import date, datetime
from typing import Mapping

# Administrative difficulty, not legal advice; tune as operational data arrives.
STATE_DIFFICULTY = {"CA": 0.55, "FL": 0.75, "TX": 0.65}

def score_lead(lead: Mapping, as_of: date | None = None) -> int:
    """Score a property/owner lead (0-100), clamped and deterministic.

    Components: surplus potential (0-55), recency (0-30), state workflow difficulty (0-15).
    """
    as_of = as_of or date.today()
    surplus = max(0.0, float(lead.get("surplus_amount", 0) or 0))
    # Saturates at $100k, avoiding oversized balances dominating all other signals.
    surplus_score = min(surplus / 100_000.0, 1.0) * 55
    raw_date = lead.get("auction_date")
    days = 3650
    if raw_date:
        try: days = max(0, (as_of - datetime.strptime(str(raw_date)[:10], "%Y-%m-%d").date()).days)
        except ValueError: pass
    recency_score = max(0.0, 1 - min(days, 730) / 730) * 30
    state_score = STATE_DIFFICULTY.get(str(lead.get("state", "")).upper(), 0.5) * 15
    return int(round(max(0, min(100, surplus_score + recency_score + state_score))))

def score_label(score: int) -> str:
    return "high" if score >= 70 else "medium" if score >= 40 else "low"
