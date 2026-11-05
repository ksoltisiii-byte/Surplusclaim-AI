/**
 * Google Analytics 4, wired for a single-page app.
 *
 * Two pieces, both rendered by the root layout (~/routes/__root):
 *
 *   <AnalyticsScripts>    the gtag.js loader + the `gtag('config', …)` call. It
 *                         is only ever rendered when the server reported a
 *                         valid GA_MEASUREMENT_ID, so when analytics is off
 *                         there is no script tag and no network request at all.
 *   <AnalyticsPageViews>  nothing but an effect. A plain gtag snippet fires one
 *                         page_view for the page it was loaded on; because this
 *                         is a TanStack Start SPA, every later route change
 *                         would otherwise go unrecorded. This subscribes to the
 *                         router's `onResolved` event and sends one page_view
 *                         per real location change (same-URL re-resolutions are
 *                         ignored, so a reload of the current page is not
 *                         double-counted).
 */
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** The loader + initial config call. Rendered in <head>, server-rendered. */
export function AnalyticsScripts({ measurementId }: { measurementId: string }) {
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <script
        // The id is validated on the server against /^G-[A-Z0-9]{4,20}$/ before
        // it reaches this template, and is JSON-encoded again here, so it cannot
        // break out of the string.
        dangerouslySetInnerHTML={{
          __html:
            "window.dataLayer=window.dataLayer||[];" +
            "function gtag(){window.dataLayer.push(arguments);}" +
            "window.gtag=gtag;" +
            "gtag('js',new Date());" +
            `gtag('config',${JSON.stringify(measurementId)});`,
        }}
      />
    </>
  );
}

/** Sends a page_view on every client-side route change. Renders nothing. */
export function AnalyticsPageViews({ measurementId }: { measurementId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // The initial page_view comes from gtag('config', …) above; this only
    // reports the pages reached afterwards by navigating.
    let lastHref = window.location.href;
    const unsubscribe = router.subscribe("onResolved", () => {
      const href = window.location.href;
      if (href === lastHref) return;
      lastHref = href;
      if (typeof window.gtag !== "function") return;
      window.gtag("event", "page_view", {
        page_location: href,
        page_title: document.title,
        send_to: measurementId,
      });
    });
    return unsubscribe;
  }, [router, measurementId]);

  return null;
}
