import { Link, createFileRoute } from "@tanstack/react-router";
import { ComplianceNotice, PRODUCTS, SiteFooter, SiteHeader } from "~/components/storefront";
import { EmailSignup } from "~/components/EmailSignup";
import { BUNDLE_PRICE, REGULAR_PRICE } from "~/data/pricing";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Blank Legal Document Templates — SurplusClaimAI" },
      {
        name: "description",
        content:
          "Blank, fill-in-yourself templates: independent contractor agreement, NDA, debt validation letter, and credit report dispute letter. Not a law firm.",
      },
    ],
  }),
});

const CONTRACT_PRODUCTS = PRODUCTS.filter(
  (p) => p.slug === "independent-contractor-agreement" || p.slug === "non-disclosure-agreement",
);
const LETTER_PRODUCTS = PRODUCTS.filter(
  (p) => p.slug === "debt-validation-letter" || p.slug === "credit-report-dispute-letter",
);

// Cover thumbnail: 800x1000 /products/<slug>/card.png, downscaled from the
// 1600x2000 01-cover.png so five cards stay small on the wire. Same 4:5 ratio as
// the source, so object-fit:cover shows the whole cover without cropping.
function ProductCard({ slug, name, tagline, blurb, path, price, priceNote, eager }: { slug: string; name: string; tagline: string; blurb: string; path: string; price: string; priceNote?: string; eager?: boolean }) {
  return (
    <div className="sf-card" key={slug}>
      <img
        className="sf-card-cover"
        src={`/products/${slug}/card.png`}
        alt={`Cover of the ${name} template`}
        width={800}
        height={1000}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
      <h2>{name}</h2>
      <div className="sf-statute">{tagline}</div>
      <p>{blurb}</p>
      <div className="sf-price-row">
        <span className="sf-price">{price}</span>
        <span className="sf-price-label">one-time download</span>
      </div>
      {priceNote && <p className="sf-price-note">{priceNote}</p>}
      <Link className="sf-cta" to={path}>
        View template
      </Link>
    </div>
  );
}

function Home() {
  return (
    <div className="sf-root">
      <SiteHeader active="/" />
      <ComplianceNotice />
      <main className="sf-main">
        <div className="sf-wrap">
          <section className="sf-page-head">
            <h1>Blank legal-document templates you fill in yourself</h1>
            <p className="sf-lede">
              Blank, fill-in-yourself templates for everyday business and consumer
              matters. You read the product page, decide for yourself whether a
              template fits, fill in the blanks, and handle the rest yourself. We
              sell documents — that is all.
            </p>
          </section>

          <section className="sf-block">
            <h2>Agreements</h2>
            <div className="sf-grid2">
              {CONTRACT_PRODUCTS.map((p, i) => (
                <ProductCard key={p.slug} {...p} eager={i === 0} />
              ))}
            </div>
          </section>

          <section className="sf-block">
            <h2>Consumer letters</h2>
            <div className="sf-grid2">
              {LETTER_PRODUCTS.map((p) => (
                <ProductCard key={p.slug} {...p} />
              ))}
            </div>

            {/* Two blank templates sold together — a file count, not a service.
                Links to the bundle's own page (/consumer-letters-bundle); the
                buy button lives there, so a visitor stays on the site. */}
            <div className="sf-card sf-bundle">
              <img
                className="sf-card-cover"
                src="/bundle/card.png"
                alt="Cover image for the two blank templates: the Debt Validation Letter and the Credit Report Dispute Letter"
                width={800}
                height={1000}
                loading="lazy"
                decoding="async"
              />
              <div className="sf-bundle-body">
                <h2>
                  Debt Validation Letter + Credit Report Dispute Letter — 2 Blank
                  Fill-In Templates
                </h2>
                <div className="sf-statute">Two blank letter templates, sold together</div>
                <p>
                  The Debt Validation Letter and the Credit Report Dispute Letter as
                  two separate blank, fill-in-yourself templates in one purchase. You
                  fill in and send each one yourself. Not legal advice; not a credit
                  repair service.
                </p>
                <div className="sf-price-row">
                  <span className="sf-price">{BUNDLE_PRICE}</span>
                  <span className="sf-price-label">
                    one-time download · both templates ({REGULAR_PRICE} each on their own)
                  </span>
                </div>
                <Link className="sf-cta" to="/consumer-letters-bundle">
                  View the two templates
                </Link>
              </div>
            </div>
          </section>

          <section className="sf-block">
            <h2>What this is</h2>
            <div className="sf-two-col">
              <div>
                <h3>Blank templates</h3>
                <p>
                  We sell blank, self-serve documents. You decide whether a
                  template fits your situation, fill it in yourself, and use it.
                </p>
              </div>
              <div>
                <h3>Your choice, your call</h3>
                <p>
                  We do not advise which document to use, whether to send a
                  letter, or what to write beyond the blanks. We do not complete
                  documents for you.
                </p>
              </div>
              <div>
                <h3>Your existing rights</h3>
                <p>
                  The two letters correspond to rights under federal law — the
                  Fair Debt Collection Practices Act (15 U.S.C. §1692g) and the
                  Fair Credit Reporting Act (15 U.S.C. §1681i). The templates do
                  not create new rights and do not promise any result.
                </p>
              </div>
              <div>
                <h3>One-time purchase</h3>
                <p>
                  Each template is a one-time digital download. No subscription.
                </p>
              </div>
            </div>
          </section>

          <section className="sf-block">
            <h2>What this is not</h2>
            <div className="sf-two-col">
              <div>
                <h3>Not a law firm</h3>
                <p>
                  SurplusClaimAI is not a law firm and does not provide legal
                  advice. No attorney-client relationship is formed by viewing or
                  buying any template.
                </p>
              </div>
              <div>
                <h3>Not legal advice</h3>
                <p>
                  We do not tell you which document to use, whether to send a
                  letter, or what to write beyond the blanks. We do not complete
                  documents for you.
                </p>
              </div>
              <div>
                <h3>Not credit repair</h3>
                <p>
                  No credit repair services are offered. These documents do not
                  erase, reduce, or eliminate any debt, and they do not "fix" or
                  "repair" your credit. Outcomes depend on the other party's
                  response and are never guaranteed.
                </p>
              </div>
              <div>
                <h3>Not a substitute for an attorney</h3>
                <p>For your specific situation, consult a licensed attorney.</p>
              </div>
            </div>
          </section>

          <section className="sf-block sf-faq">
            <h2>Frequently asked questions</h2>
            <details>
              <summary>Is SurplusClaimAI a law firm?</summary>
              <p>
                No. SurplusClaimAI is not a law firm and does not provide legal
                advice. We sell blank document templates.
              </p>
            </details>
            <details>
              <summary>Which document should I use?</summary>
              <p>
                We do not advise which document to use. Each product page
                describes what its template is for, and the letter pages name the
                federal law they reference. If you are unsure whether a template
                fits your situation — or whether to send anything at all —
                consult a licensed attorney.
              </p>
            </details>
            <details>
              <summary>Will these letters remove the item or erase the debt?</summary>
              <p>
                No — and we make no such promise. The letters ask the recipient
                to take a step the law requires them to consider: validate a
                disputed debt, or investigate a disputed item on a credit report.
                Whether anything changes depends entirely on the recipient's
                response and your individual situation. No outcome is guaranteed.
              </p>
            </details>
            <details>
              <summary>Will you help me fill the template in?</summary>
              <p>
                No. These are blank, self-serve templates. We do not complete
                documents for you or provide guidance about what to write in the
                blanks. If you need help, consult a licensed attorney.
              </p>
            </details>
            <details>
              <summary>Why do the letters reference federal statutes?</summary>
              <p>
                The Debt Validation Letter cites 15 U.S.C. §1692g (Fair Debt
                Collection Practices Act); the Credit Report Dispute Letter cites
                15 U.S.C. §1681i (Fair Credit Reporting Act). Citing the statute
                tells the recipient which law your request is being made under.
                Both letters include a bracketed note you can use to delete the
                statute sentence if you prefer a letter with no statute reference
                at all. The templates do not create or guarantee any right or
                outcome.
              </p>
            </details>
            <details>
              <summary>How do I receive the template?</summary>
              <p>
                As a one-time digital download after purchase. Payment is taken on
                Stripe's own checkout page, and Stripe then brings you back to a
                page on this site with your download links — the DOCX and the PDF.
                Nothing is shipped, and nothing is emailed, so download the files
                (or keep the link) when the page appears.
              </p>
            </details>
          </section>

          <EmailSignup />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}