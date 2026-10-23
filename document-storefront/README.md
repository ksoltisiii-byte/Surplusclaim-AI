# Document Storefront — Lane B (Draft)

Working-draft storefront for the lane (B) model: **blank, self-serve legal-document
templates sold as one-time digital downloads.** This is a copy draft for lead review
— NOT part of the live site, nothing here is published, and nothing is for sale yet.

## Products (owner-confirmed pricing)

| Product | Price | Statute |
|---|---|---|
| Debt Validation Letter | $19.99 one-time | FDCPA, 15 U.S.C. §1692g(b) |
| Credit Report Dispute Letter | $19.99 one-time | FCRA, 15 U.S.C. §1681i |
| Bundle (both letters) | $29.99 one-time | — |

Homepage frames the bundle as "$39.98 separately → $29.99 bundle ($9.99 saved)."
Only these two products exist. The foreclosure-surplus form is out of scope.

## Files

- `index.html` — homepage: honest framing, product cards, bundle offer, what-this-is /
  what-this-is-not, FAQ. Checkout flow intentionally absent (listings are Etsy/Gumroad).
- `debt-validation-letter.html` — product page 1: blank template (verbatim, per lead),
  honest usage notes, "what this does / does NOT do".
- `credit-report-dispute-letter.html` — product page 2: same structure as page 1.
- `terms.html` — terms & disclaimer draft. Owner/attorney decisions still needed
  (marked `[to be confirmed]`): refund policy, governing-law clause, contact info.
- `assets/style.css` — shared static stylesheet. No frameworks, no CDNs, no JS.

## Compliance posture (hard rules applied)

The legality of the whole lane rests on wording. Every page carries, verbatim or
near-verbatim, this global disclaimer block:

1. "SurplusClaim AI is not a law firm and does not provide legal advice."
2. "These are blank, self-serve templates. We do not advise which document to use,
   complete documents for you, or guarantee any outcome."
3. "No credit repair services are offered. These documents do not erase, reduce, or
   eliminate any debt."
4. "For your specific situation, consult a licensed attorney."

Enforced boundaries:
- **No advice, no selector, no questionnaire, no form-completion help, no
  customization.** The templates are shown as plain text blocks; the user fills the
  blanks themselves. There is deliberately NO interactive form that assembles a
  letter for the buyer.
- **No credit-repair framing.** Copy never says "fix/repair/clean your credit,"
  never promises removal/erasure, never uses "guaranteed." FAQ answers state plainly
  that outcomes depend on the recipient and are not guaranteed.
- **No fabricated claims.** No testimonials, no "as featured in," no attorney-review
  claims, no affiliation with any court or agency. The statutes cited are real and
  the explanations are accurate, conservative summaries.
- **Statute accuracy:** §1692g(b) dispute pauses collection until verification;
  §1681i reinvestigation is generally within 30 days and the agency corrects/deletes
  unverifiable items — stated as what the law provides, never as a promised result.

## Note: owner's .docx attachments

The owner emailed three .docx files (10/22) — "Letter 1 - The Dispute Letter",
"Letter 2 - Secured Debt Dispute Letter", "Letter 3 - Full File Disclosure Request
to CRA". The mail tool exposes attachment metadata only; the files never reach the
filesystem, so their text could not be read into this draft. This draft's templates
are built from the lead-provided copy and the statutes themselves. If the owner's
exact letter text is meant to be the product, the text must be pasted into chat/email
body — attachments are unreadable on our side.

## Review

Open the HTML files directly in a browser — no server required. All pages are static.
DRAFT banner on every page must be removed/turned into real "not legal advice" copy
at launch, and the `[to be confirmed]` items on `terms.html` need decisions.