import { createFileRoute } from "@tanstack/react-router";
import { GuideCta, GuideNotice, GuidePage } from "~/components/guides";
import { priceFor } from "~/data/pricing";

export const Route = createFileRoute("/how-do-i-dispute-a-credit-report-error")({
  component: Guide,
  head: () => ({
    meta: [
      { title: "Credit Report Dispute Letter: How to Dispute an Error" },
      {
        name: "description",
        content:
          "What a credit report dispute letter is, which federal right it refers to, when people commonly write one, and what the letter cannot do on its own.",
      },
    ],
  }),
});

function Guide() {
  return (
    <GuidePage>
      <div className="sf-guide">
        <section className="sf-page-head">
          <h1>How do I dispute a credit report error?</h1>
        </section>

        <GuideNotice>
          <strong>This page is general information, not legal advice.</strong>{" "}
          SurplusClaimAI is not a law firm, and reading this page does not create
          an attorney-client relationship. Nothing here tells you what applies to
          your situation.
        </GuideNotice>

        <section className="sf-block">
          <h2>What a credit report dispute letter is</h2>
          <p>
            A credit report dispute letter is a written letter from one person to a
            credit reporting agency — a credit bureau. In it, the person identifies
            an item that appears in their credit file, describes in their own words
            why they believe it is inaccurate or incomplete, and asks the bureau to
            reinvestigate that item. It is written by the consumer and addressed to
            the bureau — not a court filing, and no agency publishes an official
            version of it.
          </p>
        </section>

        <section className="sf-block">
          <h2>The right behind the letter comes from federal law</h2>
          <p>
            The ability to dispute information in a credit file comes from a federal
            statute: the Fair Credit Reporting Act, section 611, 15 U.S.C. § 1681i,
            which addresses procedure in the case of disputed accuracy. As federal
            law, it applies nationwide rather than varying by state.
          </p>
          <p>
            The right itself costs nothing to use. A person can write a letter of
            this kind by hand — the law requires no particular form, format, or
            purchased document, and nothing about the underlying right is for sale.
          </p>
          <p>
            What our product is, and is not: the template is a{" "}
            <strong>formatted, fill-in-the-blank version</strong> of such a letter.
            The price buys the file — the layout, the numbered sections, the blanks,
            the editable DOCX and the print-ready PDF — not the right, and not a
            service. We do not send anything for anyone, and we do not act on
            anyone's behalf.
          </p>
        </section>

        <section className="sf-block">
          <h2>When people commonly use one</h2>
          <p>People write letters of this kind in a handful of ordinary situations:</p>
          <ul>
            <li>
              An item appears in a credit file that the person believes is
              inaccurate or incomplete.
            </li>
            <li>A person believes an account shown in their file is not theirs.</li>
            <li>
              A person has paperwork they believe shows an item reported differently
              from what happened.
            </li>
          </ul>
          <p>People often write rather than call because a letter leaves a record they can keep.</p>
        </section>

        <section className="sf-block">
          <h2>What a typical one covers</h2>
          <p>
            Letters of this kind follow the same rough shape. They identify the
            sender and the bureau; give the date and any file number; identify the
            item being disputed and its account number as shown on the report; state
            what is being disputed and ask for reinvestigation; and close with a
            signature.
          </p>
          <p>
            The SurplusClaimAI template has ten numbered sections covering that
            ground. Section 2 holds the bureau's name and mailing address, with the
            three nationwide agencies named inside that blank as an example. Section
            5 offers four neutral options — inaccurate, incomplete, not mine, other
            — each ending in a blank for the person's own words; the template does
            not pick one or suggest what grounds to give. Section 6 carries the
            request for reinvestigation and cites the federal provision, with a
            bracketed note that lets the buyer remove that citation. Section 7
            carries the sender's request, written into the letter. Section 9 leaves
            the number of days for a reply blank.
          </p>
        </section>

        <section className="sf-block">
          <h2>What it does not do</h2>
          <p>
            A credit report dispute letter is a written request that a bureau look
            at an item again. It is not a substitute for understanding your own
            situation, and several things people assume it does, it does not.
          </p>
          <ul>
            <li>
              <strong>
                It does not decide whether an item is accurate, and it does not
                change a credit report or a credit score.
              </strong>{" "}
              The letter asks for a reinvestigation; what the bureau concludes is
              not something the form controls.
            </li>
            <li>
              <strong>
                It does not make a bureau respond, reinvestigate, or send any
                particular document.
              </strong>{" "}
              A letter is a request, and the reply — if there is one — is not on a
              timetable the form sets.
            </li>
            <li>
              <strong>It does not assert a deadline.</strong> Section 9 leaves the
              number of days blank, and this page states no time limit.
            </li>
            <li>
              <strong>It does not tell you what to dispute or how to describe it.</strong>{" "}
              The four options are offered evenly, with blanks for the person's own
              words; nothing here picks one, ranks them, or supplies an example
              reason.
            </li>
            <li>
              <strong>It does not replace a lawyer's read of your facts.</strong> A
              dispute can turn on details a blank letter cannot see — what the item
              is, what records exist, and what has already been sent.
            </li>
            <li>
              <strong>It does not promise any result.</strong> Sending a letter does
              not mean a bureau answers, that an item is handled any particular way,
              or that anything about a person's file turns out differently.
            </li>
          </ul>
        </section>

        <section className="sf-block">
          <h2>Deciding is your call</h2>
          <p>
            Whether to write to a bureau — and what to put in the letter — depends
            on the item, your records, your state, and what you are trying to find
            out. Only you can weigh that. Some people write about one item, some
            about several, and some handle it another way. None of that is unusual,
            and this page does not pick for you.
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
            The Credit Report Dispute Letter template in our store is a{" "}
            <strong>blank fill-in form</strong>: a one-time download (editable DOCX
            plus a print-ready PDF, four pages, ten numbered sections), and you fill
            in the blanks yourself and send it yourself. It is not personalized, we
            do not complete, review, or send it for you, we do not contact any
            bureau, creditor, or furnisher on your behalf, and it is not legal
            advice. It is {priceFor("credit-report-dispute-letter")}.
          </p>
          <GuideCta
            to="/credit-report-dispute-letter"
            label="Credit Report Dispute Letter template"
          />
        </section>
      </div>
    </GuidePage>
  );
}
