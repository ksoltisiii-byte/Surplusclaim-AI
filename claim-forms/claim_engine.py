"""PDF-ready HTML claim form generation for supported states."""
from __future__ import annotations
from datetime import date, datetime, timedelta
from html import escape
from pathlib import Path
try:
    from data_pipeline.database import Database
except ImportError:
    import importlib
    Database = importlib.import_module("data-pipeline.database").Database

STATE_FORMS = {
    "CA": {"reference": "California Government Code §7060", "court": "Superior Court of California", "deadline_days": 365, "form": "GC 7060"},
    "FL": {"reference": "Florida Statute §45.035", "court": "Circuit Court of Florida", "deadline_days": 60, "form": "Surplus Funds Claim (F.S. 45.035)"},
    "TX": {"reference": "Texas Property Code §51", "court": "District Court of Texas", "deadline_days": 180, "form": "Property Code Chapter 51 Claim"},
}

def _meta(state: str) -> dict:
    try: return STATE_FORMS[state.upper()]
    except KeyError: raise ValueError(f"unsupported state: {state}")

def generate_html(state: str, owner: dict, property_data: dict, claim_number: str = "DRAFT") -> str:
    """Return a printable, PDF-ready HTML form; values are escaped for safe rendering."""
    m = _meta(state); auction = str(property_data.get("auction_date", ""))[:10]
    return f'''<!doctype html><html><head><meta charset="utf-8"><title>{escape(m['form'])}</title>
<style>body{{font:14px Arial;max-width:800px;margin:32px auto;color:#17202a}}h1{{text-align:center;font-size:20px}}.meta{{border:1px solid #777;padding:12px;margin:15px 0}}.row{{display:flex;gap:20px;border-bottom:1px solid #ddd;padding:8px 0}}.label{{font-weight:bold;width:190px}}.sig{{margin-top:50px}}@media print{{body{{margin:0}}}}</style></head><body>
<h1>{escape(m['form'])}</h1><div class="meta"><b>Authority:</b> {escape(m['reference'])}<br><b>Filing venue:</b> {escape(m['court'])}<br><b>Claim number:</b> {escape(claim_number)}</div>
<div class="row"><span class="label">Claimant</span><span>{escape(str(owner.get('first_name','')))} {escape(str(owner.get('last_name','')))}</span></div>
<div class="row"><span class="label">Mailing address</span><span>{escape(str(owner.get('mailing_address','')))}</span></div>
<div class="row"><span class="label">Foreclosed property</span><span>{escape(str(property_data.get('address','')))}, {escape(str(property_data.get('city','')))}, {escape(str(property_data.get('state','')))} {escape(str(property_data.get('zip_code','')))}</span></div>
<div class="row"><span class="label">Parcel / case reference</span><span>{escape(str(property_data.get('parcel_id','')))}</span></div>
<div class="row"><span class="label">Auction date</span><span>{escape(auction)}</span></div>
<div class="row"><span class="label">Surplus claimed</span><span>${float(property_data.get('surplus_amount',0)):,.2f}</span></div>
<p>I declare that the information above is true and request release of eligible surplus proceeds. I understand filing requirements and may seek independent legal advice.</p>
<div class="sig">Claimant signature: ______________________________ Date: __________</div><div class="sig">Attorney / authorized representative: __________________________ Date: __________</div>
</body></html>'''

def create_claim(db: Database, owner_id: int, property_id: int, output_dir: str | Path | None = None) -> dict:
    """Load records, insert a draft claim, and optionally write its HTML artifact."""
    db.initialize()
    owners = db.fetchall("SELECT * FROM owners WHERE id=?", (owner_id,)); props = db.fetchall("SELECT * FROM properties WHERE id=?", (property_id,))
    if not owners or not props: raise ValueError("owner or property not found")
    owner, prop = owners[0], props[0]; state = prop["state"].upper(); m = _meta(state)
    claim_number = f"SC-{state}-{date.today().strftime('%Y%m%d')}-{property_id:04d}"
    existing = db.fetchall("SELECT id,claim_number FROM claims WHERE property_id=? AND owner_id=?", (property_id, owner_id))
    cid = existing[0]["id"] if existing else db.execute("INSERT INTO claims(property_id,owner_id,claim_number,state,status) VALUES(?,?,?,?,?)", (property_id,owner_id,claim_number,state,"draft"))
    html = generate_html(state, owner, prop, claim_number)
    path = None
    if output_dir:
        path = Path(output_dir) / f"{claim_number}.html"; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(html, encoding="utf-8")
    deadline = None
    if prop.get("auction_date"):
        try: deadline = (datetime.strptime(prop["auction_date"][:10], "%Y-%m-%d").date() + timedelta(days=m["deadline_days"])).isoformat()
        except ValueError: pass
    return {"claim_id": cid, "claim_number": claim_number, "state": state, "html": html, "output_path": str(path) if path else None, "deadline": deadline}
