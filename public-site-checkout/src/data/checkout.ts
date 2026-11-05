/**
 * The one place a purchase is defined: the Stripe payment link for each item,
 * its slug, and the name it is shown under.
 *
 * Every "Buy" button on the site reads from here. Do not hard-code a payment URL
 * anywhere else.
 *
 * STATUS (2026-11-05): the site used to point every Buy button at a third-party
 * marketplace shop address that returned a 404 — the shop had no public trace at
 * all. That module is gone. Sales now run through the business's own Stripe
 * payment links (one-time payments; the account is an Express account, so
 * subscriptions are not possible), and the files are delivered by the
 * /thank-you route after Stripe redirects back to it.
 *
 * HOW A PURCHASE WORKS
 *   1. The buyer clicks `checkoutUrl(slug)` and pays on Stripe's own page.
 *   2. Stripe redirects to
 *        /thank-you?item=<slug>&session_id={CHECKOUT_SESSION_ID}
 *      — the redirect URL is set on each payment link in the Stripe dashboard,
 *      so it must match these slugs exactly. Change a slug here and the Stripe
 *      redirect has to change too.
 *   3. /thank-you asks the server (~/lib/purchase) whether that item/session pair
 *      may be shown, and only then renders the download links.
 *
 * WHERE THE DOWNLOAD PATHS LIVE (they are NOT here, on purpose)
 *   The paths to the paid files used to sit in this file, which meant every
 *   visitor downloaded them in the JavaScript bundle whether or not they had
 *   bought anything. They now live only in ~/lib/purchase, which the build keeps
 *   on the server: nothing in the client bundle contains a download path.
 *
 *   That is still obscurity plus a guess-resistance check, NOT access control —
 *   see the long comment in ~/lib/purchase.
 */
import { BUNDLE_PRICE, priceFor } from "./pricing";

/** Every sellable item, keyed by the slug used in the Stripe redirect URL. */
export const CHECKOUT_LINKS = {
  "debt-validation-letter": "https://buy.stripe.com/5kQeVd7wIbJp3KU0nZ6EU00",
  "credit-report-dispute-letter": "https://buy.stripe.com/8x2dR918kaFlepy7Qr6EU01",
  "independent-contractor-agreement": "https://buy.stripe.com/dRmdR9cR26p5chqfiT6EU02",
  "non-disclosure-agreement": "https://buy.stripe.com/fZuaEXbMYdRxa9i3Ab6EU03",
  "consumer-letters-bundle": "https://buy.stripe.com/14A5kD04g6p54OY4Ef6EU04",
} as const;

export type CheckoutSlug = keyof typeof CHECKOUT_LINKS;

/** The bundle is the only item priced as a set rather than per product. */
export const BUNDLE_SLUG: CheckoutSlug = "consumer-letters-bundle";

/** How each item is named to a visitor. No file paths, no prices. */
export const CHECKOUT_NAMES: Record<CheckoutSlug, string> = {
  "debt-validation-letter": "Debt Validation Letter",
  "credit-report-dispute-letter": "Credit Report Dispute Letter",
  "independent-contractor-agreement": "Independent Contractor Agreement",
  "non-disclosure-agreement": "Non-Disclosure Agreement",
  "consumer-letters-bundle":
    "Debt Validation Letter + Credit Report Dispute Letter",
};

export interface CheckoutItem {
  slug: CheckoutSlug;
  /** Plain name, used in headings and labels. */
  name: string;
}

/** Every sellable item, in display order. */
export const CHECKOUT_ITEMS: CheckoutItem[] = (
  Object.keys(CHECKOUT_LINKS) as CheckoutSlug[]
).map((slug) => ({ slug, name: CHECKOUT_NAMES[slug] }));

/** True for the five slugs Stripe can redirect back with. */
export function isCheckoutSlug(slug: unknown): slug is CheckoutSlug {
  return typeof slug === "string" && Object.hasOwn(CHECKOUT_LINKS, slug);
}

/** The Stripe payment link for a slug, or undefined for anything unknown. */
export function checkoutUrl(slug: string): string | undefined {
  return isCheckoutSlug(slug) ? CHECKOUT_LINKS[slug] : undefined;
}

/**
 * Button text. The price always comes from ~/data/pricing so the launch price
 * ends in one place; nothing here knows what anything costs.
 */
export function buyLabel(slug: string): string {
  const price = slug === BUNDLE_SLUG ? BUNDLE_PRICE : priceFor(slug);
  return `Buy now — ${price}`;
}
