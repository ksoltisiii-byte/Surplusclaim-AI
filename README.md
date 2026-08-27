# SurplusClaim AI

Fully automated foreclosure surplus recovery platform.

- **Dashboard** (port 3000) — real-time KPI cards, pipeline funnel, state breakdown, top leads, revenue projection, payment tracker
- **Public Website & Partner Portal** (port 4000) — landing page with claim search, referral partner registration with live stats
- **Digital Intake & E-Sign** (port 5000) — homeowner form, engagement letter, HTML5 Canvas signature pad; auto-generates claims on signature
- **Data pipeline** (`data-pipeline/`) — Python: schema, lead scoring, demo data (SQLite)
- **Config** — `config.json` (ports, fee %, email/SMS settings, claim engine endpoint)

## Quick start

```bash
bash scripts/start.sh          # seeds demo data + launches all 3 services
bash scripts/stop.sh           # stops them
node scripts/seed-demo.js      # (re)seed workflow demo data — idempotent
```

All three servers are plain Node (Express) with **zero native dependencies** — SQLite access
uses Node's built-in `node:sqlite`. Requires Node ≥ 22.5.

## Architecture

```
config.json            master config (services, fee, email/sms, claim engine)
lib/db.js              shared SQLite helper + lead scoring (mirrors scoring.py)
dashboard/             Express API + KPI frontend on :3000
website/               Express + landing page + partner portal on :4000
intake/                Express + e-sign intake on :5000
scripts/start.sh       launcher (idempotent)
scripts/seed-demo.js   seeds outreach/engagements/claims/payments/partners/referrals
data-pipeline/         Python pipeline (schema + demo properties/owners)
```

## API surface

- `GET /api/health` — health check on every service
- Dashboard: `/api/summary`, `/api/funnel`, `/api/states`, `/api/leads`, `/api/revenue`, `/api/payments`, `/api/outreach`, `/api/outreach/preview?owner_id=&template=`, `POST /api/outreach/contacted`
- Website: `/api/search?q=`, `/api/stats`, `POST /api/partners`
- Intake: `/api/properties`, `/api/letter?owner_id=`, `POST /api/sign`

The intake server calls the **claim engine** (`POST http://127.0.0.1:7100/generate`,
see `config.json → claim_engine`) after a signature is captured; if the engine is not
running it falls back to creating a draft claim locally.
