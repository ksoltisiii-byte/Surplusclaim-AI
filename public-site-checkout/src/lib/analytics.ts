/**
 * Google Analytics 4 — the measurement id, read on the server.
 *
 * The owner supplies the id in the environment variable GA_MEASUREMENT_ID
 * (Settings → Secrets / environment variables). Nothing is hard-coded here, and
 * the value is read per request with `process.env`, so switching analytics on is
 * an environment change, not a code change and not a rebuild.
 *
 * WHEN THE VARIABLE IS UNSET (which is how it ships), this returns
 * `{ measurementId: null }`. The root layout then renders no <script> tag at all
 * — no gtag.js request, no dataLayer, no console output. The site behaves
 * exactly as it did before analytics existed.
 *
 * The value is shape-checked (`G-` followed by 4-20 letters/digits) before it is
 * handed to the page, because it is interpolated into a script tag. A typo in
 * the variable therefore switches analytics off rather than emitting broken
 * JavaScript or an injected script.
 */
import { createServerFn } from "@tanstack/react-start";

export const GA_ENV_VAR = "GA_MEASUREMENT_ID";

/** GA4 measurement ids: "G-" plus an alphanumeric run. */
const MEASUREMENT_ID_RE = /^G-[A-Z0-9]{4,20}$/;

export interface AnalyticsConfig {
  /** The validated measurement id, or null when analytics is off. */
  measurementId: string | null;
}

export const getAnalyticsConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnalyticsConfig> => {
    const raw = process.env.GA_MEASUREMENT_ID;
    if (typeof raw !== "string") return { measurementId: null };
    const id = raw.trim().toUpperCase();
    if (!MEASUREMENT_ID_RE.test(id)) return { measurementId: null };
    return { measurementId: id };
  },
);
