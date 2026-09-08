#!/usr/bin/env python3
"""Fetch LGBS Texas tax-sale surplus candidates into a CSV."""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# Running ``python3 scrapers/harris_county_cli.py`` from the project root does
# not automatically expose the sibling data-pipeline directory.  Add both the
# project root and that directory before importing scraper modules.
ROOT = Path(__file__).resolve().parents[1]
for path in (ROOT, ROOT / "data-pipeline"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from scrapers.lgbs import LGBSClient, LGBSScraper, write_csv  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--county", action="append", dest="counties", help="County filter; repeatable")
    parser.add_argument("--all-counties", action="store_true", help="Fetch every TX county returned by filter_bar")
    parser.add_argument("-o", "--output", default="harris-county-surplus.csv")
    parser.add_argument("--max-records", type=int, default=None)
    parser.add_argument("--max-pages", type=int, default=100)
    parser.add_argument("--page-size", type=int, default=50)
    parser.add_argument("--delay", type=float, default=0.35)
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(levelname)s: %(message)s")
    counties = None if args.all_counties else (tuple(args.counties) if args.counties else ("HARRIS COUNTY",))
    scraper = LGBSScraper(
        client=LGBSClient(timeout=args.timeout, delay=args.delay),
        counties=counties,
        max_pages=args.max_pages,
        page_size=args.page_size,
    )
    leads = scraper.fetch()
    if args.max_records is not None:
        leads = leads[: max(0, args.max_records)]
    count = write_csv(leads, Path(args.output))
    total = sum(lead.estimated_surplus or 0 for lead in leads)
    print(f"Records pulled: {len(leads)}")
    print(f"Surplus candidates: {count}")
    print(f"Total estimated surplus: ${total:,.2f}")
    print(f"Wrote {count} rows to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
