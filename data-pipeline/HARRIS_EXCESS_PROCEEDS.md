# Harris County, TX — Excess Proceeds / Surplus Research

Status of the hunt for a machine-readable Harris County excess-proceeds list.
Research date: 2026-09-15. **Bottom line: no public machine-readable list exists.**
The LGBS Sold-row feed (see `scrapers/lgbs.py` + `LGBS_API_SPEC.md`) remains the
only automated pipeline; the sources below are the manual/nearest alternatives.

## What the law says

- **Tax Code § 34.03** — after a county tax-sale auction, the excess of the sale
  price over the judgment (taxes, penalties, costs, and sale expenses) goes to
  the now-former owner "without interest," claims against the county's general
  fund from the county or district clerk who collected the bid.
- **Texas Tax Code § 34.04** — if the excess proceeds are not claimed within
  **2 years**, the taxing unit pays them to the county school fund; the former
  owner's claim evaporates (subject to escheat rules).
- **Texas Tax Code § 34.041** — if the property sells for less than the court
  judgment (no excess), a **deficiency judgment** is owed by the former owner —
  this is the opposite case and NOT a lead.

## Where Harris records actually live (verified reachable 2026-09-15)

1. **Harris County Tax Assessor-Collector — hctax.net** — the auctioneer for
   Harris tax sales. `https://www.hctax.net/` (HTTP 200). The homepage names
   "Tax Sale" pages, but excess proceeds are NOT published there as a list or
   export. Their site is JS-heavy; auction info is event-based, not a feed.
2. **Harris County District Clerk — hcdistrictclerk.com** — legal predecessor of
   the modern `www.cclerk.hctx.net/` county civil court records search. `https://www.hcdistrictclerk.com/` (HTTP 200). Excess-proceeds claims surface only
   as **case-by-case civil docket entries** (cause numbers per lawsuit), not as
   a bulk listing.
3. **Texas Comptroller — claimittexas.gov** — **state unclaimed property**, not
   county excess proceeds. Money only lands here years later via escheatment.
   Useful for a different (post-fund-transfer) lead type, not for the current
   county-sale pipeline.

## Conclusion / recommendation

- **No CSV/API/JSON export of Harris excess proceeds exists publicly.** Do not
  fabricate one. Any per-property surplus amount must be computed by hand from
  the auction record (judgment + sale price) and verified with the clerk.
- **Nearest automated source stays the LGBS feed** (Sold rows) — it is the same
  auction universe (LGBS powers Harris's online tax sales) and is machine-readable.
- **Manual enrichment path: for each LGBS Sold row → look up the cause number in
  the district clerk records → confirm surplus was actually deposited → verify the
  former owner identity → outreach. Each claim is a manual case, not bulk.
- Run cadence: after every auction date (the Sold window then rotates out).

## Eligibility knownledge used for letters

Texas surplus claims in TX (incl. Harris) need **no attorney**; fee 30% contingency
per the engagement letter.