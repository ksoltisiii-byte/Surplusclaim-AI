# LGBS Tax-Sale API — Reverse-Engineered Spec (VERIFIED WORKING)

Source: `taxsales.lgbs.com` (Linebarger Goggan Blair & Sampson, LLP tax-sale listing site).
This is the live, real foreclosure tax-sale feed covering Texas (and Pennsylvania).

## Base
- **Hostname**: `https://taxsales.lgbs.com`
- **No auth token required** (public API, served via nginx).
- Responses are JSON. All endpoints are GET.

## Key endpoints
| Endpoint | Purpose |
|----------|---------|
| `/api/property_sales/?<filters>` | The main feed — individual property/sale records |
| `/api/filter_bar/?limit=1000` | List-of-values: county, state, sale_date_only, status, precinct |
| `/api/sale_counties/?limit=60` | Counties having sales on a given `sale_date_only` |
| `/api/sale_status/?limit=60` | Status list-of-values |
| `/api/counties/suggest/?search=` | County typeahead (geocoded) |
| `/api/property_sales/:uid/` | Single property detail |
| `/api/property_sales/cluster/` | Map cluster aggregation |
| `/api/property_sales/favorites/` | Favorites by uid |

## Main feed: `/api/property_sales/`
Response shape: `{ "count": <int>, "results": [ ... ] }`

### Filters (query params) — verified
- `state` — e.g. `TX` (uppercase 2-letter)
- `county` — **UPPERCASE + " COUNTY" suffix**, e.g. `HARRIS COUNTY`, `DALLAS COUNTY`
- `sale_date_only` — date string, e.g. `2026-09-01`
- `sale_type` — comma list: `SALE`, `RESALE`, `STRUCK OFF`, `FUTURE SALE`
- `status` — e.g. `Scheduled for Auction`, `Available for Future Sale`, `Sold`, `Cancelled`, `Postponed`, `Stayed`, `Struck off to Jurisdiction`
- `min_minimum_bid` / `max_minimum_bid` — numeric range on minimum_bid
- `min_value` / `max_value` — numeric range on appraised value
- `account_nbr`, `cause_nbr`, `sale_nbr`, `precinct`, `prop_zipcode`
- `ordering` — comma list of fields, e.g. `sale_date,street_name,address_full,uid`
- `limit` — page size (site uses 10; max observed 600)
- `offset` — pagination

### Record fields (verified from live response)
- `uid` — unique id (also used for detail lookups)
- `cause_nbr` — court cause number (e.g. `202423346`)
- `account_nbr` — tax account number
- `sale_date` — ISO datetime or null
- `sale_type` — `SALE` | `RESALE` | `STRUCK OFF` | `FUTURE SALE`
- `status` — e.g. `Scheduled for Auction`, `Available for Future Sale`
- `minimum_bid` — the opening bid (≈ delinquent taxes + costs); numeric
- `value` — appraised/total market value; numeric
- `prop_address_one`, `prop_address_two`, `prop_city`, `prop_state`, `prop_zipcode`
- `county` — e.g. `HARRIS COUNTY`
- `precinct`, `school_district`
- `latitude`, `longitude`, `geometry` (GeoJSON)
- `sale_published`, `county_sale_list` (report flags)
- `hasPhoto`, `googleView`, `status`

## Surplus recovery interpretation
For each record, **estimated surplus ≈ `value` − `minimum_bid`** (when the property sells above the minimum bid, the overage is excess proceeds owed to the former owner). Strong candidates = high value, low minimum_bid, `status` in (`Sold`, `Scheduled for Auction`, `Struck off to Jurisdiction`).

## Verified live example (Harris County, TX — 357 records returned)
```
uid: 1008349988
cause_nbr: 202423346
account_nbr: 0641330030012
sale_date: 2026-09-01T10:00:00
sale_type: SALE
status: Scheduled for Auction
minimum_bid: 63271.55
value: 234451.00   → estimated surplus ~$171,179
prop_address_one: 2904 CETTI ST
prop_city: HOUSTON, prop_state: TX, prop_zipcode: 77009-6912
county: HARRIS COUNTY, precinct: 6
```

## TX counties currently in feed (from filter_bar)
ANGELINA, BEXAR, CAMERON, CAMP, DALLAS, DELTA, EL PASO, GALVESTON, GREGG,
HARRIS, HAYS, HIDALGO, HOOD, HOPKINS, HUNT, LA SALLE, LIBERTY, MCLENNAN,
ORANGE, PARKER, TARRANT, VAN ZANDT, VICTORIA, WILLACY.
(Also Pennsylvania: PA state filter works the same way.)

## Working curl examples
```bash
# Harris County, TX — all sale types, first 50
curl -s "https://taxsales.lgbs.com/api/property_sales/?limit=50&state=TX&county=HARRIS%20COUNTY"

# Only scheduled auctions with value >= 100k
curl -s "https://taxsales.lgbs.com/api/property_sales/?limit=50&state=TX&county=HARRIS%20COUNTY&min_value=100000"

# Filter bar (counties/dates/statuses)
curl -s "https://taxsales.lgbs.com/api/filter_bar/?limit=1000"
```
