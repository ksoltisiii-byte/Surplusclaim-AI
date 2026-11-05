/**
 * /thank-you — where Stripe sends the buyer after a successful payment.
 *
 * The payment links are configured to redirect to
 * /thank-you?item=<slug>, with <slug> one of the five keys in ~/data/checkout.
 * This page reads that slug and renders the download links for exactly that
 * item. An unknown or missing slug renders a plain fallback — never a crash, and
 * never a list of every product's files (that would hand the paid files to
 * anyone who typed this address).
 *
 * WHAT THIS PAGE DOES NOT SAY
 *   Nothing here is emailed. The site has no email automation of any kind, so
 *   the only truthful thing to tell the buyer is that the files are on this
 *   page, and to download them now or keep the link.
 *
 * Search engines are told to stay away (noindex) — the download links should not
 * end up in an index.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { CHECKOUT_ITEMS, checkoutItem } from "~/data/checkout";
import {
  ComplianceNotice,
  SiteFooter,
  SiteHeader,
} from "~/components/storefront";
import { EmailSignup } from "~/components/EmailSignup";
import { BUSINESS } from "~/data/business";

export const Route = createFileRoute("/thank-you")({
  validateSearch: (search: Record<string, unknown>) => ({
    item: typeof search.item === "string" ? search.item : undefined,
  }),
  component: ThankYou,
  head: () => ({
    meta: [
      { title: "Your download links — SurplusClaimAI" },
      {
        name: "description",
        content:
          "Download links for the SurplusClaimAI template you purchased. Not legal advice.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function ThankYou() {
  const search = Route.useSearch();
  const purchase = checkoutItem(search?.item);

  return (
    <div className="sf-root">
      <SiteHeader />
      <ComplianceNotice />
      <main className="sf-main">
        <div className="sf-wrap">
          {purchase ? (
            <>
              <section className="sf-page-head">
                <h1>Thank you — here are your files</h1>
                <p className="sf-lede">
                  {purchase.name}. {purchase.summary} Download them below. Nothing
                  is shipped, and no files are emailed to you — this page is where
                  you get them, so keep the files (or bookmark this page).
                </p>
              </section>

              <section className="sf-block">
                <h2>Download</h2>
                <ul className="sf-downloads">
                  {purchase.downloads.map((file) => (
                    <li key={file.href}>
                      <a
                        className="sf-cta sf-download"
                        href={file.href}
                        download
                      >
                        Download {file.format}
                      </a>{" "}
                      <span className="sf-download-label">{file.label}</span>
                    </li>
                  ))}
                </ul>
                <p className="sf-fine">
                  Save the file, then open it in a PDF reader (for the PDF) or a
                  word processor such as Microsoft Word, Google Docs, Pages, or
                  LibreOffice (for the DOCX). Every blank you fill in appears in
                  bold inside a shaded block.
                </p>
              </section>

              <section className="sf-block">
                <h2>Not legal advice</h2>
                <p>
                  This is a blank template, not legal advice, and not a substitute
                  for a licensed attorney in your state. SurplusClaimAI is not a law
                  firm, no attorney-client relationship is created by this purchase,
                  and no outcome is guaranteed.
                </p>
              </section>
            </>
          ) : (
            <section className="sf-page-head">
              <h1>We could not match that order</h1>
              <p className="sf-lede">
                This page shows download links for one purchase, and the address
                that brought you here did not name one of our five products. If you
                just paid, the link from the payment page should have included the
                item — open it again from that page, or call us on{" "}
                <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a> and we will sort
                it out.
              </p>
              <p className="sf-guide-link">
                Everything we sell is listed on the{" "}
                <Link to="/">home page</Link>.
              </p>
            </section>
          )}

          {!purchase && (
            <section className="sf-block">
              <h2>The five products</h2>
              <ul>
                {CHECKOUT_ITEMS.map((item) => (
                  <li key={item.slug}>
                    <Link to={item.slug === "consumer-letters-bundle" ? "/consumer-letters-bundle" : `/${item.slug}`}>
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <EmailSignup />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
