import { createFileRoute } from "@tanstack/react-router";
import { GuideCta, GuideNotice, GuidePage } from "~/components/guides";
import { BUNDLE_PRICE, priceFor } from "~/data/pricing";

export const Route = createFileRoute("/debt-collector-contacted-you")({
  component: Guide,
  head: () => ({
    meta: [
      { title: "Debt Collector Contacted You? What a Validation Letter Is" },
      {
        name: "description",
        content:
          "A debt collector called or wrote. What a debt validation letter is, the federal right behind it, and what it does not do. Not for anyone already sued.",
      },
    ],
  }),
});

function Guide() {
  return (
    <GuidePage>
      <div className="sf-guide">
        <section className="sf-page-head">
          <h1>
            A debt collector contacted you — what is a debt validation letter, and
            what can it actually do?
          </h1>
        </section>

        <GuideNotice>
          <strong>This page is general information, not legal advice.</strong>{" "}
          SurplusClaimAI is not a law firm, and reading this page does not create
          an attorney-client relationship. Nothing here tells you what applies to
          your situation.
        </GuideNotice>

        <section className="sf-block">
          <h2>Where you are right now</h2>
          <p>
            A debt collector has been in touch — a call, a voicemail, or a letter.
            Maybe the company name is unfamiliar; maybe the amount is larger than
            you remember.
          </p>
          <p>
            This page explains one document: a debt validation letter, and what it
            does not do. It does not tell you what to do about the contact you
            received.
          </p>
        </section>

        <section className="sf-block">
          <h2>What a debt validation letter is</h2>
          <p>
            A debt validation letter is a written letter from one person to a
            collector. In it, the person states that they dispute the debt and asks
            the collector to verify it in writing — to show what the debt is, who it
            is owed to, and how the amount was arrived at.
          </p>
          <p>
            It is not a court filing, not a government form, and no agency publishes
            an official version.
          </p>
        </section>

        <section className="sf-block">
          <h2>The right behind the letter comes from federal law</h2>
          <p>
            The ability to ask a collector to verify a debt comes from a federal
            statute: the Fair Debt Collection Practices Act, 15 U.S.C. § 1692g, which
            deals with validation of debts and applies across the country.
          </p>
          <p>
            The right itself costs nothing to use. A person can write a letter of
            this kind by hand — the law requires no particular form or purchased
            document, and nothing about the right is for sale.
          </p>
          <p>
            Our template is a <strong>formatted, fill-in-the-blank version</strong> of
            that letter. The price buys the file — layout, sections, blanks, editable
            DOCX and print-ready PDF — not the right, and not a service. We do not
            send anything for anyone, we do not contact any collector, and we do not
            act on anyone's behalf.
          </p>
          <p>
            <strong>On timing.</strong> The law provides a limited window to make this
            request in writing, counted from when the collector's notice reaches you.
            That is how the statute works, not a countdown: this page states no number
            of days and no deadline. Whether a window is open for you is a question
            for a licensed attorney.
          </p>
        </section>

        <section className="sf-block">
          <h2>This letter is for collection contact, not for a lawsuit</h2>
          <p>
            Stated plainly, because it matters most:{" "}
            <strong>a debt validation letter is not a response to a lawsuit.</strong>
          </p>
          <p>
            If you have been served with court papers, given a court date, or told a
            suit has been filed, this is not your document. A lawsuit is answered in
            court, on the court's schedule; what that means for you is a question for
            a licensed attorney. We sell nothing for that, and this page does not
            cover it.
          </p>
          <p>
            The letter described here is for the stage before that: collection
            contact, by phone or by mail, with no suit on file.
          </p>
        </section>

        <section className="sf-block">
          <h2>What it does not do</h2>
          <p>
            This letter is a written request for information. Several things people
            assume it does, it does not.
          </p>
          <ul>
            <li>
              <strong>It does not resolve a debt.</strong> It does not pay, settle,
              cancel, or forgive anything, and it does not change what a person owes.
            </li>
            <li>
              <strong>It does not change a credit report or any credit score.</strong>{" "}
              It is not a credit-report dispute, and it does nothing to a credit file.
            </li>
            <li>
              <strong>
                It does not make a collector respond, send documents, or handle the
                account any particular way.
              </strong>{" "}
              A reply, if there is one, is not on a timetable the form sets.
            </li>
            <li>
              <strong>It does not make the contact stop.</strong> What a collector
              does with a written request is up to them.
            </li>
            <li>
              <strong>It does not require a collector to pause collection activity.</strong>{" "}
              Section 7 of the template is a request the sender makes, not a statement
              about what the collector is required to do.
            </li>
            <li>
              <strong>It does not answer a lawsuit.</strong> If a suit has been filed,
              this is the wrong document, and the answer belongs in court.
            </li>
            <li>
              <strong>It does not replace a lawyer's read of your facts</strong>, and
              it promises no result.
            </li>
          </ul>
        </section>

        <section className="sf-block">
          <h2>Deciding is your call</h2>
          <p>
            Whether to write to a collector — and what to put in the letter — depends
            on the debt, your state, and what you are trying to find out. This page
            does not pick for you.
          </p>
          <p>
            If you want help deciding what fits your situation, that is a conversation
            for a licensed attorney in your state. We do not provide that help, and
            this page is not a stand-in for it.
          </p>
        </section>

        <section className="sf-block">
          <h2>If you want a form to fill in</h2>
          <p>
            The Debt Validation Letter template is a{" "}
            <strong>blank fill-in form</strong>: a one-time download (editable DOCX
            plus print-ready PDF, four pages, ten numbered sections). You fill in the
            blanks and send it yourself. It is not personalized, we do not complete,
            review, or send it for you, we do not contact any collector or creditor on
            your behalf, and it is not legal advice. It is {priceFor("debt-validation-letter")}.
          </p>
          <GuideCta to="/debt-validation-letter" label="Debt Validation Letter template" />
          <p>
            If a credit report question is also in play, the Debt Validation Letter and
            the Credit Report Dispute Letter are sold together as{" "}
            <strong>two separate blank templates</strong> for {BUNDLE_PRICE} — product by
            product, each filled in and sent by the buyer, not a service and not advice.
          </p>
          <GuideCta to="/credit-report-dispute-letter" label="Both consumer letters" />
        </section>
      </div>
    </GuidePage>
  );
}
