#!/usr/bin/env python3
"""Run the complete SurplusClaim workflow in an idempotent dry-run."""
from __future__ import annotations
import argparse, importlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def mod(name): return importlib.import_module(name)

def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument("--input", help="CSV/JSON records; demo data when omitted")
    args = ap.parse_args()
    dbmod, pip, score = mod("data-pipeline.database"), mod("data-pipeline.pipeline"), mod("data-pipeline.scoring")
    db = dbmod.Database(); db.initialize()
    # Migration is safe for databases created before scoring support.
    try: db.execute("ALTER TABLE properties ADD COLUMN lead_score INTEGER")
    except Exception: pass
    print("[1/5] INGEST")
    if args.input:
        imported = mod("data-pipeline.importer").import_file(db, args.input); print(f"  imported {imported} records")
    else:
        imported = pip.load_records(db, pip.DemoScraper()); print(f"  loaded {imported} demo records")
    print("[2/5] SCORE")
    rows = db.fetchall("SELECT * FROM properties")
    counts = {"high": 0, "medium": 0, "low": 0}
    for row in rows:
        value = score.score_lead(row); db.execute("UPDATE properties SET lead_score=? WHERE id=?", (value,row["id"])); counts[score.score_label(value)] += 1
    print(f"  scored {len(rows)} leads ({counts['high']} high, {counts['medium']} medium, {counts['low']} low)")
    print("[3/5] OUTREACH QUEUE")
    outreach = mod("outreach.outreach"); queued = 0
    for owner in db.fetchall("SELECT o.*,p.address,p.city,p.state,p.surplus_amount FROM owners o JOIN properties p ON p.id=o.property_id WHERE o.verified=1 AND o.opted_out=0"):
        if not owner.get("email") and not owner.get("phone"): continue
        if db.fetchall("SELECT id FROM outreach_log WHERE owner_id=?", (owner["id"],)): continue
        data = {"first_name":owner["first_name"],"address":owner["address"],"state":owner["state"],"surplus_amount":owner["surplus_amount"],"email":owner.get("email",""),"phone":owner.get("phone","")}
        outreach.send(db, owner["id"], "initial", data, dry_run=True); queued += 1
    print(f"  queued {queued} dry-run messages")
    print("[4/5] CLAIM PREP")
    engine = mod("claim-forms.claim_engine"); ready = 0
    for e in db.fetchall("SELECT e.owner_id,o.property_id FROM engagements e JOIN owners o ON o.id=e.owner_id WHERE e.status='signed'"):
        engine.create_claim(db,e["owner_id"],e["property_id"]); ready += 1
    print(f"  prepared {ready} draft claims")
    print("[5/5] REPORT")
    projection = mod("scripts.payments").pipeline_projection(db)
    print(f"  properties: {len(rows)} | scored: {len(rows)} | outreach: {queued} | claims: {ready} | projected fee revenue: ${projection['fee']:,.2f}")
    return 0

if __name__ == "__main__": raise SystemExit(main())
