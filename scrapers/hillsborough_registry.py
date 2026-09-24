#!/usr/bin/env python3
"""Hillsborough County Clerk -- nightly "Registry & Trust Accounts With Balances" PDF -> leads CSV.

Expansion target confirmed 2026-09-24 (see /home/team/shared/county-ranking/FL_COUNTY_RANKING.md):
Hillsborough (Tampa) is the best Florida expansion county because the Clerk
publishes a NIGHTLY machine-readable registry-balance PDF at an open
directory with no auth and no bot wall:

    https://publicrec.hillsclerk.com/Civil/registry_trust_balances/

The file is republished every night ("Registry_and_TrustAccounts_Balances_as_of_MM_DD_YYYY.pdf"
style names; the directory listing shows the newest file first).  Every row is
money ON DEPOSIT with the Clerk -- a balance proves the funds exist today.
This is the same winning posture as the Palm Beach parser (Source B quick win)
but with a vastly better source: nightly freshness, no Akamai wall, and
dedicated 2415 Guardianship / 2416 Probate "Unclaimed Funds" sections.

Section codes seen in the registry report:
    2401  Registry Deposits - Circuit Civil     (the foreclosure/Circuit Civil pool)
    2415  Guardianship Unclaimed Funds
    2416  Probate Unclaimed Funds (FS 733.816)  (the estate play -- same as Briggs)

IMPORTANT CAVEAT (same as Palm Beach): case type CA == Circuit Civil, which
INCLUDES non-foreclosure money (e.g. 26-CA-000085, Tampa Bay Water Authority,
$1,093,175.00 -- an eminent-domain deposit, NOT foreclosure surplus).  The
parser emits all CA rows; each caption must be confirmed against the case
docket before outreach.  Known non-surplus rows are flagged in the summary.

Layout (verified against the 2026-09-22 nightly, 36 pages, all four column bands):
    Case Number   x0 <   180     (e.g. "19-CA-006095")
    Party Name    x0 180..470    (wrapped captions continue on the next line)
    Increases     x0 470..593
    Decreases     x0 593..679
    Net Balance   x0 >=  679     (net credit balance; the last "$" token of the row)

Row rule: PARTY NAME column holds ONE party (or caption) per case row; when a
name is longer than the column, the overflow wraps to the next visual line with
no case number and no dollar tokens (the parser appends it to the open row).

Pipeline (parse -> filter section - 2401 CA rows by default -> owner split ->
leads CSV) mirrors palm_beach_registry.py.  Field names match PUBLIC_ESIGN_SCHEMA.sql
where a value exists; fields the registry does not carry (address, city, zip,
parcel_id, auction_date, sale_price, mortgage_balance, email, phone) stay blank
and require docket enrichment (F.S. 45.032(1)(a) owner-of-record = the defendant
named in the lis pendens; assignees must prove entitlement under F.S. 45.033).

Dependency: pdfplumber (``pip install pdfplumber``).  Everything else is Python
standard library.

Usage:
    python3 -m scrapers.hillsborough_registry                 # fetch newest + parse + write
    python3 -m scrapers.hillsborough_registry --pdf /path/to/list.pdf
    python3 -m scrapers.hillsborough_registry --sections 2401,2416  # include probate funds
    python3 -m scrapers.hillsborough_registry --keep-all      # diagnostics: every section
    python3 -m scrapers.hillsborough_registry --out /path/out.csv -v
"""
from __future__ import annotations

import argparse
import csv
import logging
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

LOGGER = logging.getLogger("hillsborough_registry")

# --- Document source (verified 2026-09-24; open directory, no auth, no bot wall) ---
LIVE_DIR = "https://publicrec.hillsclerk.com/Civil/registry_trust_balances/"
PDF_FILENAME_RE = re.compile(r"^Registry_and_TrustAccounts_Balances_as_of_.+\.pdf$", re.I)

# Local snapshot used for development/offline runs (copy kept with the research docs).
_LOCAL_CANDIDATES = [
    Path("/home/team/shared/county-ranking/evidence/Hillsborough_Registry_and_TrustAccounts_Balances_as_of_2026-09-22.pdf"),
    Path(__file__).resolve().parent / "output" / "hillsborough_Registry_and_TrustAccounts_Balances_as_of_2026-09-22.pdf",
    Path(__file__).resolve().parent.parent / "data" / "hillsborough_registry_latest.pdf",
]
LOCAL_SNAPSHOT = next((p for p in _LOCAL_CANDIDATES if p.exists()), None)

# --- Layout constants (verified against the 2026-09-22 nightly, 36 pages) ---
CASE_X0_MAX = 180.0        # case numbers start at x0 = 41.5
PARTY_X0_MIN = 180.0       # party name column x0 = 181.0
PARTY_X0_MAX = 470.0       # ... up to the Increases column x0 ~ 472-500
INCREASES_X0_MIN = 470.0   # Increases x0 ~ 472-500
INCREASES_X0_MAX = 593.0
DECREASES_X0_MIN = 593.0    # Decreases x0 ~ 593-679 (rare; 40.00 seen @609)
DECREASES_X0_MAX = 680.0
NET_X0_MIN = 680.0          # Net Credit Balance x0 ~ 706-726
PAGE_HEADER_TOP_MAX = 100.0  # page title band (Registry & Trust Accounts ..., As of Date, Division)
LINE_TOP_TOLERANCE = 2.5     # pdfplumber 'top' varies ~0.1-0.5 within one visual line

CASE_NBR_RE = re.compile(r"^\d{2}-[A-Z]{2}-\d{4,8}$")
SECTION_RE = re.compile(r"^24\d\d$")
BALANCE_RE = re.compile(r"^\$[\d,]+\.\d{2}$")
HDR_MARKERS = ("Party Name", "Increases", "Decreases")
FOOTER_MARKER = ("Printed",)
# Column header band: any line carrying these tokens at the table-header positions is skipped.
HDR_CASE_TEXTS = {"Case", "Number", "Party", "Name", "Increases", "Decreases", "Net", "Credit", "Balance"}

DEFAULT_SECTIONS = ("2401",)  # 2401 = Registry Deposits - Circuit Civil (foreclosure pool)

# Case numbers that are KNOWN to sit in the registry for reasons OTHER than
# foreclosure surplus (verified from the 2026-09-22 nightly).  Flagged, never dropped.
KNOWN_NON_SURPLUS = {
    "26-CA-000085",  # Tampa Bay Water Authority - $1,093,175.00 eminent-domain deposit
}

# Order matches PUBLIC_ESIGN_SCHEMA.sql (properties + owners) with status/source and an
# informational case_type column for the docket follow-up (same schema as palm_beach_registry.py).
CSV_FIELDS = [
    "cause_nbr", "case_type", "surplus_amount", "status", "source",
    "address", "city", "state", "zip", "county", "parcel_id",
    "auction_date", "sale_price", "mortgage_balance",
    "first_name", "last_name", "email", "phone",
]
# Extra columns written to the CSV that the shared schema otherwise loses (registry section).
# We keep the output strictly schema-shaped for the pipeline and record the section in
# the diagnostics CSV + summary instead.
SECTION_FIELD = "registry_section"  # emitted as a 19th column by --with-section


@dataclass
class DepositRow:
    section: str = ""
    case_nbr: str = ""
    increases: float = 0.0
    decreases: float = 0.0
    net: float = 0.0
    party: List[str] = field(default_factory=list)
    overlap: bool = False  # caption ran into the money column (pdfplumber merged digits)

    @property
    def case_type(self) -> str:
        m = CASE_NBR_RE.match(self.case_nbr)
        return m.group(0).split("-")[1] if m else ""

    @property
    def party_name(self) -> str:
        return " ".join(self.party).strip()


def _read_bytes(url: str, timeout: int = 45) -> bytes:
    req = Request(url, headers={"User-Agent": "SurplusClaimAI-lead-scraper/0.1"})
    with urlopen(req, timeout=timeout) as resp:
        if resp.status != 200:
            raise HTTPError(url, resp.status, "non-200", None, None)
        return resp.read()


def _latest_pdf_url(dir_url: str = LIVE_DIR) -> Tuple[str, str]:
    """Return (url, filename of the newest registry PDF listed in the open directory)."""
    html = _read_bytes(dir_url).decode("utf-8", "replace")
    pdfs = []
    for m in re.finditer(r'href="([^"]+\.pdf)"', html, re.I):
        href = m.group(1)
        base = href.rsplit("/", 1)[-1]
        if PDF_FILENAME_RE.match(base):
            pdfs.append(base)
    if not pdfs:
        raise RuntimeError(
            "No registry PDF found in the directory listing. The file naming may have "
            "changed -- inspect " + dir_url
        )
    # Directory listings are newest-first (Apache default); sort defensively by the
    # embedded As-of date, which sorts lexicographically for MM_DD_YYYY naming.
    pdfs = sorted(set(pdfs), reverse=True)
    return urljoin(dir_url, pdfs[0]), pdfs[0]


def fetch_pdf(pdf_path: str | None = None) -> Tuple[Path, str]:
    """Return (pdf_path_on_disk, provenance).

    Cascade: explicit --pdf > live directory (newest file) > local snapshot copy.
    """
    if pdf_path:
        return Path(pdf_path), "explicit:" + str(pdf_path)

    try:
        url, name = _latest_pdf_url()
        data = _read_bytes(url)
        p = Path(".") / name
        p.write_bytes(data)
        LOGGER.info("Fetched newest nightly %s (%d bytes)", name, len(data))
        return p, "live:" + url
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        LOGGER.info("Live directory unavailable (%s: %s); trying local snapshot",
                    type(exc).__name__, exc)

    if LOCAL_SNAPSHOT is not None:
        LOGGER.info("Falling back to local snapshot %s", LOCAL_SNAPSHOT)
        return LOCAL_SNAPSHOT, "local:" + str(LOCAL_SNAPSHOT)

    raise RuntimeError(
        "No source reachable: live directory and the local snapshot both failed. "
        "Download the PDF (see " + LIVE_DIR + ") and pass --pdf explicitly."
    )


def _lines_from_words(words: List[dict]) -> List[List[Tuple[str, float, float]]]:
    """Group page words into visual lines; lines are (text, x0, top) sorted by x0."""
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
    """Extract deposit rows from the registry PDF (stateful across pages).

    Sections (2401/2415/2416) and column headers reset the row accumulator so a
    wrapped party caption from one section never bleeds into the next.
    """
    import pdfplumber

    rows: List[DepositRow] = []
    current = DepositRow()
    section = ""
    in_table = False   # between a column-header line and the next header/section/footer
    skip_until_header = False  # inside a section banner ("2401 REGISTRY DEPOSITS - CIRCUIT CIVIL")

    def finalize() -> None:
        nonlocal current
        if current.case_nbr:
            rows.append(current)
        current = DepositRow()
        current.section = section

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for line in _lines_from_words(page.extract_words()):
                if not line:
                    continue
                top = line[0][2]
                if top < PAGE_HEADER_TOP_MAX:
                    continue  # page title band (Registry & Trust Accounts / As of Date / Division)
                if any(FOOTER_MARKER[0] in t for t, _, _ in line):
                    in_table = False  # "Printed on ... Page X of Y"
                    continue

                left_texts = [t for t, x0, _ in line if x0 < CASE_X0_MAX]
                left0 = left_texts[0] if left_texts else ""

                # Section banner line, e.g. "2401 REGISTRY DEPOSITS - CIRCUIT CIVIL" or
                # "2416 Probate Unclaimed Funds (FS 733.816)". Its continuation line
                # ("CIVIL", "733.816)") is skipped via skip_until_header.
                if SECTION_RE.match(left0):
                    finalize()
                    section = left0
                    skip_until_header = True
                    in_table = False
                    continue

                # Column header line, e.g. "Case Number | Party Name | Increases | Decreases | Net Credit Balance".
                if any(h in left_texts for h in ("Case", "Party", "Number")):
                    skip_until_header = False
                    in_table = True
                    continue
                if skip_until_header:
                    continue  # rest of a section banner, before the column header

                if not in_table:
                    continue

                case_toks = [t for t, x0, _ in line if x0 < CASE_X0_MAX and CASE_NBR_RE.match(t)]
                if case_toks:
                    finalize()  # starts a new row ONLY when the first column carries a case number
                    current.case_nbr = case_toks[0]
                    current.section = section

                # A non-"$" token inside the money band (x0 >= 470) is caption overflow:
                # a long party name ran into the balance columns and pdfplumber merged
                # digits into the last word (verified: 15-CA-001463 "...and for
                # H$5ill2s,b3o7r7o.u4g8h <-- 'Hillsborough' + '52,377.48' merged").
                money_toks = []
                for t, x0, _ in line:
                    if x0 < INCREASES_X0_MIN:
                        continue
                    if BALANCE_RE.match(t):
                        money_toks.append((t, x0))
                    elif current.case_nbr and t.strip():
                        current.overlap = True
                party_toks = [
                    t for t, x0, _ in line
                    if PARTY_X0_MIN <= x0 < PARTY_X0_MAX and not BALANCE_RE.match(t)
                ]

                if party_toks and current.case_nbr:
                    for t in party_toks:
                        if t not in current.party:
                            current.party.append(t)
                if money_toks and current.case_nbr:
                    for t, x0 in money_toks:
                        val = float(t[1:].replace(",", ""))
                        if x0 >= NET_X0_MIN:
                            current.net = val
                        elif x0 >= DECREASES_X0_MIN:
                            current.decreases = val
                        else:
                            current.increases = val
        finalize()
    return rows


def filter_rows(rows: Iterable[DepositRow], keep_sections: Sequence[str] | None,
                keep_all: bool) -> List[DepositRow]:
    if keep_all:
        return list(rows)
    wanted = set(keep_sections or DEFAULT_SECTIONS)
    return [r for r in rows if r.section in wanted]


def split_owner_name(party: str) -> Tuple[str, str]:
    """Return (first_name, last_name).  'LAST, FIRST' splits on the comma;
    entity names (no comma) go to last_name so nothing is lost."""
    party = " ".join(party.split())
    if "," in party:
        last, _, first = party.partition(",")
        return first.strip().title(), last.strip().title()
    return "", party.title()


def to_lead_rows(rows: Iterable[DepositRow], with_section: bool = False) -> List[dict]:
    """One output row per (case, party).  Blank-party rows are kept so the
    money-confirmed case is not lost; they need docket enrichment for the owner."""
    out: List[dict] = []
    for r in rows:
        base = {
            "cause_nbr": r.case_nbr, "case_type": r.case_type,
            "surplus_amount": f"{r.net:.2f}", "status": "SOLD",
            "source": "clerk-registry-nightly", "county": "Hillsborough", "state": "FL",
            "first_name": "", "last_name": "",
        }
        if with_section:
            base[SECTION_FIELD] = r.section
        if not r.party_name:
            LOGGER.warning("No party parsed for %s (section %s) - owner needs docket lookup",
                           r.case_nbr, r.section)
            out.append(base)
            continue
        for party in (r.party_name,):
            first, last = split_owner_name(party)
            row = dict(base)
            row["first_name"] = first
            row["last_name"] = last
            out.append(row)
    return out


def write_csv(lead_rows: Iterable[dict], out_path: Path, with_section: bool = False) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    lead_rows = list(lead_rows)
    # Shared schema columns first; the registry section — a pure diagnostics value the
    # shared schema doesn't carry — is appended when --with-section is passed.
    fields = list(CSV_FIELDS)
    if with_section and SECTION_FIELD not in fields:
        fields.append(SECTION_FIELD)
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in lead_rows:
            writer.writerow(row)
    LOGGER.info("Wrote %d lead rows to %s", len(lead_rows), out_path)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--pdf", help="local PDF path (skips fetch cascade)")
    parser.add_argument("--out", help="output CSV path (default scrapers/output/hillsborough_registry_leads_YYYYMMDD.csv)")
    parser.add_argument("--sections", default=",".join(DEFAULT_SECTIONS),
                        help="comma-separated registry sections to keep (default: 2401)")
    parser.add_argument("--keep-all", action="store_true", help="keep every section (diagnostics)")
    parser.add_argument("--with-section", action="store_true",
                        help="append a registry_section column to the CSV")
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
        keep_sections = None
    else:
        keep_sections = [s.strip() for s in args.sections.split(",") if s.strip()]

    kept = filter_rows(all_rows, keep_sections, args.keep_all)

    section_counts = Counter(r.section or "?" for r in all_rows)
    type_counts = Counter(r.case_type or "?" for r in all_rows)
    LOGGER.info("Parsed %d deposit rows; sections: %s", len(all_rows), dict(section_counts))
    LOGGER.info("Case types: %s", dict(type_counts))
    LOGGER.info("Keeping %d rows (sections %s)", len(kept), keep_sections or "ALL")

    lead_rows = to_lead_rows(kept, args.with_section)
    # Hillsborough can carry MORE THAN ONE deposit account per case (verified:
    # 21-CA-005559 has separate $39,392.50 and $46,780.00 accounts) so — unlike
    # Palm Beach — every kept row is summed as its own deposit; no per-case dedupe.
    total_surplus = sum(float(row["surplus_amount"]) for row in lead_rows)

    multi = sorted({r.case_nbr for r in kept
                    if sum(1 for x in kept if x.case_nbr == r.case_nbr) > 1})
    if multi:
        LOGGER.info("Cases with multiple deposit accounts: %s", ", ".join(multi))

    overlaps = [r for r in kept if r.overlap]
    if overlaps:
        LOGGER.warning(
            "CAPTION OVERLAP (party name ran into the money column; net balance ok, "
            "caption needs docket confirmation): %s",
            ", ".join(f"{r.case_nbr} ({r.party_name or '?'}...)" for r in overlaps),
        )

    flagged = [r for r in kept if r.case_nbr in KNOWN_NON_SURPLUS]
    if flagged:
        for r in flagged:
            LOGGER.warning("KNOWN NON-SURPLUS (exclude from pipeline decisions): %s %s (party: %s)",
                           r.case_nbr, f"${r.net:,.2f}", r.party_name or "?")
        print(f"NOT-SURPLUS {[r.case_nbr for r in flagged]} (${sum(r.net for r in flagged):,.2f})")

    out = Path(args.out) if args.out else (
        Path(__file__).resolve().parent / "output" /
        f"hillsborough_registry_leads_{datetime.now():%Y%m%d}.csv"
    )
    write_csv(lead_rows, out, args.with_section)
    print(f"OK  rows={len(all_rows)} kept={len(kept)} leads={len(lead_rows)} "
          f"total=${total_surplus:,.2f}")
    print(f"OUT {out}")
    print("FLAGGED (cannot map from this PDF): address city zip parcel_id auction_date "
          "sale_price mortgage_balance email phone -> docket enrichment required; "
          "CA captions must be confirmed (Circuit Civil includes non-foreclosure deposits)")
    return 0


if __name__ == "__main__":
    sys.exit(main())