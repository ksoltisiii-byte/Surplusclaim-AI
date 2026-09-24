#!/usr/bin/env python3
"""Palm Beach County Clerk -- "Civil Registry and Civil Bond Deposits" PDF -> leads CSV.

SOURCE B quick win (see /home/team/shared/florida-palm-beach/SCRAPER_SCOPING.md):
the Clerk publishes periodic unclaimed-funds lists; the Civil Registry /
Civil Bond Deposits list is a money-in-registry pool.  Every row is a court
deposit (case number | balance | plaintiff(s) | defendant(s)).  A balance
means the money is already on deposit with the Clerk -- i.e. the sale
happened -- so these are SOLD-status, money-confirmed leads.

Pipeline (parse -> filter -CA- -> owner + balance -> leads CSV):

1. FETCH -- try the live Clerk URL first (it is Akamai-protected and 403s
   from a datacenter IP; verified 2026-09-23).  On any error, fall back to
   the Wayback mirror of the same document, then to a locally saved copy in
   florida-palm-beach/sources/.  The document ID (4780) repoints to a new
   PDF each cycle, so re-resolve the news item before relying on the live
   URL.

2. PARSE -- pdfplumber word positions: the table has crisp X columns on
   every page of the verified snapshot:
       case       x0 =  40.4
       balance    x0 ~ 167-186  ($-prefixed)
       plaintiff  x0 = 213.4
       defendant  x0 = 578.6
   Case rows can span page breaks (party-name overflow continues the
   previous row onto the next page), so the row accumulator is carried
   across pages.  One name line == one party.

3. FILTER -- keep case type ``CA`` (circuit civil == foreclosure filings).
   DR/SC/CC/CP rows are family/small-claims/county-civil/probate and are
   dropped by default (override with --case-types or --keep-all).

4. OWNERS -- under F.S. 45.032(1)(a) the owner of record is the defendant
   as of the lis pendens date; assignees must prove entitlement under
   F.S. 45.033.  Defendants are emitted as owners; "LAST, FIRST" names are
   split, entity names (no comma) go to last_name.

5. OUTPUT -- one CSV row per (case, defendant) so the file can feed both
   the `properties` and `owners` tables of PUBLIC_ESIGN_SCHEMA.sql.  Field
   names match that schema where a value exists; fields the registry list
   does not carry (address, city, zip, parcel_id, auction_date, sale_price,
   mortgage_balance, email, phone) are left blank and must come from
   eCaseView / RealForeclose / Property Appraiser enrichment.

Scope rules carried over from the LGBS feed and the owner's direction:
    - status is always SOLD (a registry balance proves a completed sale)
    - surplus_amount = the registry balance as-is (emit only positive; the
      list contains no negative balances)
    - dedupe key for refreshes: case number

Claim-deadline note (not a per-row field; cannot be derived from this PDF):
funds collected before Jan 1, 2025 must be claimed on or before Sept 1,
2026.  Verify each case's deposit date before outreach.

Dependency: pdfplumber (``pip install pdfplumber``).  Everything else is
the Python standard library.

Usage:
    python3 -m scrapers.palm_beach_registry                 # fetch + parse + write
    python3 -m scrapers.palm_beach_registry --pdf /path/to/list.pdf
    python3 -m scrapers.palm_beach_registry --out /path/out.csv --keep-all
"""
from __future__ import annotations

import argparse
import csv
import logging
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

LOGGER = logging.getLogger("palm_beach_registry")

# --- Document sources (verified 2026-09-23; Akamai blocks the live clerk URL) ---
LIVE_URL = (
    "https://www.mypalmbeachclerk.com/home/showpublisheddocument/4780/"
    "639204872065770000"
)
# Wayback mirror of the same document (captured 2026-08-20).  The "id_" flag
# returns the original archived bytes rather than the wayback wrapper page.
WAYBACK_CANDIDATES = [
    "http://web.archive.org/web/20260820000407id_/" + LIVE_URL,
    "http://web.archive.org/web/2026id_/" + LIVE_URL,
    "http://web.archive.org/web/" + LIVE_URL,
]
# Local snapshot used for development/offline runs.
_LOCAL_CANDIDATES = [
    Path(__file__).resolve().parent.parent.parent / "florida-palm-beach" / "sources" / "civil_registry_and_civil_bond_deposits.pdf",
    Path(__file__).resolve().parent.parent / "sources" / "civil_registry_and_civil_bond_deposits.pdf",
    Path(__file__).resolve().parent.parent / "data" / "civil_registry_and_civil_bond_deposits.pdf",
]
LOCAL_SNAPSHOT = next((p for p in _LOCAL_CANDIDATES if p.exists()), None)

# --- Layout constants (verified against the 2026-08-20 snapshot, 9 pages) ---
CASE_X0_MAX = 150.0        # case numbers start at x0 = 40.4
BALANCE_X0_MIN = 150.0     # balances start x0 ~ 167-186 ($-prefixed)
BALANCE_X0_MAX = 210.0
PLAINTIFF_X0_MIN = 210.0   # plaintiff column x0 = 213.4
DEFENDANT_X0_MIN = 570.0   # defendant column x0 = 578.6
PAGE_HEADER_TOP_MAX = 35.0  # page title ("Civil Registry and Civil Bond Deposits")
LINE_TOP_TOLERANCE = 2.5   # pdfplumber 'top' varies ~0.1-0.5 within one group

CASE_NBR_RE = re.compile(r"^\d{2}-\d{4}-([A-Z]{2,3})-\d{4,8}-[A-Z0-9]{3,4}-[A-Z0-9]{2,3}$")
BALANCE_RE = re.compile(r"^\$[\d,]+\.\d{2}$")
HDR_MARKERS = ("Plaintiff(", "Defendant(", "Petitioner(", "Respondent(")

DEFAULT_CASE_TYPES = ("CA",)  # circuit civil = foreclosure filings

# Order matches PUBLIC_ESIGN_SCHEMA.sql (properties + owners) with status/source
# and an informational case_type column for the eCaseView follow-up.
CSV_FIELDS = [
    "cause_nbr", "case_type", "surplus_amount", "status", "source",
    "address", "city", "state", "zip", "county", "parcel_id",
    "auction_date", "sale_price", "mortgage_balance",
    "first_name", "last_name", "email", "phone",
]


@dataclass
class DepositRow:
    case_nbr: str = ""
    balance: float = 0.0
    plaintiffs: List[str] = field(default_factory=list)
    defendants: List[str] = field(default_factory=list)

    @property
    def case_type(self) -> str:
        m = CASE_NBR_RE.match(self.case_nbr)
        return m.group(1) if m else ""


def _read_pdf_bytes(url: str) -> bytes:
    """GET a URL with a modest timeout; raise on non-200."""
    req = Request(url, headers={"User-Agent": "SurplusClaimAI-lead-scraper/0.1"})
    with urlopen(req, timeout=45) as resp:
        if resp.status != 200:
            raise HTTPError(url, resp.status, "non-200", None, None)
        return resp.read()


def fetch_pdf(pdf_path: str | None = None) -> Tuple[Path, str]:
    """Return (pdf_path_on_disk, provenance).

    Cascade: explicit --pdf > live Clerk URL > Wayback mirrors > local
    snapshot copy from the florida-palm-beach research folder.
    """
    if pdf_path:
        return Path(pdf_path), "explicit:" + str(pdf_path)

    try:
        data = _read_pdf_bytes(LIVE_URL)
        p = Path(".") / "civil_registry_and_civil_bond_deposits_live.pdf"
        p.write_bytes(data)
        LOGGER.info("Fetched from live Clerk URL (%d bytes)", len(data))
        return p, "live:" + LIVE_URL
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        LOGGER.info("Live Clerk URL unavailable (%s: %s); trying Wayback", type(exc).__name__, exc)

    for wb in WAYBACK_CANDIDATES:
        try:
            data = _read_pdf_bytes(wb)
            p = Path(".") / "civil_registry_and_civil_bond_deposits_wayback.pdf"
            p.write_bytes(data)
            LOGGER.info("Fetched from Wayback mirror (%d bytes)", len(data))
            return p, "wayback:" + wb
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            LOGGER.info("Wayback candidate failed (%s)", wb)

    if LOCAL_SNAPSHOT is not None:
        LOGGER.info("Falling back to local snapshot %s", LOCAL_SNAPSHOT)
        return LOCAL_SNAPSHOT, "local:" + str(LOCAL_SNAPSHOT)

    raise RuntimeError(
        "No source reachable: live URL, Wayback mirrors, and the local "
        "snapshot all failed. Download the PDF and pass --pdf explicitly."
    )


def _lines_from_words(words: List[dict]) -> List[List[Tuple[str, float, float]]]:
    """Group page words into visual lines; returns lines of (text, x0, top)."""
    ordered = sorted(words, key=lambda w: (round(w["top"] / LINE_TOP_TOLERANCE), w["x0"]))
    grouped: List[List[dict]] = []
    for w in ordered:
        if grouped and abs(grouped[-1][0]["top"] - w["top"]) <= LINE_TOP_TOLERANCE:
            grouped[-1].append(w)
        else:
            grouped.append([w])
    return [
        [(w["text"], w["x0"], w["top"]) for w in sorted(g, key=lambda w: w["x0"])]
        for g in grouped
    ]


def parse_pdf(pdf_path: Path) -> List[DepositRow]:
    """Extract deposit rows from the registry PDF (stateful across pages)."""
    import pdfplumber

    rows: List[DepositRow] = []
    current = DepositRow()

    def finalize() -> None:
        nonlocal current
        if current.case_nbr:
            rows.append(current)
        current = DepositRow()

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for line in _lines_from_words(page.extract_words()):
                top = line[0][2]
                if top < PAGE_HEADER_TOP_MAX:
                    continue  # page title band
                text_all = " ".join(t for t, _, _ in line)
                if any(m in text_all for m in HDR_MARKERS):
                    continue  # column header row

                case_toks = [
                    t for t, x0, _ in line
                    if x0 < CASE_X0_MAX and CASE_NBR_RE.match(t)
                ]
                bal_toks = [
                    t for t, x0, _ in line
                    if BALANCE_X0_MIN <= x0 <= BALANCE_X0_MAX and BALANCE_RE.match(t)
                ]
                # Join every word on the line into ONE party per column: the
                # same visual line carries the full name (e.g. "BITTEL, STEPHEN"
                # or "BOCA GAS CO INC"), never a partial token.
                plaint_words = [t for t, x0, _ in line
                                if PLAINTIFF_X0_MIN <= x0 < DEFENDANT_X0_MIN
                                and not BALANCE_RE.match(t)]
                defend_words = [t for t, x0, _ in line
                                if x0 >= DEFENDANT_X0_MIN and not BALANCE_RE.match(t)]
                if plaint_words:
                    name = " ".join(plaint_words).strip()
                    if name and name not in current.plaintiffs:
                        current.plaintiffs.append(name)
                if defend_words:
                    name = " ".join(defend_words).strip()
                    if name and name not in current.defendants:
                        current.defendants.append(name)

                if case_toks:
                    finalize()
                    current.case_nbr = case_toks[0]
                if bal_toks and not current.balance:
                    current.balance = float(bal_toks[0][1:].replace(",", ""))
        finalize()
    return rows


def filter_rows(rows: Iterable[DepositRow], keep_types: Sequence[str] | None,
                keep_all: bool) -> List[DepositRow]:
    if keep_all:
        return list(rows)
    wanted = set(keep_types or DEFAULT_CASE_TYPES)
    return [r for r in rows if r.case_type in wanted]


def split_owner_name(party: str) -> Tuple[str, str]:
    """Return (first_name, last_name).  'LAST, FIRST' splits on the comma;
    entity names (no comma) go to last_name so nothing is lost."""
    party = " ".join(party.split())
    if "," in party:
        last, _, first = party.partition(",")
        return first.strip().title(), last.strip().title()
    return "", party.title()


def to_lead_rows(rows: Iterable[DepositRow]) -> List[dict]:
    """One output row per (case, defendant).  Blank-name rows (no defendant
    parsed) are kept so the money-confirmed case is not lost; they need
    eCaseView enrichment for the owner."""
    out: List[dict] = []
    for r in rows:
        if not r.defendants:
            LOGGER.warning("No defendants parsed for %s - owner needs eCaseView lookup", r.case_nbr)
            out.append({
                "cause_nbr": r.case_nbr, "case_type": r.case_type,
                "surplus_amount": f"{r.balance:.2f}", "status": "SOLD",
                "source": "clerk-registry", "county": "Palm Beach",
                "state": "FL", "first_name": "", "last_name": "",
            })
            continue
        for d in r.defendants:
            first, last = split_owner_name(d)
            out.append({
                "cause_nbr": r.case_nbr, "case_type": r.case_type,
                "surplus_amount": f"{r.balance:.2f}", "status": "SOLD",
                "source": "clerk-registry", "county": "Palm Beach",
                "state": "FL", "first_name": first, "last_name": last,
            })
    return out


def write_csv(lead_rows: Iterable[dict], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    lead_rows = list(lead_rows)
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in lead_rows:
            writer.writerow(row)
    LOGGER.info("Wrote %d lead rows to %s", len(lead_rows), out_path)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--pdf", help="local PDF path (skips fetch cascade)")
    parser.add_argument("--out", help="output CSV path (default scrapers/output/palm_beach_registry_leads_YYYYMMDD.csv)")
    parser.add_argument("--case-types", default=",".join(DEFAULT_CASE_TYPES),
                        help="comma-separated case types to keep (default: CA)")
    parser.add_argument("--keep-all", action="store_true", help="keep every case type (diagnostics)")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
    )

    pdf_path, provenance = fetch_pdf(args.pdf)
    LOGGER.info("Parsing %s (source: %s)", pdf_path, provenance)
    all_rows = parse_pdf(pdf_path)

    if args.keep_all:
        keep_types = None
    else:
        keep_types = [t.strip().upper() for t in args.case_types.split(",") if t.strip()]

    kept = filter_rows(all_rows, keep_types, args.keep_all)

    type_counts = Counter(r.case_type or "?" for r in all_rows)
    LOGGER.info("Parsed %d deposit rows; case types: %s", len(all_rows), dict(type_counts))
    LOGGER.info("Keeping %d rows (types %s)", len(kept), keep_types or "ALL")

    lead_rows = to_lead_rows(kept)
    # Sum once per case (one balance per case; lead_rows repeat it per defendant).
    total_surplus = sum(
        float(row["surplus_amount"]) for row in
        {r["cause_nbr"]: r for r in lead_rows}.values()
    )
    LOGGER.info("Lead rows: %d; total registry balance (unique cases): $%.2f",
                len(lead_rows), total_surplus)

    out = Path(args.out) if args.out else (
        Path(__file__).resolve().parent / "output" / "palm_beach_registry_leads_20260923.csv"
    )
    write_csv(lead_rows, out)
    print(f"OK  rows={len(all_rows)} kept={len(kept)} leads={len(lead_rows)} total=${total_surplus:,.2f}")
    print(f"OUT {out}")
    print("FLAGGED (cannot map from this PDF): address city zip parcel_id auction_date "
          "sale_price mortgage_balance email phone -> enrichment (eCaseView/RealForeclose) required")
    return 0


if __name__ == "__main__":
    sys.exit(main())
