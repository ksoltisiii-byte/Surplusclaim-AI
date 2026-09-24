# Hillsborough registry-PDF lead parser (expansion target #1)

`hillsborough_registry.py` turns the Hillsborough County Clerk of Court's
**nightly** "Registry & Trust Accounts With Balances" PDF (the register of every
dollar currently on deposit with the Clerk) into a leads CSV of Circuit Civil
(`-CA-`) accounts with money already on deposit.

Confirmed 2026-09-24 as the best Florida expansion source — better than Palm
Beach (Akamai-walled, periodic list) and Broward (no public list at all):

- **Nightly cadence** — a fresh PDF is published every night at an open
  directory with no auth and no bot wall:
  `https://publicrec.hillsclerk.com/Civil/registry_trust_balances/`
- **Machine-readable layout** — fixed X-column geometry (verified across both
  the 2026-09-22 and 2026-09-23 nightlies, 36 pages each).
- **Sections** — the report is split by registry code:
  - `2401` Registry Deposits – Circuit Civil  → **the foreclosure pool (44 rows
    on both nightlies; all `-CA-` case types)**
  - `2415` Guardianship Unclaimed Funds
  - `2416` Probate Unclaimed Funds (FS 733.816) → the Briggs-style estate play
- A balance means the money is on deposit with the Clerk **today** — the funds
  exist right now, no sale-completion inference needed.

## Run

```bash
pip install pdfplumber           # only non-stdlib dependency
python3 -m scrapers.hillsborough_registry                        # live: fetch newest nightly + parse + write
python3 -m scrapers.hillsborough_registry --pdf /path/to/list.pdf   # offline / explicit file
python3 -m scrapers.hillsborough_registry --sections 2401,2416      # include probate unclaimed funds
python3 -m scrapers.hillsborough_registry --keep-all                # diagnostics: every section
python3 -m scrapers.hillsborough_registry --out /path/out.csv --with-section
```

Output: `scrapers/output/hillsborough_registry_leads_YYYYMMDD.csv`.

## Fetch cascade (order)

1. Live directory listing → newest `Registry_and_TrustAccounts_Balances_as_of_*.pdf`
   (verified working from a datacenter IP, 2026-09-24; newest-first sorting by
   the embedded As-of date).
2. Local snapshot copy in `scrapers/output/` (used for offline runs).
3. Hard failure with the directory URL if all sources fail.

## What it does

- Parses the table by X-coordinate columns (verified across all 36 pages x two
  nightlies):
  - Case Number `x0 < 180` (e.g. `19-CA-006095`)
  - Party Name `x0 180..470` — a caption longer than the column wraps onto the
    next visual line and is appended to the open row
  - Increases `x0 470..593`, Decreases `x0 593..680`, Net Balance `x0 >= 680`
    (net = the last `$` token of the row)
- Section banners (`2401`, `2415`, `2416`, ...) and column headers reset the
  row accumulator so wrapped captions never bleed across sections.
- **Default output = section 2401 only** (Circuit Civil = the foreclosure pool).
  Verified: all 44 rows in 2401 are `-CA-` cases (`26-CA-004987` "ANY UNKNOWN
  HEIRS ..." $101,369.32 is a textbook foreclosure caption).
- **One CSV row per (case, deposit-account)**. A case can carry more than one
  registry account (verified: `21-CA-005559` has separate $39,392.50 ["Lomoglio,
  Karen"] and $46,780.00 ["Savvy Title Company, LLC"] accounts) — every account
  is summed, no per-case dedupe (unlike Palm Beach, which has one row per case).
- `status=SOLD`, `source=clerk-registry-nightly`, `county=Hillsborough`,
  `state=FL`; `LAST, FIRST` names split into first/last; entities stay in
  `last_name`. Blank-party rows are kept (docket enrichment needed for owner).
- Net-zero rows (empty accounts, e.g. `26-CA-000497` $0.00) are kept for
  visibility but are NOT leads — filter `surplus_amount > 0` before outreach.

## Verified snapshot (nightly of 2026-09-22; identical totals again 09-23)

- 449 deposit rows document-wide (09-22) / 451 (09-23); sections:
  `2401:44, 2404:1, 2408:3, 2412:366, 2415:5, 2416:24, 2417:6`
- 2401 (Circuit Civil): **44 rows, $2,696,873.62 total** (43 positive-balance
  accounts). Day-over-day the money pool is unchanged to the cent.
- Top 2401 accounts (net): Smoozie Holdings 1, LLC $412,534.16 ·
  Tutwiler & Associates Public Adjusters $393,992.50 · DHV Ventures, LLC
  $274,728.77 · Bisk Education Inc. $250,598.80 · Stuart, Cindy $226,740.20 ·
  Preferred Sandblasting & Painting, LLC $135,528.78 · Duarte, Alvaro
  $103,924.28 · ANY UNKNOWN HEIRS ... (26-CA-004987) $101,369.32 ·
  Old Tampa Bay Title, LLC $100,000.00 · Tampa Bay Bar Business, LLC $75,776.87
  · Chinnery, Patrice $75,684.40 ...
- **~half the 2401 accounts sit above the $21K attorney-fee floor** (12% of
  $21K+ covers the $2,500 flat engagement fee).

## Caveats (read before outreach)

- **CA ≠ foreclosure surplus.** Circuit Civil includes non-surplus deposits
  (interpleader, eminent domain, clerk-as-trustee captions such as
  "Pat Frank, Clerk of the Circuit Court", title-company captions). Every
  caption must be confirmed against the case docket before outreach.
- The Tampa Bay Water Authority deposit ($1,093,175.00, `26-CA-000085`) is an
  **eminent-domain** account — it lives in section `2404` (not 2401) and is
  flagged `KNOWN_NON_SURPLUS` in --keep-all runs.
- **Caption/balance overlap:** a long caption that runs into the money column
  makes pdfplumber merge digits into the last word (e.g. 15-CA-001463
  `...and for H$5ill2s,b3o7r7o.u4g8h` = "Hillsborough" + "52,377.48" merged).
  The net balance is unaffected (clean `$` token at x0>=680); the row is
  flagged CAPTION OVERLAP and its party name must be confirmed on the docket.
  Flagged on 09-22: `26-CA-000497`, `15-CA-001463`, `17-CA-001731`,
  `26-CA-004987` (the two "Unknown Heirs" rows are prime foreclosure captions).
- Fields the registry does not carry (address, city, zip, parcel_id,
  auction_date, sale_price, mortgage_balance, email, phone) are blank —
  enrichment from the Hillsborough docket (myHillsboroughCase / clerk) and
  Property Appraiser required. Owner-of-record per F.S. 45.032(1)(a) is the
  defendant; assignees must prove entitlement under F.S. 45.033.

## Next steps (pipeline)

1. Docket-confirm the top 2401 captions (which are foreclosure surplus vs
   interpleader/eminent domain) — Tampa attorney coverage pending.
2. Add 2416 (probate unclaimed funds, 24 rows) triage for the Briggs-style
   estate play.
3. Wire the output CSV into the shared leads pipeline (same schema as
   palm_beach_registry.py / PUBLIC_ESIGN_SCHEMA.sql).