# Public e-sign route — mirror for review (feature/public-esign)

**What this is.** A review mirror of the public e-sign flow that lives in the
platform-managed TanStack Start site at `/home/team/shared/site`. That site is
NOT a git repository — it ships only via `publish_site` — so the changed files
are mirrored here for PR review, exactly as deployed.

## Files

| Repo (this folder)                     | Live site (`/home/team/shared/site`)         |
| -------------------------------------- | -------------------------------------------- |
| `src/routes/sign.tsx`                  | `src/routes/sign.tsx` (route `/sign`)        |
| `src/lib/esign.ts`                     | `src/lib/esign.ts` (server functions)        |
| `src/data/business.ts`                 | `src/data/business.ts` (business config)     |
| `NEON_SCHEMA.sql`                      | (lead executes against Neon once connected)  |

Keep the mirrors byte-identical; the live site files are authoritative.

## Behavior

- `GET /sign?token=<uuid>` — loads ONE homeowner's property + the SURPLUS
  RECOVERY ENGAGEMENT LETTER (owner-ratified copy, 30% contingency, full
  disclosure) from Neon. Tokens are unguessable per-owner UUIDs; no picker, no
  demo data, no other owners' data. Opted-out owners get the same "not found"
  response as a bad token.
- Canvas signature pad (pointer events, PNG) → `POST` server function validates
  (name/email/agree/PNG magic) and inserts a `signed` engagement into Neon with
  a server-composed snapshot of the exact wording signed; owner email/phone/
  mailing address are written back and `verified` set.
- Business contact fields come from `src/data/business.ts` — real, owner-ratified
  values (mirror of `letters/config.json`). Never placeholders.
- Pre-DB (DATABASE_URL unset) the page renders an honest "not fully set up yet —
  call us" state; the site still builds and serves everything else.

## Schema

Run `NEON_SCHEMA.sql` in Neon once DATABASE_URL is connected. Summary:

- `properties` — mirror of local ops schema (parcel_id UNIQUE, cause_nbr etc.)
- `owners` — + `sign_token TEXT UNIQUE` (the deep-link key)
- `engagements` — new; `owner_id, fee_percent, status, signed_at, signer_name,
  signer_email, signature_png, document_text, created_at`

Issuing a link: insert property + owner with `gen_random_uuid()::text` as
`sign_token`, then email the owner `https://www.surplusclaimai.com/sign?token=<t>`
(lead handles all outreach).

## Deploy

After merge/review: `publish_site` (builds `/home/team/shared/site` and swaps
the live copy). Nothing is live until that succeeds. Do NOT run `bun run
serve.ts` or `publish.sh` by hand — `serve.ts` force-kills whatever owns :3000.