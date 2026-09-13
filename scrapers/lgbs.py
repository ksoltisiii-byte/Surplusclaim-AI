#!/usr/bin/env python3
"""Public LGBS tax-sale feed scraper.

This module uses only the documented, unauthenticated GET API exposed by
``taxsales.lgbs.com``.  It intentionally leaves owner fields blank: the LGBS
auction feed does not publish legal-owner names or contact information.
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import re
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

LOGGER = logging.getLogger(__name__)
BASE_URL = "https://taxsales.lgbs.com"
FILTER_BAR_PATH = "/api/filter_bar/"
PROPERTY_SALES_PATH = "/api/property_sales/"
DETAIL_PATH = "/api/property_sales/{uid}/"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "output" / "harris_surplus.csv"
CSV_FIELDS = (
    "uid", "cause_nbr", "account_nbr", "sale_type", "status", "estimated_surplus",
    "address", "city", "state", "zip", "county", "parcel_id", "auction_date",
    "sale_price", "mortgage_balance", "first_name", "last_name", "email", "phone",
)


@dataclass(frozen=True)
class SurplusLead:
    """Normalized LGBS record suitable for CSV export and later import.

    ``sale_price`` stores appraised value and ``mortgage_balance`` stores the
    opening/minimum bid so the existing importer computes the same
    ``sale_price - mortgage_balance`` estimate.  The raw meanings are also
    preserved as ``estimated_surplus`` and in the identifiers/status fields.
    """

    uid: str
    cause_nbr: str
    account_nbr: str
    sale_type: str
    status: str
    estimated_surplus: float | None
    address: str
    city: str
    state: str
    zip: str
    county: str
    parcel_id: str
    auction_date: str
    sale_price: float | None
    mortgage_balance: float | None
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    phone: str = ""

    @property
    def has_surplus(self) -> bool:
        return self.estimated_surplus is not None and self.estimated_surplus > 0


def _number(value: Any) -> float | None:
    if value is None or not str(value).strip():
        return None
    match = re.search(r"-?\d+(?:,\d{3})*(?:\.\d+)?", str(value))
    if not match:
        return None
    try:
        return round(float(match.group(0).replace(",", "")), 2)
    except ValueError:
        return None


def _date(value: Any) -> str:
    return str(value or "").strip()[:10]


def _county_key(name: Any) -> str:
    """Normalize a county label to the feed's UPPER + ' COUNTY' form."""
    county = _text(name).upper()
    return county if county.endswith(" COUNTY") else county + " COUNTY"


def _text(value: Any) -> str:
    # API detail responses occasionally contain line breaks in addresses.
    return " ".join(str(value or "").split())


def _county_label(value: str) -> str:
    return " ".join(word.capitalize() for word in value.split())


def normalize_record(row: dict[str, Any]) -> SurplusLead | None:
    """Convert one LGBS API object to a lead, skipping incomplete rows.

    LGBS provides assessed value and minimum bid rather than a confirmed
    winning bid.  ``estimated_surplus`` therefore represents a candidate
    overage (value - minimum bid), not a guaranteed recovery.
    """
    state = _text(row.get("prop_state") or row.get("state")).upper()
    county_raw = _text(row.get("county")).upper()
    if state != "TX" or not county_raw:
        return None
    county = _county_label(county_raw)
    uid = _text(row.get("uid"))
    account = _text(row.get("account_nbr"))
    if not uid:
        return None
    address = _text(row.get("address_full")) or " ".join(
        part for part in (_text(row.get("prop_address_one")), _text(row.get("prop_address_two"))) if part
    )
    city, zipcode = _text(row.get("prop_city")), _text(row.get("prop_zipcode"))
    auction_date = _date(row.get("sale_date_only") or row.get("sale_date"))
    value, minimum_bid = _number(row.get("value")), _number(row.get("minimum_bid"))
    if value is None or minimum_bid is None or value <= minimum_bid:
        return None
    estimated = round(value - minimum_bid, 2)
    if not all((address, city, zipcode, auction_date, account)):
        LOGGER.debug("Skipping incomplete LGBS row uid=%s", uid)
        return None
    return SurplusLead(
        uid=uid,
        cause_nbr=_text(row.get("cause_nbr")),
        account_nbr=account,
        sale_type=_text(row.get("sale_type")),
        status=_text(row.get("status")),
        estimated_surplus=estimated,
        address=address,
        city=city,
        state="TX",
        zip=zipcode,
        county=county,
        parcel_id=f"{county_raw.replace(' ', '-')}-{account}",
        auction_date=auction_date,
        # These two columns preserve compatibility with data-pipeline/importer.py:
        # importer computes the same value - minimum_bid estimate.
        sale_price=value,
        mortgage_balance=minimum_bid,
    )


class LGBSClient:
    """Small stdlib HTTP client for the public LGBS API."""

    def __init__(self, base_url: str = BASE_URL, *, timeout: float = 30.0, delay: float = 0.35) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = max(1.0, float(timeout))
        self.delay = max(0.0, float(delay))

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        query = ("?" + urlencode({k: v for k, v in (params or {}).items() if v is not None})) if params else ""
        request = Request(
            self.base_url + path + query,
            headers={
                "Accept": "application/json",
                "User-Agent": "SurplusClaimAI-public-record-research/1.0",
            },
        )
        with urlopen(request, timeout=self.timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("LGBS API response is not an object")
        return payload

    def filter_bar(self) -> dict[str, Any]:
        return self.get(FILTER_BAR_PATH, {"limit": 1000})

    def property_sales(self, params: dict[str, Any]) -> dict[str, Any]:
        return self.get(PROPERTY_SALES_PATH, params)

    def detail(self, uid: str | int) -> dict[str, Any]:
        return self.get(DETAIL_PATH.format(uid=uid))


class LGBSScraper:
    """Enumerate configured Texas counties from the LGBS public feed."""

    def __init__(
        self,
        *,
        client: LGBSClient | None = None,
        county: str | None = "HARRIS COUNTY",
        counties: Sequence[str] | None = None,
        state: str = "TX",
        page_size: int = 50,
        max_pages: int = 100,
        include_details: bool = False,
    ) -> None:
        self.client = client or LGBSClient()
        requested = counties if counties is not None else ((county,) if county else None)
        self.counties = tuple(c.upper().strip() for c in requested) if requested else None
        self.state = state.upper().strip()
        self.page_size = max(1, min(int(page_size), 600))
        self.max_pages = max(1, int(max_pages))
        self.include_details = include_details
        self.available_counties: tuple[str, ...] = ()
        self.last_detail_errors = 0
        self.records_pulled = 0
        # Per-county counters: {"pulled" (raw feed rows), "candidates",
        # "surplus" (sum of estimated surplus for deduplicated leads)}.
        self.per_county: dict[str, dict[str, int | float]] = {}

    def discover_counties(self) -> tuple[str, ...]:
        """Read county/state values from filter_bar rather than hardcoding them."""
        payload = self.client.filter_bar()
        found: set[str] = set()
        for row in payload.get("results", []):
            if not isinstance(row, dict):
                continue
            state = _text(row.get("state")).upper()
            county = _text(row.get("county")).upper()
            if state == self.state and county:
                found.add(county if county.endswith(" COUNTY") else county + " COUNTY")
        self.available_counties = tuple(sorted(found))
        if self.counties is None:
            return self.available_counties
        # Configured counties are intersected with the live list when possible.
        # If a provider changes filter_bar shape, preserve the requested county
        # so a direct feed call can still provide a useful error/result.
        live = set(self.available_counties)
        return tuple(c for c in self.counties if not live or c in live)

    def _rows_for_county(self, county: str) -> Iterator[dict[str, Any]]:
        offset = 0
        for page in range(self.max_pages):
            if page:
                time.sleep(self.client.delay)
            payload = self.client.property_sales({
                "state": self.state,
                "county": county,
                "limit": self.page_size,
                "offset": offset,
                "ordering": "sale_date,street_name,address_full,uid",
            })
            results = payload.get("results", [])
            if not isinstance(results, list) or not results:
                return
            for row in results:
                if isinstance(row, dict):
                    yield row
            offset += len(results)
            if len(results) < self.page_size:
                return

    def fetch(self) -> list[SurplusLead]:
        """Fetch, normalize, deduplicate by parcel, and optionally enrich details.

        Raw feed rows are counted per county into ``self.per_county``; after
        deduplication, candidate counts and surplus sums are attributed back to
        each county so the CLI can print a TX-wide per-county summary.
        """
        counties = self.discover_counties()
        by_parcel: dict[str, SurplusLead] = {}
        for county in counties:
            pulled = 0
            for raw in self._rows_for_county(county):
                self.records_pulled += 1
                pulled += 1
                lead = normalize_record(raw)
                if lead is None:
                    continue
                # One lead per parcel: a re-listed account (multiple sale
                # dates/uids for the same parcel) must not flood the pipeline.
                # The first occurrence wins; uid is kept as a tie-breaker.
                by_parcel.setdefault(lead.parcel_id or lead.uid, lead)
            stats = self.per_county.setdefault(county, {"pulled": 0, "candidates": 0, "surplus": 0.0})
            stats["pulled"] = int(stats["pulled"]) + pulled
        for lead in by_parcel.values():
            if not lead.has_surplus:
                continue
            key = _county_key(lead.county)
            stats = self.per_county.setdefault(key, {"pulled": 0, "candidates": 0, "surplus": 0.0})
            stats["candidates"] = int(stats["candidates"]) + 1
            stats["surplus"] = round(float(stats["surplus"]) + float(lead.estimated_surplus or 0.0), 2)
        leads = list(by_parcel.values())
        if self.include_details:
            # Detail currently exposes case/legal description metadata but no
            # legal-owner name. Keep enrichment optional to avoid 1 request/row.
            for lead in leads:
                try:
                    self.client.detail(lead.uid)
                    if self.client.delay:
                        time.sleep(self.client.delay)
                except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError):
                    self.last_detail_errors += 1
        return leads


def write_csv(leads: Iterable[SurplusLead], output: str | Path = DEFAULT_OUTPUT) -> int:
    """Idempotently write one row per UID in importer-compatible CSV format."""
    path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    unique: dict[str, SurplusLead] = {}
    for lead in leads:
        if lead.has_surplus:
            unique[lead.uid] = lead
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for lead in unique.values():
            writer.writerow(asdict(lead))
    return len(unique)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--county", action="append", dest="counties", help="County filter; repeatable (default: Harris)")
    parser.add_argument("--all-counties", action="store_true", help="Fetch every TX county returned by filter_bar")
    parser.add_argument("-o", "--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--page-size", type=int, default=50)
    parser.add_argument("--max-pages", type=int, default=100)
    parser.add_argument("--delay", type=float, default=0.35)
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--details", action="store_true", help="Request one detail endpoint per row")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(levelname)s: %(message)s")
    counties = None if args.all_counties else (tuple(args.counties) if args.counties else ("HARRIS COUNTY",))
    scraper = LGBSScraper(
        client=LGBSClient(timeout=args.timeout, delay=args.delay),
        county=None if args.all_counties else "HARRIS COUNTY",
        counties=counties, page_size=args.page_size, max_pages=args.max_pages,
        include_details=args.details,
    )
    try:
        leads = scraper.fetch()
    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        parser.error(f"LGBS request failed: {exc}")
        return 2
    rows = write_csv(leads, args.output)
    candidates = [lead for lead in leads if lead.has_surplus]
    total = round(sum(lead.estimated_surplus or 0 for lead in candidates), 2)
    print(f"Counties discovered: {', '.join(scraper.available_counties) if scraper.available_counties else 'none returned'}")
    print(f"CSV rows written: {rows} -> {args.output}")
    print()
    print("Per-county summary (records pulled | surplus candidates | est. surplus):")
    for county in sorted(scraper.per_county):
        stats = scraper.per_county[county]
        print(f"  {county.title():<24} {int(stats['pulled']):>7} {int(stats['candidates']):>7}  ${float(stats['surplus']):>13,.2f}")
    print(f"  {'TEXAS TOTAL':<24} {scraper.records_pulled:>7} {len(candidates):>7}  ${total:>13,.2f}")
    if args.details:
        print(f"Detail lookup errors: {scraper.last_detail_errors}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
