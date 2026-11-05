/**
 * Single source of truth for prices shown on the storefront.
 *
 * The owner runs a 14-day launch price on the two agreements: the window opened
 * 2026-10-27 and closes on 2026-11-10, when both go back to $19.99.
 *
 * To close the window: set LAUNCH_ACTIVE to false, run `npm run build`, and
 * publish. Every price mention on the site reads from this file — product cards
 * on the homepage and product pages, the terms page price list, and the two
 * guide pages — so nothing is left quoting the old price. Do not hard-code a
 * price anywhere else.
 *
 * The price shown here is what the Stripe payment links charge, so if a value
 * changes the matching Stripe price has to change the same day: the site and
 * Stripe must agree, or one of them is telling buyers something untrue.
 */

/** Flip to false on 2026-11-10 to end the launch price. */
export const LAUNCH_ACTIVE = true;

export const LAUNCH_PRICE = "$12.99";
export const REGULAR_PRICE = "$19.99";
export const LAUNCH_END_LABEL = "November 10, 2026";

/** The two consumer letters sold together — the only set price on the site. */
export const BUNDLE_PRICE = "$29.99";

/** Products carried in the launch window. Everything else is always REGULAR_PRICE. */
const LAUNCH_SLUGS: readonly string[] = [
  "independent-contractor-agreement",
  "non-disclosure-agreement",
];

export function isLaunchPriced(slug: string): boolean {
  return LAUNCH_ACTIVE && LAUNCH_SLUGS.includes(slug);
}

/** Card price. */
export function priceFor(slug: string): string {
  return isLaunchPriced(slug) ? LAUNCH_PRICE : REGULAR_PRICE;
}

/**
 * The small note under a card price. While the launch is on it names the regular
 * price and the concrete end date; once it is off there is no note at all.
 */
export function priceNoteFor(slug: string): string | undefined {
  if (!isLaunchPriced(slug)) return undefined;
  return `Introductory price through ${LAUNCH_END_LABEL} — regular price ${REGULAR_PRICE}.`;
}

/** One line for the terms page price list. */
export function priceLine(name: string, slug: string): string {
  if (!isLaunchPriced(slug)) return `${name} — ${REGULAR_PRICE}`;
  return `${name} — ${LAUNCH_PRICE} (introductory price through ${LAUNCH_END_LABEL}; regular price ${REGULAR_PRICE})`;
}

/** The price sentence used by the two guide pages. */
export function guidePriceSentence(slug: string): string {
  if (!isLaunchPriced(slug)) return `It is ${REGULAR_PRICE}.`;
  return `It is ${LAUNCH_PRICE} through ${LAUNCH_END_LABEL}, and ${REGULAR_PRICE} after that.`;
}
