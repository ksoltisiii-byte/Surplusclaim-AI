#!/usr/bin/env python3
"""Single-command, idempotent SurplusClaim workflow (dry-run outreach only)."""
from __future__ import annotations
import argparse, importlib

def load(name):
    """Import modules whose package directory uses the historical hyphen name."""
    return importlib.import_module(name)

def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument("--input", help="CSV/JSON input; demo fallback")
    args = ap.parse_args()
    db = load("data-pipeline.database").Database(); db.initialize()
    try: db.execute("ALTER TABLE properties ADD COLUMN lead_score INTEGER")
    except Exception: pass
    imported = scored = queued = claims = 0; rows = []
    print("[1/5] INGEST")
    try:
        if args.input:
            try:
                importer = load("data-pipeline.importer")
                imported = importer.import_file(db, args.input)
                print(f"  imported {imported} real records")
            except (ImportError, FileNotFoundError) as exc:
                print(f"  importer unavailable ({exc}); using demo fallback")
                imported = load("data-pipeline.pipeline").load_records(db)
        else:
            imported = load("data-pipeline.pipeline").load_records(db)
            print(f"  loaded {imported} demo records")
    except Exception as exc: print(f"  ingest failed: {exc}")
    print("[2/5] SCORE")
    try:
        score = load("data-pipeline.scoring"); rows = db.fetchall("SELECT * FROM properties")
        counts = {"high":0,"medium":0,"low":0}
        for row in rows:
            value = score.score_lead(row); db.execute("UPDATE properties SET lead_score=? WHERE id=?", (value,row["id"])); counts[score.score_label(value)] += 1
        scored = len(rows); print(f"  scored {scored} ({counts['high']} high, {counts['medium']} medium, {counts['low']} low)")
    except Exception as exc: print(f"  scoring failed: {exc}")
    print("[3/5] OUTREACH QUEUE (DRY-RUN ONLY)")
    try:
        outreach = load("outreach.outreach")
        for owner in db.fetchall("SELECT o.*,p.address,p.state,p.surplus_amount FROM owners o JOIN properties p ON p.id=o.property_id WHERE o.verified=1 AND o.opted_out=0"):
            if not (owner.get("email") or owner.get("phone")) or db.fetchall("SELECT id FROM outreach_log WHERE owner_id=?", (owner["id"],)): continue
            data = {"first_name":owner["first_name"],"address":owner["address"],"state":owner["state"],"surplus_amount":owner["surplus_amount"],"email":owner.get("email", ""),"phone":owner.get("phone", "")}
            outreach.send(db, owner["id"], "initial", data, dry_run=True); queued += 1
        print(f"  queued {queued} messages; no provider send attempted")
    except Exception as exc: print(f"  outreach failed: {exc}")
    print("[4/5] CLAIM PREP")
    try:
        engine = load("claim-forms.claim_engine")
        for row in db.fetchall("SELECT e.owner_id,o.property_id FROM engagements e JOIN owners o ON o.id=e.owner_id WHERE e.status='signed'"):
            engine.create_claim(db, row["owner_id"], row["property_id"]); claims += 1
        print(f"  prepared {claims} draft claims")
    except Exception as exc: print(f"  claim prep failed: {exc}")
    print("[5/5] REPORT")
    try:
        projection = load("scripts.payments").pipeline_projection(db)
        print(f"  properties: {len(rows)} | scored: {scored} | outreach: {queued} | claims: {claims} | projected fee revenue: ${projection['fee']:,.2f}")
    except Exception as exc: print(f"  report failed: {exc}")
    return 0

if __name__ == "__main__": raise SystemExit(main())
