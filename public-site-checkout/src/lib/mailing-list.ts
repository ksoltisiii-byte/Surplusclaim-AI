/**
 * Mailing-list signup — server side.
 *
 * The site does not own a mailing list. The owner will open an account with some
 * provider and paste that provider's endpoint into the environment variable
 * MAILING_LIST_ENDPOINT (Settings → Secrets / environment variables on the
 * platform). This file is the only place that variable is read.
 *
 * WHY IT IS BUILT THIS WAY
 *   - If MAILING_LIST_ENDPOINT is unset (or is not an http(s) URL) the form is
 *     not rendered at all, and the POST handler refuses. There is deliberately
 *     no "swallow the address and pretend" path: an address typed into a form
 *     that goes nowhere is a lie told to the visitor.
 *   - The browser posts to this server function, never to the provider. The
 *     provider URL stays on the server, and the request is same-origin, so no
 *     CORS setup is needed on the provider side.
 *   - The variable is read per request (process.env), so turning the form on is
 *     an environment change, not a code change.
 *
 * WHAT THE PROVIDER ENDPOINT MUST ACCEPT (this is the contract):
 *   Method : POST
 *   Headers: Content-Type: application/json
 *   Body   : {"email": "buyer@example.com", "source": "surplusclaimai.com"}
 *   Success: any 2xx status. Anything else is reported to the visitor as a
 *            failure — the address is never reported as saved unless the
 *            provider said so.
 *   Auth   : if the provider needs a key, put it in the URL itself (e.g. a
 *            formspree/mailchimp/buttondown style endpoint with a token in the
 *            path or query). This code sends no auth headers, so it must not
 *            need them.
 */
import { createServerFn } from "@tanstack/react-start";

export const MAILING_LIST_ENV_VAR = "MAILING_LIST_ENDPOINT";

/** The configured endpoint, or undefined when the list is not set up yet. */
function mailingListEndpoint(): string | undefined {
  const raw = process.env.MAILING_LIST_ENDPOINT;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed;
}

export interface MailingListStatus {
  /** True only when a usable endpoint is configured. */
  enabled: boolean;
}

/** GET — tells the page whether to render the form at all. */
export const getMailingListStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<MailingListStatus> => {
    return { enabled: mailingListEndpoint() !== undefined };
  },
);

export interface SubscribeResult {
  ok: boolean;
  /** Human-readable line for the visitor. Never claims a save that did not happen. */
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** POST — forwards one address to the configured provider. */
export const subscribeToMailingList = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const input = (data ?? {}) as { email?: unknown };
    return { email: typeof input.email === "string" ? input.email.trim() : "" };
  })
  .handler(async ({ data }): Promise<SubscribeResult> => {
    const endpoint = mailingListEndpoint();
    if (!endpoint) {
      // Not set up. Say so plainly rather than accepting the address.
      return { ok: false, message: "Sign-up is not available yet." };
    }
    if (!EMAIL_RE.test(data.email) || data.email.length > 254) {
      return { ok: false, message: "That does not look like an email address." };
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          source: "surplusclaimai.com",
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return {
          ok: false,
          message: "We could not save that address. Please try again later.",
        };
      }
      return { ok: true, message: "You are on the list." };
    } catch {
      return {
        ok: false,
        message: "We could not save that address. Please try again later.",
      };
    }
  });
