# Public surplus-fund data sources

Use only public records and verify every record with the relevant clerk before contacting anyone. Formats and access change; treat these as research starting points, not guarantees of current availability.

## County foreclosure and surplus records

- **Los Angeles County, CA** — Treasurer and Tax Collector public auction/property-tax records: https://ttc.lacounty.gov/ ; foreclosure and court records are typically searchable HTML/PDF through the Superior Court portal. Verify surplus custody and claimant deadlines with the clerk.
- **Hillsborough County, FL** — Clerk of Circuit Court and Comptroller official records/foreclosure auction search: https://www.hillsclerk.com/ ; auction results and court filings generally appear as HTML search results with downloadable PDFs. Florida surplus procedures reference F.S. 45.035; coordinate with counsel.
- **Dallas County, TX** — Sheriff foreclosure sales and County Clerk records: https://www.dallascounty.org/departments/sheriff/foreclosure-sales.php ; sale notices/results and legal filings are commonly HTML/PDF. Confirm excess proceeds with the clerk.
- **Harris County, TX — Tax Assessor-Collector runs tax sales via https://www.hctax.net/ ; excess proceeds are NOT published as a machine-readable list. Harris surplus arises under Tax Code § 34.03 (claimed via the district clerk, https://www.hcdistrictclerk.com/ and http://www.cclerk.hctx.net/ , case-by-case); unclaimed funds escheat to the county school fund after 2 years (§ 34.04). No bulk export exists — each claim is a manual case lookup from an LGBS Sold row or docket search. See `HARRIS_EXCESS_PROCEEDS.md`.

## State-level unclaimed property

- **California Controller — Unclaimed Property**: https://ucpi.sco.ca.gov/ — searchable HTML claimant database; useful for post-transfer funds, but validate identity and claim status directly.
- **Florida CFO — Unclaimed Property**: https://www.fltreasurehunt.gov/ — searchable HTML records and claim workflow.
- **Texas Comptroller — Unclaimed Property**: https://claimittexas.gov/ — searchable HTML records and downloadable claim forms.

## Ingestion notes

County clerks, treasurers, and auditors may publish CSV exports, HTML tables, or scanned PDFs. Do not scrape behind authentication or bypass access controls. Preserve source URL, retrieval date, parcel/case identifier, and a copy of the official record for auditability. Confirm surplus amount, owner eligibility, deadline, and attorney requirements before outreach.
