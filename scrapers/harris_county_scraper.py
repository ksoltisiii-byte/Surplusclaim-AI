"""Harris County, Texas public tax-sale record scraper.

The LGBS tax-sales map is a client-rendered Angular application.  Its public
JSON endpoint is used here directly, with a small official-clerk fallback when
the vendor endpoint is unavailable.  This module intentionally collects only
publicly displayed sale metadata; it does not log in, bypass controls, or
attempt to infer a former owner's identity.
"""
from __future__ import annotations

import csv
import json
import logging
import re
import time
from dataclasses import asdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable, Iterator
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

LOGGER = logging.getLogger(__name__)
LGBS_ENDPOINT = "https://taxsales.lgbs.com/api/property_sales/"
LGBS_MAP_URL = (
    "https://taxsales.lgbs.com/map?lat=29.76&lon=-95.36&zoom=10&offset=0"
    "&ordering=precinct,sale_nbr,uid&sale_type=SALE,RESALE"
)
HARRIS_CLERK_URL = "https://www.cclerk.hctx.net/"
CSV_FIELDS = (
    "address", "city", "state", "zip", "county", "parcel_id",
    "auction_date", "sale_price", "mortgage_balance", "first_name",
    "last_name", "email", "phone",
)


def _pipeline_types():
    """Load the shared ForeclosureRecord/Scraper types despite the hyphenated package directory."""
    import importlib

    for name in ("data-pipeline.pipeline", "data_pipeline.pipeline", "pipeline"):
        try:
            module = importlib.import_module(name)
            return module.ForeclosureRecord, module.Scraper
        except (ImportError, AttributeError):
            continue
    raise ImportError("Could not import the shared data-pipeline pipeline module")


ForeclosureRecord, Scraper = _pipeline_types()


def _number(value: Any) -> float | None:
    if value is None:
        return None
    match = re.search(r"-?\d+(?:,\d{3})*(?:\.\d+)?", str(value))
    if not match:
        return None
    try:
        return float(match.group(0).replace(",", ""))
    except ValueError:
        return None


def _date(value: Any) -> str:
    return str(value or "").strip()[:10]


def _record_from_api(row: dict[str, Any]) -> ForeclosureRecord | None:
    """Normalize one LGBS property-sale JSON object.

    LGBS exposes ``minimum_bid`` and assessed ``value`` rather than a confirmed
    closing price.  We use minimum_bid as the conservative sale-price proxy,
    falling back to value where minimum_bid is absent.  The resulting surplus
    is explicitly a *candidate* amount and must be verified with Harris County
    before outreach or claims.
    """
    county = str(row.get("county") or "").strip().upper()
    state = str(row.get("prop_state") or row.get("state") or "").strip().upper()
    if county not in {"HARRIS", "HARRIS COUNTY"} or state != "TX":
        return None

    address = " ".join(
        part.strip() for part in (
            row.get("prop_address_one"), row.get("prop_address_two")
        ) if str(part or "").strip()
    )
    city = str(row.get("prop_city") or "").strip()
    zipcode = str(row.get("prop_zipcode") or "").strip()
    auction_date = _date(row.get("sale_date_only") or row.get("sale_date"))
    # A parcel/account number is more stable than the sale UID across runs.
    account = str(row.get("account_nbr") or "").strip()
    uid = str(row.get("uid") or "").strip()
    parcel_id = f"HARRIS-{account or uid}" if (account or uid) else ""
    sale_price = _number(row.get("minimum_bid"))
    if sale_price is None:
        sale_price = _number(row.get("value"))
    required = (address, city, zipcode, auction_date, parcel_id, sale_price)
    if not all(required):
        LOGGER.warning("Skipping LGBS record with missing required fields: %s", row.get("uid"))
        return None
    if sale_price <= 0:
        return None
    # Tax-sale records do not expose a mortgage balance.  A zero balance is a
    # data-source convention, not a representation that no lien exists.
    return ForeclosureRecord(
        address=address,
        city=city,
        state="TX",
        zip_code=zipcode,
        county="Harris",
        parcel_id=parcel_id,
        auction_date=auction_date,
        sale_price=round(sale_price, 2),
        mortgage_balance=0.0,
        surplus_amount=round(sale_price, 2),
        owner_first_name="",
        owner_last_name="",
        owner_email="",
        owner_phone="",
    )


class _ClerkTableParser(HTMLParser):
    """Conservative parser for a clerk fallback table, if one is published."""

    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag == "tr":
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell = []

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"td", "th"} and self._cell is not None and self._row is not None:
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row:
            self.rows.append(self._row)
            self._row = None


def _fetch_json(url: str, timeout: float) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "SurplusClaimAI-public-record-research/1.0",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("LGBS response was not a JSON object")
    return payload


class HarrisCountyScraper(Scraper):
    """Fetch publicly displayed Harris County tax-sale records from LGBS.

    ``fetch()`` returns normalized shared ``ForeclosureRecord`` instances.  The
    request is paginated and rate-limited.  Pass ``max_records`` to keep a
    research run bounded; the default fetches the current API result set.
    """

    def __init__(
        self,
        *,
        endpoint: str = LGBS_ENDPOINT,
        county: str = "HARRIS COUNTY",
        sale_types: str = "SALE,RESALE",
        page_size: int = 100,
        max_pages: int = 20,
        max_records: int | None = None,
        delay: float = 0.35,
        timeout: float = 30.0,
        use_fallback: bool = True,
    ) -> None:
        self.endpoint = endpoint
        self.county = county
        self.sale_types = sale_types
        self.page_size = max(1, min(int(page_size), 600))
        self.max_pages = max(1, int(max_pages))
        self.max_records = max_records if max_records is None else max(0, int(max_records))
        self.delay = max(0.0, float(delay))
        self.timeout = max(1.0, float(timeout))
        self.use_fallback = use_fallback
        self.last_source = ""

    def _query_url(self, offset: int) -> str:
        params = {
            "lat": "29.76",
            "lon": "-95.36",
            "zoom": "10",
            "offset": str(offset),
            "ordering": "precinct,sale_nbr,uid",
            "sale_type": self.sale_types,
            "county": self.county,
            "limit": str(self.page_size),
        }
        return self.endpoint + "?" + urlencode(params)

    def _fetch_lgbs(self) -> Iterator[ForeclosureRecord]:
        self.last_source = LGBS_ENDPOINT
        if self.max_records == 0:
            return
        seen: set[str] = set()
        offset = 0
        emitted = 0
        for page in range(self.max_pages):
            if page:
                time.sleep(self.delay)
            payload = _fetch_json(self._query_url(offset), self.timeout)
            results = payload.get("results", [])
            if not isinstance(results, list) or not results:
                break
            for row in results:
                if not isinstance(row, dict):
                    continue
                record = _record_from_api(row)
                if record is None or record.parcel_id in seen:
                    continue
                seen.add(record.parcel_id)
                yield record
                emitted += 1
                if self.max_records is not None and emitted >= self.max_records:
                    return
            if len(results) < self.page_size and not payload.get("next"):
                break
            offset += len(results)

    def _fetch_clerk_fallback(self) -> Iterator[ForeclosureRecord]:
        """Try the public clerk landing page without submitting a form.

        Harris County's clerk portal may require interactive search parameters;
        in that case returning no records is preferable to inventing data.
        """
        self.last_source = HARRIS_CLERK_URL
        request = Request(
            HARRIS_CLERK_URL,
            headers={"Accept": "text/html", "User-Agent": "SurplusClaimAI-public-record-research/1.0"},
        )
        with urlopen(request, timeout=self.timeout) as response:
            html = response.read().decode("utf-8", "replace")
        parser = _ClerkTableParser()
        parser.feed(html)
        # No stable public record table is assumed.  Keep this hook intentionally
        # conservative until the county publishes a documented export endpoint.
        LOGGER.info("Clerk fallback inspected %d HTML table rows; no stable export detected", len(parser.rows))
        return iter(())

    def fetch(self) -> Iterable[ForeclosureRecord]:
        try:
            yield from self._fetch_lgbs()
            return
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
            LOGGER.warning("LGBS tax-sale API unavailable: %s", exc)
            if not self.use_fallback:
                return
        try:
            yield from self._fetch_clerk_fallback()
        except (HTTPError, URLError, TimeoutError) as exc:
            LOGGER.warning("Harris County Clerk fallback unavailable: %s", exc)


def write_csv(records: Iterable[ForeclosureRecord], output: str | Path) -> int:
    """Write normalized records using data-pipeline/sample-surplus.csv columns."""
    path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for record in records:
            row = asdict(record)
            row["zip"] = row.pop("zip_code")
            row["first_name"] = row.pop("owner_first_name")
            row["last_name"] = row.pop("owner_last_name")
            row["email"] = row.pop("owner_email")
            row["phone"] = row.pop("owner_phone")
            writer.writerow({field: row.get(field, "") for field in CSV_FIELDS})
            count += 1
    return count


__all__ = [
    "HARRIS_CLERK_URL", "LGBS_ENDPOINT", "LGBS_MAP_URL", "HarrisCountyScraper",
    "write_csv",
]
