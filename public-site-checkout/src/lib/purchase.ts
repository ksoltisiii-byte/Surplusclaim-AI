/**
 * /thank-you — deciding whether a visitor may see download links.
 *
 * THIS FILE RUNS ON THE SERVER ONLY. The file paths to the paid products live
 * here and nowhere else, so they never reach a browser that has not been through
 * the check below. (The build strips server-function handlers and the modules
 * they alone use out of the client bundle; `grep` over `dist/client` for a token
 * from DOWNLOAD_TOKENS is the way to re-check that after any change here.)
 *
 * WHAT THIS CHECK IS, AND WHAT IT IS NOT — read before trusting it
 * ---------------------------------------------------------------
 * Stripe redirects the buyer back to
 *     /thank-you?item=<slug>&session_id={CHECKOUT_SESSION_ID}
 * and Stripe substitutes a real Checkout Session id, e.g. `cs_live_a1B2…`.
 * This module renders the links only when BOTH are present:
 *   - `item` is one of the five slugs in ~/data/checkout, and
 *   - `session_id` is shaped like a Stripe Checkout Session id
 *     (`cs_live_…` / `cs_test_…` followed by a plausible run of characters).
 *
 * It is MITIGATION, NOT VERIFICATION. There is no secret API key available to
 * this site — the Stripe account is a managed Express account and the site holds
 * no `sk_…` key — so nothing here can call Stripe to ask whether that session
 * exists, whether it was paid, or whether it belongs to this item. Consequently:
 *
 *   - It DOES stop the old hole, where /thank-you?item=<slug> alone handed the
 *     files to anyone who typed the URL.
 *   - It does NOT stop a buyer sharing their own working link with anyone, and
 *     it does NOT stop someone inventing a well-formed-looking id
 *     (`cs_live_` + 50 random characters) and getting the files. The download
 *     folders are still protected only by their unguessable paths.
 *
 * The real fix is server-side session verification: a Stripe secret key in the
 * site's environment, `GET /v1/checkout/sessions/<id>` on the server, and the
 * links rendered only when `payment_status === "paid"` and the session's
 * metadata names this item. That needs the owner to move the account to a
 * Stripe account that issues a secret key for the site. Until then, say plainly
 * that this is guess-resistance.
 */
import { createServerFn } from "@tanstack/react-start";

import { CHECKOUT_NAMES, isCheckoutSlug } from "~/data/checkout";

/* Download folders — one random 48-hex-character token per item. The bundle
   reuses the two letters' folders because it delivers exactly those files. */
const DOWNLOAD_TOKENS: Record<string, string> = {
  "debt-validation-letter": "728673bdd237f184f6fcc382af373a69368e05253c4555a3",
  "credit-report-dispute-letter": "dcc79fe45b669e36537c11b92f8a83d917d6e7e0a91ac24a",
  "independent-contractor-agreement": "85acb94459246a8924ff9a6ea9b76e9fe5179539d749b497",
  "non-disclosure-agreement": "4f8f2ee4cd4b6a91abbb0d8b0f8fd37a302c1e16bbf938be",
};

export interface DownloadFile {
  /** What the buyer sees on /thank-you. */
  label: string;
  /** Public path to the file. */
  href: string;
  format: "PDF" | "DOCX";
}

/** One product's DOCX + PDF, under that product's random folder. */
function letterDownloads(
  tokenSlug: string,
  fileNameBase: string,
  name: string,
): DownloadFile[] {
  const dir = `/downloads/${DOWNLOAD_TOKENS[tokenSlug]}/${fileNameBase}-Template`;
  return [
    {
      label: `${name} — PDF, print-ready (US Letter)`,
      href: `${dir}.pdf`,
      format: "PDF",
    },
    {
      label: `${name} — DOCX, editable in Word or Google Docs`,
      href: `${dir}.docx`,
      format: "DOCX",
    },
  ];
}

interface Purchase {
  name: string;
  summary: string;
  downloads: DownloadFile[];
}

const ONE_TEMPLATE = "One blank template, two files: an editable DOCX and a print-ready PDF.";

const PURCHASES: Record<string, Purchase> = {
  "debt-validation-letter": {
    name: CHECKOUT_NAMES["debt-validation-letter"],
    summary: ONE_TEMPLATE,
    downloads: letterDownloads(
      "debt-validation-letter",
      "Debt-Validation-Letter",
      "Debt Validation Letter",
    ),
  },
  "credit-report-dispute-letter": {
    name: CHECKOUT_NAMES["credit-report-dispute-letter"],
    summary: ONE_TEMPLATE,
    downloads: letterDownloads(
      "credit-report-dispute-letter",
      "Credit-Report-Dispute-Letter",
      "Credit Report Dispute Letter",
    ),
  },
  "independent-contractor-agreement": {
    name: CHECKOUT_NAMES["independent-contractor-agreement"],
    summary: ONE_TEMPLATE,
    downloads: letterDownloads(
      "independent-contractor-agreement",
      "Independent-Contractor-Agreement",
      "Independent Contractor Agreement",
    ),
  },
  "non-disclosure-agreement": {
    name: CHECKOUT_NAMES["non-disclosure-agreement"],
    summary: ONE_TEMPLATE,
    downloads: letterDownloads(
      "non-disclosure-agreement",
      "Non-Disclosure-Agreement",
      "Non-Disclosure Agreement",
    ),
  },
  "consumer-letters-bundle": {
    name: CHECKOUT_NAMES["consumer-letters-bundle"],
    summary:
      "Two blank templates, four files: an editable DOCX and a print-ready PDF for each letter.",
    downloads: [
      ...letterDownloads(
        "debt-validation-letter",
        "Debt-Validation-Letter",
        "Debt Validation Letter",
      ),
      ...letterDownloads(
        "credit-report-dispute-letter",
        "Credit-Report-Dispute-Letter",
        "Credit Report Dispute Letter",
      ),
    ],
  },
};

/**
 * Stripe Checkout Session ids look like `cs_test_a1B2c3…` / `cs_live_a1B2c3…`:
 * the prefix, then an unbroken run of characters. Real ids run roughly 50-70
 * characters after the prefix; the bounds below are deliberately loose at both
 * ends so a genuine id is never rejected, while `cs_live_`, `cs_live_x` and a
 * 4,000-character string are.
 */
const SESSION_ID_RE = /^cs_(live|test)_[A-Za-z0-9]{16,120}$/;

/** True when the value could be a Stripe Checkout Session id. Says nothing
 *  about whether that session exists or was paid — see the file header. */
export function isPlausibleSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_RE.test(value);
}

export interface PurchaseResult {
  /** True only when both the item and a plausible session id were supplied. */
  ok: boolean;
  /** Present only when ok. */
  purchase?: Purchase;
  /** Why the request was refused. Never carries a file path. */
  reason?: "unknown-item" | "missing-session";
}

/** Resolve one /thank-you request. Never throws, never leaks a path on failure. */
export const getPurchase = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const input = (data ?? {}) as { item?: unknown; sessionId?: unknown };
    return {
      item: typeof input.item === "string" ? input.item : "",
      sessionId: typeof input.sessionId === "string" ? input.sessionId : "",
    };
  })
  .handler(async ({ data }): Promise<PurchaseResult> => {
    if (!isCheckoutSlug(data.item)) {
      return { ok: false, reason: "unknown-item" };
    }
    if (!isPlausibleSessionId(data.sessionId)) {
      return { ok: false, reason: "missing-session" };
    }
    const purchase = PURCHASES[data.item];
    if (!purchase) return { ok: false, reason: "unknown-item" };
    return { ok: true, purchase };
  });
