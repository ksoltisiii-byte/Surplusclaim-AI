import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "~/styles/app.css?url";
import { AnalyticsPageViews, AnalyticsScripts } from "~/components/Analytics";
import { getAnalyticsConfig } from "~/lib/analytics";
export const Route = createRootRoute({
  // Read GA_MEASUREMENT_ID on the server once per session. `staleTime: Infinity`
  // keeps the root loader from re-running on every navigation; the id is an
  // environment value, not data that changes while someone browses.
  loader: () => getAnalyticsConfig(),
  staleTime: Infinity,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title:
          "SurplusClaimAI — Self-Serve Legal Document Templates",
      },
      {
        name: "description",
        content:
          "Blank, fill-in-yourself legal document templates from SurplusClaimAI: Independent Contractor Agreement, Non-Disclosure Agreement, Debt Validation Letter, and Credit Report Dispute Letter. One-time digital downloads. Not a law firm; not legal advice.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});
function RootComponent() {
  const { measurementId } = Route.useLoaderData();
  return (
    <RootDocument measurementId={measurementId}>
      <Outlet />
    </RootDocument>
  );
}
function RootDocument({
  children,
  measurementId,
}: {
  children: ReactNode;
  measurementId: string | null;
}) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Nothing at all when GA_MEASUREMENT_ID is unset or malformed. */}
        {measurementId ? <AnalyticsScripts measurementId={measurementId} /> : null}
      </head>
      <body>
        {children}
        {measurementId ? <AnalyticsPageViews measurementId={measurementId} /> : null}
        <Scripts />
      </body>
    </html>
  );
}
