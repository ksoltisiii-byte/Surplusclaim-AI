#!/usr/bin/env python3
"""Record a recovered surplus amount and compute the contingency-fee payment.

This helper does NOT call Stripe. The team lead issues the Stripe invoice
separately (using the homeowner email + the printed amount_cents) and then
records the resulting invoice id by re-running with ``--invoice-id``.

Usage:
    python3 data-pipeline/record_recovery.py <claim_id> <recovered_amount> \
        [--invoice-id <stripe_invoice_id>] [--force]

On success it prints a JSON summary:
    claim_id, owner_email, recovered_amount, fee_percent, fee_amount,
    amount_cents (integer cents for Stripe), payment_id
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import DEFAULT_DB, Database  # noqa: E402

DEFAULT_FEE_PERCENT = 30.0


def record_recovery(
    db: Database,
    claim_id: int,
    recovered_amount: float,
    invoice_id: str | None = None,
    force: bool = False,
) -> dict:
    """Update the claim, insert the pending fee payment, and return a summary."""
    recovered_amount = float(recovered_amount)
    if recovered_amount <= 0:
        raise ValueError(f"recovered_amount must be > 0, got {recovered_amount}")

    with db.connection() as conn:
        claim = conn.execute(
            "SELECT id, owner_id, claim_number, status, recovered_amount FROM claims WHERE id = ?",
            (claim_id,),
        ).fetchone()
        if claim is None:
            raise LookupError(f"claim id {claim_id} not found")

        owner_id = claim["owner_id"]

        # Fee percent comes from the claim owner's most recent engagement row
        # (defaults to 30 per the business model).
        engagement = conn.execute(
            "SELECT fee_percent FROM engagements WHERE owner_id = ? ORDER BY id DESC LIMIT 1",
            (owner_id,),
        ).fetchone()
        fee_percent = float(engagement["fee_percent"]) if engagement and engagement["fee_percent"] is not None else DEFAULT_FEE_PERCENT

        # Safety: one pending recovery payment per claim. Re-run with --force to
        # record an updated invoice id (e.g. re-issued after a Stripe error).
        existing = conn.execute(
            "SELECT id, stripe_invoice_id FROM payments WHERE claim_id = ? AND payment_type = 'recovery' AND status = 'pending' ORDER BY id DESC LIMIT 1",
            (claim_id,),
        ).fetchone()
        if existing is not None and not force:
            raise RuntimeError(
                f"claim {claim_id} already has a pending recovery payment id={existing['id']} "
                f"(invoice={existing['stripe_invoice_id'] or 'none'}); pass --force to update it instead"
            )

        fee_amount = round(recovered_amount * fee_percent / 100.0, 2)
        amount_cents = int(round(fee_amount * 100))

        owner = conn.execute("SELECT email FROM owners WHERE id = ?", (owner_id,)).fetchone()
        owner_email = owner["email"] if owner else None

        conn.execute(
            "UPDATE claims SET recovered_amount = ?, status = 'recovered' WHERE id = ?",
            (recovered_amount, claim_id),
        )

        if existing is not None and force:
            # Update the existing pending row rather than creating a duplicate.
            conn.execute(
                "UPDATE payments SET amount = ?, stripe_invoice_id = ? WHERE id = ?",
                (fee_amount, invoice_id, existing["id"]),
            )
            payment_id = existing["id"]
        else:
            cur = conn.execute(
                """INSERT INTO payments (claim_id, amount, payment_type, status, stripe_invoice_id)
                   VALUES (?, ?, 'recovery', 'pending', ?)""",
                (claim_id, fee_amount, invoice_id),
            )
            payment_id = cur.lastrowid

    return {
        "claim_id": claim_id,
        "owner_email": owner_email,
        "recovered_amount": recovered_amount,
        "fee_percent": fee_percent,
        "fee_amount": fee_amount,
        "amount_cents": amount_cents,
        "payment_id": payment_id,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("claim_id", type=int, help="claims.id to record the recovery against")
    parser.add_argument("recovered_amount", type=float, help="actual surplus recovered ($)")
    parser.add_argument("--invoice-id", default=None, help="Stripe invoice id (add it after issuing the invoice)")
    parser.add_argument("--force", action="store_true", help="update the existing pending payment instead of refusing")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="SQLite database path (default: %(default)s)")
    args = parser.parse_args(argv)

    db = Database(args.db)
    db.initialize()
    try:
        summary = record_recovery(db, args.claim_id, args.recovered_amount, args.invoice_id, args.force)
    except (ValueError, LookupError, RuntimeError, sqlite3.Error) as exc:
        parser.error(str(exc))
        return 2
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())