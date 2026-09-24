# Palm Beach registry-PDF lead parser (Source B quick win)

`palm_beach_registry.py` turns the Palm Beach County Clerk's **"Civil
Registry and Civil Bond Deposits"** unclaimed-funds PDF into a leads CSV of
foreclosure candidates with money already on deposit.

## Run

```bash
pip install pdfplumber           # only non-stdlib dependency
python3 -m scrapers.palm_beach_registry                 # fetch cascade + parse + write
python3 -m scrapers.palm_beach_registry --pdf /path/to/list.pdf   # offline / explicit file
python3 -m scrapers.palm_beach_registry --keep-all      # diagnostics: keep every case type
python3 -m scrapers.palm_beach_registry --out /path/out.csv
```

Output: `scrapers/output/palm_beach_registry_leads_YYYYMMDD.csv`.

## Fetch cascade (order)

1. Live Clerk URL (`.../showpublisheddocument/4780/...`) — **Akamai-protected:
   verified HTTP 403 from a datacenter IP (2026-09-23)**.
2. Wayback mirror of that document (original bytes via `id_` flag).
3. Local snapshot in `florida-palm-beach/sources/` (used for development).
4. Hard failure with instructions if all sources fail.

The document ID (4780) repoints to a fresh PDF each cycle — re-resolve the
Clerk's Unclaimed Funds news item before relying on the live URL.

## What it does

- Parses the table by X-coordinate columns (case `x0=40`, balance `x0~167-186`,
  plaintiff `x0=213`, defendant `x0=579`; verified across all 9 pages of the
  2026-08-20 snapshot). Case rows that overflow a page boundary are carried
  across pages.
- Filters to case type `CA` (circuit civil = foreclosure filings) by default;
  `--case-types`/`--keep-all` override.
- Emits **one CSV row per defendant** (owner of record per
  F.S. §45.032(1)(a); assignees must prove entitlement under §45.033).
  `LAST, FIRST` names split into first/last; entity names stay in `last_name`.
- `status=SOLD` and `surplus_amount=<registry balance>` — money is on deposit,
  so a completed sale is proven by the list itself.

## Field mapping vs PUBLIC_ESIGN_SCHEMA.sql

Mapped (exact schema names): `cause_nbr`, `surplus_amount`, `status`, `source`,
`county=Palm Beach` (constant), `state=FL` (constant), `first_name`,
`last_name`.

**Cannot map from this PDF (left blank — enrichment required):**
`address`, `city`, `zip`, `parcel_id`, `auction_date`, `sale_price`,
`mortgage_balance`, `email`, `phone`. Sources: eCaseView (judgment amount,
sale date, address), RealForeclose sold results, Property Appraiser (folio +
owner mailing address), skip-trace for contacts. A blank `last_name` row means
no defendant was parsed for that case (e.g. `50-2022-CA-006639-XXXX-MB`) —
it is kept intentionally and needs an eCaseView party lookup.

## Notes / flags for follow-up

- **Dedupe key:** `cause_nbr` (one case = one deposit; refresh monthly and
  before the Sept 1, 2026 deadline).
- **Claim deadline:** funds collected before Jan 1, 2025 must be claimed on or
  before **Sept 1, 2026**. The PDF does not state deposit dates — verify each
  case's deposit date before outreach.
- `CA` = circuit civil generally; **not every CA case is a mortgage
  foreclosure** (some are other circuit-civil money deposits). Confirm the
  case type/subject via eCaseView before claiming.
- Balances include both surplus and non-surplus registry deposits (e.g.
  court-ordered bond money) — case-type confirmation per row is required.
- One name line == one party. If a future snapshot wraps a party name across
  two lines, the parser will see two parties (no merge logic by design).
