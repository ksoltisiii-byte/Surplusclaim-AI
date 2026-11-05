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
| `src/data/checkout.ts` | payment links, slugs, names, `checkoutUrl(slug)`, `buyLabel(slug)` — **no file paths** |
| `src/lib/purchase.ts` | **server only**: the download paths + the `/thank-you` gate |
| `src/components/storefront.tsx` | product-page Buy button → Stripe; prices from `pricing.ts` |
| `src/components/EmailSignup.tsx` | signup form; renders nothing unless `MAILING_LIST_ENDPOINT` is set |
| `src/components/Analytics.tsx` | GA4 loader + SPA page-view tracking; renders nothing unless `GA_MEASUREMENT_ID` is set |
| `src/lib/mailing-list.ts` | server functions reading `process.env.MAILING_LIST_ENDPOINT` |
| `src/lib/analytics.ts` | server function reading `process.env.GA_MEASUREMENT_ID` |
| `src/routes/__root.tsx` | root layout — GA4 wired here, so every page is covered |
| `src/routes/thank-you.tsx` | `/thank-you?item=<slug>&session_id=…` — the download page |
| `src/routes/index.tsx` | bundle price from `pricing.ts`, FAQ delivery answer, signup |
| `src/routes/consumer-letters-bundle.tsx` | Buy button → Stripe; prices from `pricing.ts` |
| `src/routes/{what-is-a-debt-validation-letter,how-do-i-dispute-a-credit-report-error,debt-collector-contacted-you}.tsx` | prices from `pricing.ts` |
| `src/styles/app.css` | `.sf-downloads`, `.sf-signup` |
| `public/sitemap.xml` | 12 public URLs; `/thank-you` deliberately absent |
| `public/robots.txt` | allows crawling, disallows `/thank-you`, points at the sitemap |

Not mirrored: the eight paid files copied into `public/downloads/<token>/` (binaries).

## Payment links (one-time; Express account)

| slug | Stripe payment link |
| --- | --- |
| debt-validation-letter | https://buy.stripe.com/5kQeVd7wIbJp3KU0nZ6EU00 |
| credit-report-dispute-letter | https://buy.stripe.com/8x2dR918kaFlepy7Qr6EU01 |
| independent-contractor-agreement | https://buy.stripe.com/dRmdR9cR26p5chqfiT6EU02 |
| non-disclosure-agreement | https://buy.stripe.com/fZuaEXbMYdRxa9i3Ab6EU03 |
| consumer-letters-bundle | https://buy.stripe.com/14A5kD04g6p54OY4Ef6EU04 |

Each payment link redirects to
`https://www.surplusclaimai.com/thank-you?item=<slug>&session_id={CHECKOUT_SESSION_ID}`
(configured in the Stripe dashboard; Stripe substitutes a real `cs_live_…` id).

## Download folders (random 48-hex tokens)

The tokens now live **only** in `src/lib/purchase.ts`, which the build keeps on
the server. They used to sit in `src/data/checkout.ts`, which meant every visitor
downloaded the paths in the client bundle whether or not they had bought
anything; `grep -r "/downloads/" dist/client` now returns nothing.

| item | folder |
| --- | --- |
| debt-validation-letter | `public/downloads/<token>/` |
| credit-report-dispute-letter | `public/downloads/<token>/` |
| independent-contractor-agreement | `public/downloads/<token>/` |
| non-disclosure-agreement | `public/downloads/<token>/` |

The token values are deliberately **not** written down here, in any other file
in this repository, or in any commit message. This repository is public: a
committed token is a published download path, and the folder name alone is what
gates the file. The values live only in the working site's `src/lib/purchase.ts`
(the source of truth that gets published) and in the `public/downloads/` folder
names beside it. `purchase.ts` is gitignored so it cannot be re-committed here
by accident — see the note at the top of that file.

**Mitigation, not access control.** `/thank-you` now requires BOTH a known `item`
slug AND a `session_id` shaped like a Stripe Checkout Session id
(`cs_live_…`/`cs_test_…` + 16–120 alphanumerics). Missing, empty or malformed →
the fallback page, with no download links and no file paths anywhere in the HTML
or the client bundle. That closes the old "type the URL, get the files" hole.

What it does **not** do: verify the payment. The site has no Stripe secret key
(the account is a managed Express account), so it cannot call Stripe to ask
whether that session exists, was paid, or belongs to this item. Someone who
invents a well-formed-looking id still gets the files, and a buyer who shares
their own link passes it on. The real fix is `GET /v1/checkout/sessions/<id>` on
the server with a secret key and `payment_status === "paid"` — which needs the
owner to move to a Stripe account that issues a secret key for the site.

## Email capture

`MAILING_LIST_ENDPOINT` unset → the form is not rendered at all and the POST
handler refuses. Set → the browser posts to a server function, which forwards:

```
POST <MAILING_LIST_ENDPOINT>
Content-Type: application/json
{"email":"buyer@example.com","source":"surplusclaimai.com"}
```
2xx = success; anything else is shown to the visitor as a failure.

## Analytics

`GA_MEASUREMENT_ID` (a GA4 id: `G-` + 4–20 alphanumerics) is read per request in
`src/lib/analytics.ts` and passed down from the root route. Unset or malformed →
`{ measurementId: null }` → no `<script>` tag, no gtag.js request, no console
output; the site is byte-for-byte the pre-analytics site. Set → the loader and
`gtag('config', …)` go in `<head>` and `AnalyticsPageViews` sends one `page_view`
per client-side route change (subscribed to the router's `onResolved` event, so
an SPA navigation is not lost).

## SEO files

`public/sitemap.xml` — 12 URLs, absolute `https://www.surplusclaimai.com/…`:
`/`, the five product pages, the five guide pages, `/terms`. `/thank-you` is
excluded on purpose (post-purchase page, `noindex` in its own meta tags).

`public/robots.txt` — `Allow: /`, `Disallow: /thank-you`,
`Sitemap: https://www.surplusclaimai.com/sitemap.xml`.

## Verification

Production build (`npm run build`, then the built server on a scratch port):

- `/sitemap.xml` → 200, `text/xml`, 12 `<loc>` entries parsed; all 12 URLs → 200
  with their real page titles. `/thank-you` is not in the file.
- `/robots.txt` → 200, `text/plain`, 274 bytes, the file above — ours, not a
  generated one, both on the dev server and through the platform dev URL.
- `/thank-you?item=debt-validation-letter` → 200, **0** `/downloads/…` strings,
  0 `<a download>` tags. With `&session_id=cs_live_…` → 2 links. Malformed ids
  (`cs_live_`, `cs_test_short`, `abc123`, 400×`x`, `cs_live_`+500×`A`) → 0.
- `grep -r "/downloads/" dist/client` → nothing; no 48-hex token in any client
  chunk.
- GA unset: 0 gtag script tags, `window.gtag` undefined, `window.dataLayer`
  undefined, no googletagmanager request, console buffer empty. GA set to a
  dummy id: script tag + config in `<head>`, and a client-side navigation pushes
  `["event","page_view",{page_location,page_title,send_to}]`.
- `/`, `/debt-validation-letter`, `/terms`, `/thank-you`: 200 with real rendered
  text (not an empty page). `npm run build` passes.

---

# Guide page: "Do I need a contract with a subcontractor?"

Source copy: `/home/team/shared/guides/do-i-need-a-contract-with-a-subcontractor.md`
(reviewed, 1,796 words). Rendered verbatim; only the "Notes for the reviewer"
section is left out, as with the other guides.

| This folder (`public-site-checkout/…`) | Live site (`/home/team/shared/site/…`) |
| --- | --- |
| `src/routes/do-i-need-a-contract-with-a-subcontractor.tsx` (new) | the new guide route |
| `src/routes/do-i-need-an-independent-contractor-agreement.tsx` | + inbound link to the new guide (closing section) |
| `src/components/storefront.tsx` | + optional `relatedGuide` field; ICA product links to the new guide |
| `public/sitemap.xml` | + the new URL (13 URLs; `/thank-you` still absent) |
| `src/routeTree.gen.ts` | regenerated by the router plugin — generated, not hand-edited |

**Price.** No price string is typed in the route. The closing CTA's last
sentence is `{guidePriceSentence("independent-contractor-agreement")}` from
`src/data/pricing.ts`, which today renders "It is $12.99 through November 10,
2026, and $19.99 after that." `LAUNCH_ACTIVE` stays `true`.

**Deliberately not linked:** `/consumer-letters-bundle` (consumer debt/credit
tool, off-topic for a freelancer hiring help — reviewer note 8).

**Verification** (dev server, HTTP 200 + text read off the rendered HTML):
- `/do-i-need-a-contract-with-a-subcontractor` → 200, 16,496 bytes; title tag
  and 153-character meta description as specified; H1 and all ten H2s present;
  both CTAs (`/independent-contractor-agreement`, `/non-disclosure-agreement`);
  blockquote notice and closing italic disclaimer present.
- `/independent-contractor-agreement` → 200; link "Read our guide to contracts
  with a subcontractor".
- `/do-i-need-an-independent-contractor-agreement` → 200; link "contracts with
  a subcontractor" in the closing section.
- `public/sitemap.xml` parses as XML, 13 `<loc>` entries, no duplicates, no
  `/thank-you`.
- `npm run build` passes.
