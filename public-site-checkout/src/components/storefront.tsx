import { Link } from "@tanstack/react-router";
import { BUNDLE_PRICE, priceFor, priceNoteFor, REGULAR_PRICE } from "../data/pricing";
import { buyLabel, checkoutUrl } from "../data/checkout";

/* ============================================================================
   Storefront shared components + product data (lane B).
   All product copy is taken verbatim from the owner-approved listing files:
   /home/team/shared/templates/{listing-copy,nda-listing-copy,dvl-listing-copy,
   crdl-listing-copy}.md — do not factually drift from those files.
   Preview images are the approved listing previews, served from /public/products/
   (copied from /home/team/shared/templates/*-listing-images/).
   ========================================================================== */

export interface Product {
  slug: string;
  path: string;
  name: string;
  price: string; // current listed price
  priceNote?: string; // optional introductory/launch price note
  tagline: string; // statute/format line shown under the title
  blurb: string; // homepage card blurb
  describe: string[]; // "What this template is" paragraphs
  coversIntro: string;
  covers: { n: number; title: string; desc: string }[];
  whoFor: string[]; // "Who it is for"
  howItWorks: string[];
  pleaseRead: string[]; // "Please read before you buy"
  consumerLetter: boolean; // true for DVL + CRDL (adds credit-repair line)
  guidePath: string; // plain-English guide page for this product
  metaTitle: string;
  metaDescription: string;
}

export const DELIVERY = "One-time digital download — nothing physical is shipped.";

/** Approved listing preview images (01-cover … 06-please-read). */
export const PREVIEW_IMAGES = [
  "01-cover",
  "02-look-inside",
  "03-whats-included",
  "04-sections",
  "05-how-it-works",
  "06-please-read",
];

export const PRODUCTS: Product[] = [
  {
    slug: "independent-contractor-agreement",
    path: "/independent-contractor-agreement",
    name: "Independent Contractor Agreement",
    price: priceFor("independent-contractor-agreement"),
    priceNote: priceNoteFor("independent-contractor-agreement"),
    tagline: "Blank agreement template · Freelance & small-business contract",
    blurb:
      "A fill-in-the-blank agreement between a client and an independent contractor, freelancer, consultant, or creative professional. Sixteen numbered sections cover scope, payment, taxes, confidentiality, intellectual property, termination, and more.",
    describe: [
      "This is a blank, fill-in-the-blank Independent Contractor Agreement template. You fill in the blanks yourself. It is a form for you to complete — not a finished document, not a personalized agreement, and not legal advice.",
      "Every blank appears in bold inside a shaded block, like [CLIENT NAME] or [RATE OR AMOUNT], so it is easy to see where your information goes. Optional sections are marked [OPTIONAL] — delete any you do not want before signing. Where a clause offers a choice, the options sit in brackets separated by \u201cor\u201d; pick one and delete the other.",
    ],
    coversIntro: "The agreement has 16 numbered sections:",
    covers: [
      { n: 1, title: "The Parties", desc: "names, addresses, and effective date for both sides" },
      { n: 2, title: "Services", desc: "where you describe the work and any deliverables" },
      { n: 3, title: "Term", desc: "" },
      { n: 4, title: "Compensation", desc: "rate or amount, payment schedule, invoicing terms, days to pay, payment method" },
      { n: 5, title: "Independent Contractor Status", desc: "" },
      { n: 6, title: "Taxes", desc: "including an information-return line that applies only if required by law" },
      { n: 7, title: "Expenses", desc: "two options to choose between" },
      { n: 8, title: "Confidentiality", desc: "optional" },
      { n: 9, title: "Intellectual Property and Work Product", desc: "two options: assign the work to the client, or the contractor keeps ownership and licenses it" },
      { n: 10, title: "Insurance", desc: "optional" },
      { n: 11, title: "Non-Solicitation and Non-Competition", desc: "optional, and marked as sensitive because how these clauses are treated varies from state to state" },
      { n: 12, title: "Termination", desc: "options, notice periods, and what happens to payment and materials at the end" },
      { n: 13, title: "Governing Law", desc: "" },
      { n: 14, title: "General", desc: "entire agreement, amendments, assignment, severability, no waiver, counterparts and electronic signatures" },
      { n: 15, title: "Notices", desc: "addresses and emails for both sides" },
      { n: 16, title: "Signatures", desc: "sign-off blocks for both parties" },
    ],
    whoFor: [
      "Freelancers, independent contractors, consultants, and creative professionals — and the clients, studios, and small businesses that hire them. Both sides are named in the document, so it can be filled in from either point of view.",
    ],
    howItWorks: [
      "Download the files.",
      "Open the DOCX in your word processor, or open the PDF to print.",
      "Fill in each bracketed blank. Optional sections are marked [OPTIONAL] — delete any you do not want before signing.",
      "Where a clause offers a choice, the options sit in brackets separated by \u201cor\u201d. Pick one and delete the other.",
      "Read the finished document start to finish before signing, and keep a copy for each party.",
    ],
    pleaseRead: [
      "This is a blank template, not legal advice. It is a form. It does not tell you what to choose or what applies to your situation.",
      "SurplusClaimAI is not a law firm. We are not lawyers, and we do not provide legal services of any kind.",
      "No attorney-client relationship is created by buying, downloading, or using this template.",
      "Not a substitute for a licensed attorney in your state. Laws differ from state to state and change over time.",
      "No outcome is guaranteed. We make no promise about any result from using this template.",
      "Not personalized, and not a service. We do not fill the form in for you, we do not review your finished document, and we do not tell you which options to pick.",
      "Laws vary by state. Worker classification, taxes, non-solicitation, and non-competition are treated differently from state to state and under federal law. This template does not tell you which rules apply to you.",
    ],
    consumerLetter: false,
    guidePath: "/do-i-need-an-independent-contractor-agreement",
    metaTitle: "Independent Contractor Agreement Template — Blank Fill-In",
    metaDescription:
      "Blank Independent Contractor Agreement template in DOCX and PDF: 16 numbered sections with bracketed blanks you fill in yourself. Not legal advice.",
  },
  {
    slug: "non-disclosure-agreement",
    path: "/non-disclosure-agreement",
    name: "Non-Disclosure Agreement",
    price: priceFor("non-disclosure-agreement"),
    priceNote: priceNoteFor("non-disclosure-agreement"),
    tagline: "Blank agreement template · One-way or mutual",
    blurb:
      "A fill-in-the-blank confidentiality agreement with the one-way and mutual versions in one document. Section 10 offers Option A (one-way) or Option B (mutual) — you keep the one you want and delete the other. Fifteen numbered sections.",
    describe: [
      "This is a fill-in-the-blank Non-Disclosure Agreement template. You fill in the blanks yourself. It is a form to complete — not a finished document, not a personalized agreement, and not legal advice.",
      "Every blank appears in bold inside a shaded block, like [DISCLOSING PARTY NAME] or [EFFECTIVE DATE], so it is easy to see where your information goes.",
      "The template includes both versions of the NDA and you choose which one to use. Section 10 sets out two options side by side: Option A — one-way (one party discloses confidential information and the other party receives it), or Option B — mutual (each party may disclose to the other and each may receive). You read Section 10, keep the option you want, and delete the other. Because both options are in the same file, you do not have to buy the one-way version and the mutual version separately.",
    ],
    coversIntro: "The agreement has 15 numbered sections:",
    covers: [
      { n: 1, title: "The Parties", desc: "names, addresses, effective date" },
      { n: 2, title: "Purpose", desc: "describe what the information is being shared for" },
      { n: 3, title: "Definition of Confidential Information", desc: "what counts as covered, plus an optional marking requirement" },
      { n: 4, title: "Exclusions from Confidential Information", desc: "four standard exclusions, plus room to add another" },
      { n: 5, title: "Obligations of the Receiving Party", desc: "how the information must be handled, and who it may be shared with" },
      { n: 6, title: "Permitted Disclosures Required by Law", desc: "notice, cooperation, and limiting what is disclosed" },
      { n: 7, title: "Duration", desc: "how many years the obligations run and from which date, plus optional trade-secret and survival wording" },
      { n: 8, title: "Return or Destruction of Materials", desc: "including optional certification and retention language" },
      { n: 9, title: "No License and No Warranty", desc: "ownership stays with the disclosing party, and the information is provided \u201cas is\u201d" },
      { n: 10, title: "One-Way or Mutual", desc: "Option A (one-way) and Option B (mutual), choose one" },
      { n: 11, title: "Remedies", desc: "optional, with a prompt to describe what the parties want and an optional limitation" },
      { n: 12, title: "Governing Law", desc: "the state the parties choose, plus optional venue or dispute-resolution wording" },
      { n: 13, title: "General", desc: "entire agreement, amendments, severability, no waiver, and optional assignment and counterparts wording" },
      { n: 14, title: "Notices", desc: "addresses and emails" },
      { n: 15, title: "Signatures", desc: "sign-off blocks for both parties" },
    ],
    whoFor: [
      "Small businesses, freelancers, consultants, founders, and anyone who needs to put a confidentiality arrangement on paper before sharing information with another person or company. Both parties are named in the document.",
    ],
    howItWorks: [
      "Download the files.",
      "Read Section 10 and decide whether you are using the one-way option or the mutual option.",
      "Open the DOCX in your word processor, or open the PDF to print.",
      "Fill in each bracketed blank. Optional sections are marked [OPTIONAL] — delete any you do not want before signing.",
      "Read the finished document start to finish before signing, and keep a copy for each party.",
    ],
    pleaseRead: [
      "This is a blank template, not legal advice. It is a form. It does not tell you what to choose or what applies to your situation.",
      "SurplusClaimAI is not a law firm. We are not lawyers, and we do not provide legal services of any kind.",
      "No attorney-client relationship is created by buying, downloading, or using this template.",
      "Not a substitute for a licensed attorney in your state. Laws differ from state to state and change over time.",
      "No outcome is guaranteed. We make no promise about any result from using this template.",
      "Not personalized, and not a service. We do not fill the form in for you, we do not review your finished document, and we do not tell you which option to pick.",
      "Laws vary by state. Rules about confidentiality and trade secrets are treated differently from state to state and under federal law. This template does not tell you which rules apply to you.",
    ],
    consumerLetter: false,
    guidePath: "/do-i-need-a-non-disclosure-agreement",
    metaTitle: "Non-Disclosure Agreement Template — One-Way or Mutual",
    metaDescription:
      "Blank Non-Disclosure Agreement template in DOCX and PDF: one-way and mutual versions in one document, 15 sections you fill in yourself. Not legal advice.",
  },
  {
    slug: "debt-validation-letter",
    path: "/debt-validation-letter",
    name: "Debt Validation Letter",
    price: priceFor("debt-validation-letter"),
    tagline: "Blank letter template · FDCPA, 15 U.S.C. \u00a71692g",
    blurb:
      "A letter you address to a debt collector, stating that you dispute the debt and asking the collector to verify it in writing. Ten numbered sections. A bracketed note lets you delete the statute citation if you prefer a letter with no statute reference at all.",
    describe: [
      "This is a blank, fill-in-the-blank Debt Validation Letter template. You fill in the blanks yourself, and you send the letter yourself. It is a form for you to complete — not a finished letter, not a personalized letter, and not legal advice.",
      "It is a letter you address to a debt collector. In it you state that you dispute the debt and ask the collector to verify it in writing. Section 5 cites the federal Fair Debt Collection Practices Act, 15 U.S.C. \u00a7 1692g, and asks for verification. The template includes a bracketed note you can use to delete that statute sentence if you prefer a letter with no statute reference at all.",
      "This is a form, not a service. We do not send anything for you, we do not contact any collector for you, and we do not tell you what to write in the blanks.",
    ],
    coversIntro: "The letter has 10 numbered sections:",
    covers: [
      { n: 1, title: "Your Information", desc: "your name, street address, and optional email and phone" },
      { n: 2, title: "The Debt Collector", desc: "the company name and mailing address" },
      { n: 3, title: "Date and Reference", desc: "the date you send it, the name on the account, and the collector's account or reference number" },
      { n: 4, title: "Statement of Dispute", desc: "Option A: dispute the debt in full, or Option B: dispute part of it and describe which part" },
      { n: 5, title: "Request for Verification", desc: "the request itself, citing the federal statute, with an optional note to remove that citation" },
      { n: 6, title: "What I Am Asking You to Provide", desc: "the items you are asking the collector to send you" },
      { n: 7, title: "Request to Pause Collection Activity", desc: "a request, written into the letter, that collection activity pause while verification is provided" },
      { n: 8, title: "Response Period", desc: "a blank where you enter a number of days for the reply" },
      { n: 9, title: "Enclosures", desc: "optional, for anything you are sending with the letter" },
      { n: 10, title: "Closing and Signature", desc: "a single signature block (this is a letter from one sender, not a two-party agreement)" },
    ],
    whoFor: [],
    howItWorks: [
      "Download the files.",
      "Open the DOCX in your word processor, or open the PDF to print.",
      "Fill in each bracketed blank. Optional sections are marked [OPTIONAL] — if you do not want one, delete the whole section before you send it.",
      "In Section 4, keep the option you want and delete the other.",
      "Read the finished letter start to finish before you send it, and keep a copy of what you sent.",
    ],
    pleaseRead: [
      "This is a blank template, not legal advice. It is a form. It does not tell you what to choose, what to write, or what applies to your situation.",
      "SurplusClaimAI is not a law firm. We are not lawyers, and we do not provide legal services of any kind.",
      "Buying, downloading, or using this template does not create an attorney-client relationship.",
      "This template is not a substitute for a licensed attorney in your state. Laws differ from state to state and change over time.",
      "No outcome is guaranteed. We make no promise about any result from using this template. We do not guarantee that a collector will respond, will stop contacting you, will provide any documents, or that any debt or credit record will be removed, corrected, reduced, or resolved.",
      "We do not provide credit repair services, and we do not act on your behalf with any debt collector, creditor, or credit reporting agency.",
      "It is not personalized and it is not a service. We do not fill the letter in for you and we do not review your finished letter.",
      "Rules about debt collection, consumer rights, and credit reporting vary by state and under federal law. This template does not tell you which rules apply to you.",
    ],
    consumerLetter: true,
    guidePath: "/what-is-a-debt-validation-letter",
    metaTitle: "Debt Validation Letter Template — Blank, Fill In Yourself",
    metaDescription:
      "Blank Debt Validation Letter template in DOCX and PDF: 10 sections to fill in and send yourself. Not legal advice; not a credit repair service.",
  },
  {
    slug: "credit-report-dispute-letter",
    path: "/credit-report-dispute-letter",
    name: "Credit Report Dispute Letter",
    price: priceFor("credit-report-dispute-letter"),
    tagline: "Blank letter template · FCRA, 15 U.S.C. \u00a71681i",
    blurb:
      "A letter you address to a credit reporting agency, identifying an item on your credit report that you believe is inaccurate or incomplete and asking the bureau to reinvestigate it. Ten numbered sections. A bracketed note lets you delete the statute citation if you prefer.",
    describe: [
      "This is a blank, fill-in-the-blank Credit Report Dispute Letter template. You fill in the blanks yourself, and you send the letter yourself. It is a form for you to complete — not a finished letter, not a personalized letter, and not legal advice.",
      "It is a letter you address to a credit reporting agency (a credit bureau). In it you identify an item that appears in your credit file, describe what you believe is inaccurate or incomplete, and ask the bureau to reinvestigate the item. Section 6 cites the federal Fair Credit Reporting Act, section 611, 15 U.S.C. \u00a7 1681i, and carries the reinvestigation request. The template includes a bracketed note you can use to delete that statute sentence if you prefer a letter with no statute reference at all.",
      "This is a form, not a service. We do not send anything for you, we do not contact any bureau, creditor, or furnisher for you, and we do not tell you what to write in the blanks.",
    ],
    coversIntro: "The letter has 10 numbered sections:",
    covers: [
      { n: 1, title: "Your Information", desc: "your name and street address, plus optional date of birth, Social Security number, email, and phone (marked [OPTIONAL]; whether to include them is your decision)" },
      { n: 2, title: "The Credit Reporting Agency (the Credit Bureau)", desc: "the bureau's name and mailing address. The three nationwide agencies, Equifax, Experian, and TransUnion, are named inside that blank as a factual example; which one you write to, and how many, is your decision, and nothing in the template recommends one" },
      { n: 3, title: "Date and Reference", desc: "the date you send it, and optionally your file number and the date of the report you are disputing" },
      { n: 4, title: "The Item I Am Disputing", desc: "the creditor or company name and account number exactly as they appear on your report" },
      { n: 5, title: "Statement of Dispute", desc: "Option A: the information is inaccurate, Option B: it is incomplete, Option C: the item is not mine, Option D: other. Each option ends in a blank where you describe it in your own words" },
      { n: 6, title: "Request for Reinvestigation", desc: "the request itself, citing the federal statute, with an optional note to remove that citation" },
      { n: 7, title: "What I Ask You to Do", desc: "your request, written into the letter, plus a request that the bureau send you written notice of the results" },
      { n: 8, title: "Supporting Documents", desc: "optional, for anything you are enclosing" },
      { n: 9, title: "Response Period", desc: "a blank where you enter a number of days for the reply" },
      { n: 10, title: "Closing and Signature", desc: "a single signature block (this is a letter from one sender, not a two-party agreement)" },
    ],
    whoFor: [],
    howItWorks: [
      "Download the files.",
      "Open the DOCX in your word processor, or open the PDF to print.",
      "Fill in each bracketed blank. Optional sections are marked [OPTIONAL] — if you do not want one, delete the whole section before you send it.",
      "In Section 5, keep the option that applies and delete the others.",
      "Read the finished letter start to finish before you send it, and keep a copy of what you sent.",
    ],
    pleaseRead: [
      "This is a blank template, not legal advice. It is a form. It does not tell you what to choose, what to write, or what applies to your situation.",
      "SurplusClaimAI is not a law firm. We are not lawyers, and we do not provide legal services of any kind.",
      "Buying, downloading, or using this template does not create an attorney-client relationship.",
      "This template is not a substitute for a licensed attorney in your state. Laws differ from state to state and change over time.",
      "No outcome is guaranteed. We make no promise about any result from using this template. We do not guarantee that a bureau will respond, will reinvestigate, will provide any particular document, or that any item will be removed, corrected, changed, or reported differently, or that any credit score or credit report will change.",
      "We do not provide credit repair services, and we do not act on your behalf with any credit bureau, creditor, furnisher, or debt collector.",
      "It is not personalized and it is not a service. We do not fill the letter in for you and we do not review your finished letter.",
      "Rules about credit reporting, disputes, and consumer rights vary by state and under federal law. This template does not tell you which rules apply to you.",
    ],
    consumerLetter: true,
    guidePath: "/how-do-i-dispute-a-credit-report-error",
    metaTitle: "Credit Report Dispute Letter Template — Blank Fill-In",
    metaDescription:
      "Blank Credit Report Dispute Letter template in DOCX and PDF: 10 sections to fill in and mail yourself. Not legal advice; not a credit repair service.",
  },
];

export const NAV_ITEMS: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "Independent Contractor Agreement", to: "/independent-contractor-agreement" },
  { label: "Non-Disclosure Agreement", to: "/non-disclosure-agreement" },
  { label: "Debt Validation Letter", to: "/debt-validation-letter" },
  { label: "Credit Report Dispute Letter", to: "/credit-report-dispute-letter" },
  { label: "Terms & Disclaimer", to: "/terms" },
];

/**
 * Plain-English guide pages. Linked from each product page and from the
 * footer "Guides" block — deliberately NOT in the top nav.
 */
export const GUIDE_LINKS: { label: string; to: string }[] = [
  {
    label: "Do I need an independent contractor agreement?",
    to: "/do-i-need-an-independent-contractor-agreement",
  },
  {
    label: "Do I need a non-disclosure agreement?",
    to: "/do-i-need-a-non-disclosure-agreement",
  },
  {
    label: "What is a debt validation letter?",
    to: "/what-is-a-debt-validation-letter",
  },
  {
    label: "How do I dispute a credit report error?",
    to: "/how-do-i-dispute-a-credit-report-error",
  },
  {
    label: "A debt collector contacted you?",
    to: "/debt-collector-contacted-you",
  },
];

/* Mandatory four-line compliance notice — present on every storefront page. */
export function ComplianceNotice() {
  return (
    <div className="sf-wrap">
      <div className="sf-notice">
        <h4>Important — please read</h4>
        <p>SurplusClaimAI is not a law firm and does not provide legal advice.</p>
        <p>
          These are blank, self-serve templates. We do not advise which document
          to use, complete documents for you, or guarantee any outcome.
        </p>
        <p>
          No credit repair services are offered. These documents do not erase,
          reduce, or eliminate any debt.
        </p>
        <p>For your specific situation, consult a licensed attorney.</p>
      </div>
    </div>
  );
}

export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="sf-header">
      <div className="sf-header-inner">
        <Link to="/" className="sf-brand">
          SurplusClaimAI <small>Self-Serve Document Templates</small>
        </Link>
        <nav className="sf-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={active === item.to ? "sf-active" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

/**
 * Every page footer carries the lane-B posture verbatim.
 * The two consumer letters additionally carry the credit-repair distance line.
 */
export function SiteFooter({ consumerLetter = false }: { consumerLetter?: boolean }) {
  return (
    <footer className="sf-footer">
      <div className="sf-wrap">
        <p>
          Blank template, not legal advice · Not a law firm · No
          attorney-client relationship · Not a substitute for a licensed
          attorney · Laws vary by state · No outcome is guaranteed.
        </p>
        {consumerLetter && (
          <p>
            <strong>Credit repair:</strong> We do not provide credit repair
            services and we do not act on your behalf with any credit bureau,
            creditor, furnisher, or debt collector.
          </p>
        )}
        <div className="sf-footer-guides">
          <h4>Guides</h4>
          <ul>
            {GUIDE_LINKS.map((guide) => (
              <li key={guide.to}>
                <Link to={guide.to}>{guide.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="sf-fine">
          © SurplusClaimAI · <Link to="/terms">Terms &amp; disclaimer</Link> ·{" "}
          <Link to="/">Home</Link>
        </p>
      </div>
    </footer>
  );
}

/* Shared layout for the four product pages. */
export function ProductPage({ product }: { product: Product }) {
  return (
    <div className="sf-root">
      <SiteHeader active={product.path} />
      <ComplianceNotice />
      <main className="sf-main">
        <div className="sf-wrap">
          <section className="sf-page-head">
            <h1>{product.name}</h1>
            <div className="sf-statute">{product.tagline}</div>
            <p className="sf-lede">
              Blank fill-in template · {product.price}, {DELIVERY.toLowerCase()}
              {product.priceNote && (
                <span className="sf-price-note"> {product.priceNote}</span>
              )}
            </p>
            <p className="sf-guide-link">
              Not sure if this is the right document?{" "}
              <Link to={product.guidePath}>Read our plain-English guide</Link>.
            </p>
          </section>

          <section className="sf-block">
            <h2>Preview</h2>
            <p className="sf-gallery-note">
              What you receive: editable DOCX + print-ready PDF. The previews
              below show the blank template and how it is laid out.
            </p>
            <div className="sf-gallery">
              {PREVIEW_IMAGES.map((img) => (
                <img
                  key={img}
                  src={`/products/${product.slug}/${img}.png`}
                  alt={`${product.name} template preview — ${img.replace(/-/g, " ")}`}
                  loading="lazy"
                />
              ))}
            </div>
          </section>

          <section className="sf-block">
            <h2>What this template is</h2>
            {product.describe.map((para, i) => (
              <p key={i} style={{ marginBottom: "0.6rem" }}>{para}</p>
            ))}
          </section>

          <section className="sf-block">
            <h2>What you get</h2>
            <ul>
              <li>
                An editable DOCX — open it in Microsoft Word, Google Docs, Pages,
                or LibreOffice and type into the bracketed blanks.
              </li>
              <li>
                A print-ready PDF, US Letter, with the same blanks to fill in by
                hand.
              </li>
              <li>
                Every blank appears in bold inside a shaded block, so it is easy
                to see where your information goes.
              </li>
              <li>Instant download after purchase. Nothing physical is shipped.</li>
            </ul>
          </section>

          <section className="sf-block">
            <h2>What it covers</h2>
            <p>{product.coversIntro}</p>
            <ol className="sf-section-list">
              {product.covers.map((c) => (
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
              It also includes a one-page "How to use this template" cover and a
              full disclaimer at the end.
            </p>
          </section>

          {product.whoFor.length > 0 && (
            <section className="sf-block">
              <h2>Who it is for</h2>
              {product.whoFor.map((para, i) => (
                <p key={i} style={{ marginBottom: "0.6rem" }}>{para}</p>
              ))}
            </section>
          )}

          <section className="sf-block">
            <h2>How it works</h2>
            <ol>
              {product.howItWorks.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="sf-block">
            <h2>Please read before you buy</h2>
            <ul>
              {product.pleaseRead.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="sf-block">
            <h2>Digital download &amp; refunds</h2>
            <p>
              Digital files only — nothing physical is shipped. You will need a
              PDF reader for the PDF, and a word processor such as Microsoft Word,
              Google Docs, Pages, or LibreOffice for the DOCX.
            </p>
            <p>
              Because this is an instant digital download and the files are
              delivered immediately after purchase, all sales are final. No
              refunds are offered.
            </p>
            <p style={{ marginTop: "0.6rem" }}>
              Questions about what is inside the files are welcome before you buy.
            </p>
          </section>

          <section className="sf-buy-note">
            <h3>Buy</h3>
            <p>
              {product.name} — {product.price}, one-time digital download. Payment
              is taken by Stripe on Stripe's own secure checkout page. All sales are
              final; no refunds.
            </p>
            {product.priceNote && (
              <p className="sf-price-note">{product.priceNote}</p>
            )}
            {product.consumerLetter && (
              <p className="sf-bundle-link">
                Both templates together:{" "}
                <Link to="/consumer-letters-bundle">
                  the Debt Validation Letter + Credit Report Dispute Letter, sold
                  as two separate blank templates for {BUNDLE_PRICE} (they are{" "}
                  {REGULAR_PRICE} each alone).
                </Link>
              </p>
            )}
            <div className="sf-buy-row">
              <a
                className="sf-cta"
                href={checkoutUrl(product.slug)}
                rel="noopener noreferrer"
              >
                {buyLabel(product.slug)}
              </a>
            </div>
            <p className="sf-fine">
              After payment Stripe brings you back to this site, to a page with the
              download links for your DOCX and PDF files.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter consumerLetter={product.consumerLetter} />
    </div>
  );
}