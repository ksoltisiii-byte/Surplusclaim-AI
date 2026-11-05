import { createFileRoute } from "@tanstack/react-router";
import { GuideCta, GuideNotice, GuidePage } from "~/components/guides";
import { priceFor } from "~/data/pricing";

export const Route = createFileRoute("/what-is-a-debt-validation-letter")({
  component: Guide,
  head: () => ({
    meta: [
      { title: "Debt Validation Letter: What It Is and What It Does" },
      {
        name: "description",
        content:
          "What a debt validation letter is, the federal right it refers to, when people commonly write one — and what the letter itself does not do.",
      },
    ],
  }),
});

function Guide() {
  return (
    <GuidePage>
      <div className="sf-guide">
        <section className="sf-page-head">
          <h1>What is a debt validation letter?</h1>
        </section>

        <GuideNotice>
          <strong>This page is general information, not legal advice.</strong>{" "}
          SurplusClaimAI is not a law firm, and reading this page does not create
          an attorney-client relationship. Nothing here tells you what applies to
          your situation.
        </GuideNotice>

        <section className="sf-block">
          <h2>What a debt validation letter is</h2>
          <p>
            A debt validation letter is a written letter from one person to a debt
            collector. In it, the person states that they dispute the debt and asks
            the collector to verify it in writing — to show what the debt is, who
            it is owed to, and how the amount was arrived at. It is written by the
            consumer and addressed to the collector: not a court filing, not a
            government form, and no agency publishes an official version of it.
          </p>
        </section>

        <section className="sf-block">
          <h2>The right behind the letter comes from federal law</h2>
          <p>
            The ability to ask a collector to verify a debt comes from a federal
            statute: the Fair Debt Collection Practices Act, 15 U.S.C. § 1692g,
            which deals with validation of debts. As federal law, it applies across
            the country rather than varying by state.
          </p>
          <p>
            The right itself costs nothing to use. A person can write a letter of
            this kind by hand if they choose to — the law requires no particular
            form, format, or purchased document, and nothing about the underlying
            right is for sale.
          </p>
          <p>
            What our product is, and is not: the template is a{" "}
            <strong>formatted, fill-in-the-blank version</strong> of such a letter.
            The price buys the file — the layout, the numbered sections, the blanks,
            the editable DOCX and the print-ready PDF — not the right, and not a
            service. We do not send anything for anyone, we do not contact any
            collector, and we do not act on anyone's behalf.
          </p>
        </section>

        <section className="sf-block">
          <h2>When people commonly use one</h2>
          <p>People write letters of this kind in a handful of ordinary situations:</p>
          <ul>
            <li>A collection notice arrives about an account the person does not recognize.</li>
            <li>A letter arrives about a debt the person believes was already paid.</li>
            <li>The amount stated does not match what the person remembers owing.</li>
            <li>
              A person wants the collector's own written account of the debt, in one
              place, rather than over the phone.
            </li>
          </ul>
          <p>People often write rather than call because a letter leaves a record they can keep.</p>
        </section>

        <section className="sf-block">
          <h2>What a typical one covers</h2>
          <p>
            Letters of this kind follow the same rough shape. They identify the
            sender and the collector; give the date and any account or reference
            number; state what is being disputed; ask for verification; say what the
            sender is asking the collector to provide; and close with a signature.
          </p>
          <p>
            The SurplusClaimAI template has ten numbered sections covering that
            ground. Section 4 offers two options — dispute the debt in full, or
            dispute part of it — and the buyer keeps one and deletes the other.
            Section 5 carries the request for verification and cites the federal
            provision, with a bracketed note that lets the buyer remove that
            citation. Section 7 contains a <strong>request</strong> that collection
            activity pause while verification is provided — a request the sender
            makes, not a statement about what the collector is required to do.
            Section 8 leaves the number of days for a reply blank.
          </p>
        </section>

        <section className="sf-block">
          <h2>What it does not do</h2>
          <p>
            A debt validation letter is a written request for information. It is not
            a substitute for understanding your own situation, and several things
            people assume a letter like this does, it does not.
          </p>
          <ul>
            <li>
              <strong>It does not resolve a debt.</strong> The letter asks for
              verification. It does not pay, settle, cancel, or forgive anything,
              and it does not change what a person owes.
            </li>
            <li>
              <strong>
                It does not change what appears in a credit report, or any credit
                score.
              </strong>{" "}
              It is not a credit-report dispute, and it does nothing to a credit
              file.
            </li>
            <li>
              <strong>
                It does not make a collector respond, send documents, or handle the
                account any particular way.
              </strong>{" "}
              A letter is a request, and the reply — if there is one — is not on a
              timetable the form sets.
            </li>
            <li>
              <strong>It does not assert a deadline.</strong> Section 8 leaves the
              number of days blank, and this page states no time limit.
            </li>
            <li>
              <strong>It does not replace a lawyer's read of your facts.</strong>{" "}
              Collection questions can turn on details a blank letter cannot see.
            </li>
            <li>
              <strong>It does not promise any result.</strong> Sending a letter does
              not mean a collector answers, that the account changes, or that
              anything about a person's finances turns out differently.
            </li>
          </ul>
        </section>

        <section className="sf-block">
          <h2>Deciding is your call</h2>
          <p>
            Whether to write to a collector — and what to put in the letter —
            depends on the debt, the collector, your state, and what you are trying
            to find out. Only you can weigh that. Some people write a short letter,
            some a longer one, and some handle it another way entirely. None of that
            is unusual, and this page does not pick for you.
          </p>
          <p>
            If you want help deciding what fits your situation, that is a
            conversation for a licensed attorney in your state. We do not provide
            that help, and this page is not a stand-in for it.
          </p>
        </section>

        <section className="sf-block">
          <h2>If you want a form to fill in</h2>
          <p>
            The Debt Validation Letter template in our store is a{" "}
            <strong>blank fill-in form</strong>: a one-time download (editable DOCX
            plus a print-ready PDF, four pages, ten numbered sections), and you fill
            in the blanks yourself and send it yourself. It is not personalized, we
            do not complete, review, or send it for you, we do not contact any
            collector or creditor on your behalf, and it is not legal advice. It is
            {priceFor("debt-validation-letter")}.
          </p>
          <GuideCta to="/debt-validation-letter" label="Debt Validation Letter template" />
        </section>
      </div>
    </GuidePage>
  );
}
