import { Link, createFileRoute } from "@tanstack/react-router";
import { buyLabel, checkoutUrl } from "~/data/checkout";
import { BUNDLE_PRICE, REGULAR_PRICE } from "~/data/pricing";
import {
  ComplianceNotice,
  DELIVERY,
  PRODUCTS,
  SiteFooter,
  SiteHeader,
} from "~/components/storefront";

/* ============================================================================
   /consumer-letters-bundle — the Debt Validation Letter + Credit Report
   Dispute Letter sold together as two separate blank templates.

   Lane B, product by product: two blank forms in one purchase, never one
   service, never a "kit"/"package"/"program". Every factual line traces to
   /home/team/shared/templates/bundle-copy.md (the approved bundle copy) or to
   the per-product data in ~/components/storefront.tsx. The section lists are
   read from PRODUCTS.covers — they are never retyped here.

   The disclosure block is copied byte for byte from
   /home/team/shared/templates/_build/bundle_disclosure_plural.txt
   (approved, machine-verified in the bundle listing copy under
   /home/team/shared/templates/). Do not edit it in place: if it changes,
   re-copy the file.
   ========================================================================== */

const dvl = PRODUCTS.find((p) => p.slug === "debt-validation-letter")!;
const crdl = PRODUCTS.find((p) => p.slug === "credit-report-dispute-letter")!;

/* The two documents, each described in the one line the approved copy uses for
   it, plus that letter's own file names. Order is fixed: validation first. */
const LETTERS = [
  {
    product: dvl,
    docx: "Debt-Validation-Letter-Template.docx",
    pdf: "Debt-Validation-Letter-Template.pdf",
    purpose:
      "Blank letter to a debt collector asking it to verify the debt (FDCPA \u00a7 1692g).",
  },
  {
    product: crdl,
    docx: "Credit-Report-Dispute-Letter-Template.docx",
    pdf: "Credit-Report-Dispute-Letter-Template.pdf",
    purpose:
      "Blank letter to a credit bureau asking it to reinvestigate an item (FCRA \u00a7 611).",
  },
];

/* Verbatim from templates/_build/bundle_disclosure_plural.txt — 42/42 verified.
   Lines are rendered one paragraph each so the bytes survive to the page. */
const BUNDLE_DISCLOSURE = `PLEASE READ BEFORE YOU BUY
• These are blank templates, not legal advice. They are forms. They do not tell you what to choose, what to write, or what applies to your situation.
• SurplusClaimAI is not a law firm. We are not lawyers, and we do not provide legal services of any kind.
• Buying, downloading, or using these templates does not create an attorney-client relationship.
• These templates are not a substitute for a licensed attorney in your state. Laws differ from state to state and change over time.
• No outcome is guaranteed. We make no promise about any result from using these templates. We do not guarantee that a collector will respond, will stop contacting you, will provide any documents, or that any debt or credit record will be removed, corrected, reduced, or resolved.
• We do not provide credit repair services, and we do not act on your behalf with any debt collector, creditor, or credit reporting agency.
• They are not personalized and they are not a service. We do not fill the letters in for you and we do not review your finished letters.
• Rules about debt collection, consumer rights, and credit reporting vary by state and under federal law. These templates do not tell you which rules apply to you.

DIGITAL DOWNLOAD
This is a digital download. No physical item will be shipped. You will need a PDF reader to open the PDFs, and a word processor such as Microsoft Word, Google Docs, Pages, or LibreOffice to use the DOCX files.

REFUNDS
Because this is an instant digital download and the files are delivered immediately after purchase, all sales are final. No refunds are offered.

Questions about what is inside the files are welcome before you buy.`;


export const Route = createFileRoute("/consumer-letters-bundle")({
  component: BundlePage,
  head: () => ({
    meta: [
      { title: "Blank Debt Validation Letter + Credit Report Dispute Letter" },
      {
        name: "description",
        content:
          "Two blank Debt Validation Letter and Credit Report Dispute Letter templates you fill in and send yourself. Not legal advice; not a credit repair service.",
      },
    ],
  }),
});

function BundlePage() {
  return (
    <div className="sf-root">
      <SiteHeader active="/consumer-letters-bundle" />
      <ComplianceNotice />
      <main className="sf-main">
        <div className="sf-wrap">
          <section className="sf-page-head">
            <h1>
              Debt Validation Letter + Credit Report Dispute Letter — 2 Blank
              Fill-In Templates
            </h1>
            <div className="sf-statute">
              Two blank letter templates, sold together · DOCX + PDF
            </div>
            <p className="sf-lede">
              Two blank, fill-in-yourself letter templates, {BUNDLE_PRICE} together
              (they are {REGULAR_PRICE} each alone). You fill in and send each one yourself; we
              do not contact any collector or bureau. Blank templates, not legal
              advice. Not a credit repair service.
            </p>
            <p className="sf-lede">{DELIVERY}</p>
          </section>

          <section className="sf-block">
            <h2>Preview</h2>
            <div className="sf-bundle-cover">
              <img
                src="/bundle/consumer-letters-bundle-cover.png"
                alt="Cover image for the two blank templates: the Debt Validation Letter and the Credit Report Dispute Letter"
                width={1600}
                height={2000}
              />
            </div>
          </section>

          <section className="sf-block">
            <h2>What you get</h2>
            <p>
              Four files in one purchase — an editable DOCX and a print-ready PDF
              for each of the two letters:
            </p>
            <ul>
              {LETTERS.map((letter) => (
                <li key={letter.product.slug}>
                  <strong>{letter.product.name}</strong> —{" "}
                  <code>{letter.docx}</code> and <code>{letter.pdf}</code>
                </li>
              ))}
            </ul>
            <ul>
              <li>
                Both PDFs are US Letter, laid out to print at that size.
              </li>
              <li>
                Every blank is bracketed and bold inside a shaded block, like
                [YOUR NAME] or [ACCOUNT NUMBER], so it is easy to see where your
                information goes.
              </li>
              <li>
                Instant download after purchase. Nothing physical is shipped.
              </li>
            </ul>
          </section>

          {LETTERS.map((letter) => (
            <section className="sf-block" key={letter.product.slug}>
              <h2>{letter.product.name}</h2>
              <p>{letter.purpose}</p>
              <p>{letter.product.coversIntro}</p>
              <ol className="sf-section-list">
                {letter.product.covers.map((c) => (
                  <li key={c.n}>
                    <strong>
                      {c.n}. {c.title}
                      {c.desc ? " —" : ""}
                    </strong>{" "}
                    {c.desc}
                  </li>
                ))}
              </ol>
              <p>
                This one is a blank form. You fill it in yourself, and you send
                it yourself.
              </p>
            </section>
          ))}

          <section className="sf-block">
            <h2>How it works</h2>
            <ol>
              <li>Download the files.</li>
              <li>
                Open the DOCX in your word processor, or open the PDF to print.
              </li>
              <li>
                Fill in each bracketed blank. Optional sections are marked
                [OPTIONAL] — if you do not want one, delete the whole section
                before you send the letter.
              </li>
              <li>
                You send it yourself. We do not contact any collector or bureau,
                and we do not review your finished letter.
              </li>
            </ol>
          </section>

          <section className="sf-block">
            <h2>Price</h2>
            <div className="sf-price-row">
              <span className="sf-price">{BUNDLE_PRICE}</span>
              <span className="sf-price-label">
                one-time download · both templates
              </span>
            </div>
            <p>
              {BUNDLE_PRICE} for the two templates together. They are {REGULAR_PRICE}
              each on their own. This is the regular price for the pair, and it has no
              end date.
            </p>
          </section>

          <section className="sf-block sf-disclosure">
            <h2>Before you buy</h2>
            {BUNDLE_DISCLOSURE.split("\n").map((line, i) => {
              /* A blank line in the approved file stays a blank line here, so the
                 block's text survives the page unchanged — not just word for word. */
              if (line.trim() === "")
                return <p key={i} className="sf-disc-gap" aria-hidden="true" />;
              const isHead = /^[A-Z][A-Z ]+$/.test(line.trim());
              const isBullet = line.startsWith("•");
              return (
                <p
                  key={i}
                  className={
                    isHead
                      ? "sf-disc-head"
                      : isBullet
                        ? "sf-disc-bullet"
                        : "sf-disc-line"
                  }
                >
                  {line}
                </p>
              );
            })}
          </section>

          <section className="sf-buy-note">
            <h3>Buy</h3>
            <p>
              Debt Validation Letter + Credit Report Dispute Letter — {BUNDLE_PRICE},
              one-time digital download. Payment is taken by Stripe on Stripe's own
              secure checkout page. All sales are final; no refunds.
            </p>
            <div className="sf-buy-row">
              <a
                className="sf-cta"
                href={checkoutUrl("consumer-letters-bundle")}
                rel="noopener noreferrer"
              >
                {buyLabel("consumer-letters-bundle")}
              </a>
            </div>
            <p className="sf-fine">
              After payment Stripe brings you back to this site, to a page with the
              download links for all four files — a DOCX and a PDF for each letter.
            </p>
          </section>

          <section className="sf-block">
            <h2>The two templates on their own</h2>
            <p>Each letter is also sold separately, as its own blank template:</p>
            <ul>
              {LETTERS.map((letter) => (
                <li key={letter.product.slug}>
                  <Link to={letter.product.path}>{letter.product.name}</Link> —{" "}
                  {letter.purpose} {letter.product.price}.
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter consumerLetter />
    </div>
  );
}
