# Letters — Mail-Merge Outreach (Texas leads, printed mail)

Primary outreach channel per Business Plan rev 5: we reach surplus leads by
**printed mail**, not email. This module turns the LGBS scraper's lead CSV into
one print-ready letter per surplus candidate.

## Files

| File | Purpose |
|------|---------|
| `LETTER_COPY.md` | Owner-approved letter copy (ratified). The generator renders this verbatim; do not rewrite copy in code. |
| `generate-letters.js` | Node.js generator (no dependencies, plain `node`). |
| `config.example.json` | Business-identity template. Copy to `config.json` and fill REAL values before mailing. |
| `sample-leads.csv` | 3-row hand-written fixture mirroring the scraper's `CSV_FIELDS` (for tests / dry runs). |
| `output/` | Generated letters + manifest (gitignored; created on run). |

## Input

The lead CSV produced by `scrapers/lgbs.py` (`scrapers/output/harris_surplus.csv`
by default). Fixed columns: `uid, cause_nbr, account_nbr, sale_type, status,
estimated_surplus, address, city, state, zip, county, parcel_id, auction_date,
sale_price, mortgage_balance, first_name, last_name, email, phone`.

Only rows with `estimated_surplus > 0` get letters. Owner contact fields are
intentionally blank in the LGBS feed, so letters are addressed to
"Property Owner / Former Owner" — never invented names.

## Usage

```bash
# Copy example config and fill REAL business address/phone/domain:
cp letters/config.example.json letters/config.json
#   (edit letters/config.json — business_name, business_address,
#    business_city, business_state, business_zip, business_phone,
#    business_website, business_domain)

# Against the real scraper output:
node letters/generate-letters.js

# Against the sample CSV (sandbox / dry-run):
node letters/generate-letters.js --input letters/sample-leads.csv --out /tmp/letters-sample --date 2026-09-08

# Other options:
#   --config PATH   business JSON (default: letters/config.json)
#   --date YYYY-MM-DD  letter date (default: today)
#   --strict        FAIL instead of stamping DEMO when config has placeholders
#   --no-merged     skip the single merged printable document
#   -h              help
```

## Output

- `output/letters/<uid>.html` — one print-ready letter per surplus candidate.
- `output/letters/all-letters.html` — merged document (one letter per page) for bulk printing.
- `output/manifest.csv` — maps `uid → letter_file` plus mailing fields
  (address, city, state, zip, county, cause_nbr, estimated_surplus, status,
  auction_date, sale_type) and a `mail_ready` flag.

## Honesty / compliance guardrails (non-negotiable)

1. **Copy is verbatim** from `LETTER_COPY.md` — facts-only opening, "estimate,
   not a guarantee" inline and in the footer, no urgency, no invented names,
   no claim funds are confirmed or held.
2. **Standalone `$`**: the copy already contains `${{estimated_surplus}}`;
   the generator inserts the bare number (`82,500`), never a second `$`.
3. **County normalization**: the copy appends " County" after `{{county}}`;
   the generator strips a trailing "County" from the source so the feed's
   "Harris County" cannot render as "Harris County County".
4. **mail_ready gate**: if `letters/config.json` is missing or any business
   field still reads `REPLACE...`, the script stamps every letter
   **DEMO — NOT FOR MAILING** and writes `mail_ready=false` in the manifest.
   `--strict` turns that into a hard failure. Never mail DEMO-stamped letters.

## Running against the real feed

The scraper (`scrapers/lgbs.py`) is the upstream producer; once it lands in
`master` and its `output/` CSV is refreshed for all 24 TX counties, re-run:

```bash
python scrapers/lgbs.py --all-counties --output scrapers/output/texas_surplus.csv
node letters/generate-letters.js --input scrapers/output/texas_surplus.csv
```