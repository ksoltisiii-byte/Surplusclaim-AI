#!/usr/bin/env python3
"""Fetch current Harris County public tax-sale records into a CSV."""
from __future__ import annotations

import argparse
import logging
from pathlib import Path

try:
    from .harris_county_scraper import HarrisCountyScraper, write_csv
except ImportError:  # supports python scrapers/harris_county_cli.py
    from harris_county_scraper import HarrisCountyScraper, write_csv


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "-o", "--output", default="harris-county-surplus.csv",
        help="CSV destination (default: %(default)s)",
    )
    parser.add_argument("--max-records", type=int, default=None)
    parser.add_argument("--max-pages", type=int, default=20)
    parser.add_argument("--delay", type=float, default=0.35, help="Seconds between API pages")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--no-fallback", action="store_true", help="Do not inspect the clerk fallback")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(levelname)s: %(message)s")

    scraper = HarrisCountyScraper(
        max_records=args.max_records,
        max_pages=args.max_pages,
        delay=args.delay,
        timeout=args.timeout,
        use_fallback=not args.no_fallback,
    )
    records = list(scraper.fetch())
    count = write_csv(records, Path(args.output))
    print(f"Wrote {count} Harris County records to {args.output} (source: {scraper.last_source or 'none'})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
