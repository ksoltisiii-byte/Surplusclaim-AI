# Stripe checkout + /thank-you delivery + email capture — mirror for review

**What this is.** A review mirror of the storefront changes that live in the
platform-managed TanStack Start site at `/home/team/shared/site`. That site is
NOT a git repository — it ships only via `publish_site` — so the changed files are
mirrored here for PR review, exactly as they sit on disk. The live site files are
authoritative; keep the mirrors byte-identical.

## Why

Every "Buy" button pointed at `https://www.etsy.com/shop/SurplusClaimAI`, which
returns a 404. The owner created five Stripe payment links; this change wires the
site to them and adds the page that delivers the files.

## Files

| This folder (`public-site-checkout/…`) | Live site (`/home/team/shared/site/…`) |
| --- | --- |
| `src/data/checkout.ts` (new) | payment links, download paths, `checkoutUrl(slug)`, `buyLabel(slug)` |
| `src/data/etsy.ts` | **deleted** — no Etsy reference survives anywhere in `src/` |
| `src/data/pricing.ts` | + `BUNDLE_PRICE` (values unchanged: `LAUNCH_ACTIVE = true`) |
| `src/components/storefront.tsx` | product-page Buy button → Stripe; prices from `pricing.ts` |
| `src/components/EmailSignup.tsx` (new) | signup form; renders nothing unless `MAILING_LIST_ENDPOINT` is set |
| `src/lib/mailing-list.ts` (new) | server functions reading `process.env.MAILING_LIST_ENDPOINT` |
| `src/routes/thank-you.tsx` (new) | `/thank-you?item=<slug>` — the download page |
| `src/routes/index.tsx` | bundle price from `pricing.ts`, FAQ delivery answer, signup |
| `src/routes/consumer-letters-bundle.tsx` | Buy button → Stripe; prices from `pricing.ts` |
| `src/routes/{what-is-a-debt-validation-letter,how-do-i-dispute-a-credit-report-error,debt-collector-contacted-you}.tsx` | prices from `pricing.ts` |
| `src/styles/app.css` | `.sf-downloads`, `.sf-signup` |

Not mirrored: the eight paid files copied into `public/downloads/<token>/` (binaries).

## Payment links (one-time; Express account)

| slug | Stripe payment link |
| --- | --- |
| debt-validation-letter | https://buy.stripe.com/5kQeVd7wIbJp3KU0nZ6EU00 |
| credit-report-dispute-letter | https://buy.stripe.com/8x2dR918kaFlepy7Qr6EU01 |
| independent-contractor-agreement | https://buy.stripe.com/dRmdR9cR26p5chqfiT6EU02 |
| non-disclosure-agreement | https://buy.stripe.com/fZuaEXbMYdRxa9i3Ab6EU03 |
| consumer-letters-bundle | https://buy.stripe.com/14A5kD04g6p54OY4Ef6EU04 |

Each payment link redirects to `https://www.surplusclaimai.com/thank-you?item=<slug>`.

## Download folders (random 48-hex tokens)

| item | token |
| --- | --- |
| debt-validation-letter | 728673bdd237f184f6fcc382af373a69368e05253c4555a3 |
| credit-report-dispute-letter | dcc79fe45b669e36537c11b92f8a83d917d6e7e0a91ac24a |
| independent-contractor-agreement | 85acb94459246a8924ff9a6ea9b76e9fe5179539d749b497 |
| non-disclosure-agreement | 4f8f2ee4cd4b6a91abbb0d8b0f8fd37a302c1e16bbf938be |

**Obscurity, not access control.** Anyone with a link can share it, and
`/thank-you?item=<slug>` is guessable — the slug is public. The fix is for the
payment link to redirect with `{CHECKOUT_SESSION_ID}` and for the site to verify
that session server-side (needs a Stripe secret key). Not done here.

## Email capture

`MAILING_LIST_ENDPOINT` unset → the form is not rendered at all and the POST
handler refuses. Set → the browser posts to a server function, which forwards:

```
POST <MAILING_LIST_ENDPOINT>
Content-Type: application/json
{"email":"buyer@example.com","source":"surplusclaimai.com"}
```
2xx = success; anything else is shown to the visitor as a failure.

## Verification (dev server, HTTP 200 + text present)

- `/`, all four product pages, `/consumer-letters-bundle`, and
  `/thank-you?item=<slug>` for all five slugs: 200 with real text and the correct
  Stripe URL. `/thank-you` with no/unknown `item` renders the fallback.
- All eight files fetch at `/downloads/<token>/…` with byte sizes matching the
  source templates.
- `grep -rin etsy src/` → 0 hits. `npm run build` passes.
