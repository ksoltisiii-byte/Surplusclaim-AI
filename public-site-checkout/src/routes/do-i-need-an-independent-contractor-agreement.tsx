import { createFileRoute, Link } from "@tanstack/react-router";
import { GuideCta, GuideNotice, GuidePage } from "~/components/guides";
import { guidePriceSentence } from "~/data/pricing";

export const Route = createFileRoute("/do-i-need-an-independent-contractor-agreement")({
  component: Guide,
  head: () => ({
    meta: [
      { title: "Independent Contractor Agreement: When Do You Need One?" },
      {
        name: "description",
        content:
          "What an independent contractor agreement is, when freelancers and clients commonly use one, what it usually covers — and what it does not do.",
      },
    ],
  }),
});

function Guide() {
  return (
    <GuidePage>
      <div className="sf-guide">
        <section className="sf-page-head">
          <h1>Do I need an independent contractor agreement?</h1>
        </section>

        <GuideNotice>
          <strong>This page is general information, not legal advice.</strong>{" "}
          SurplusClaimAI is not a law firm, and reading this page does not create
          an attorney-client relationship. Nothing here tells you what applies to
          your situation.
        </GuideNotice>

        <section className="sf-block">
          <h2>What an independent contractor agreement is</h2>
          <p>
            An independent contractor agreement is a written document between two
            parties: one person or business doing work, and another person or
            business paying for it. It sets out the job in plain terms — what work
            is being done, what it costs, when it gets paid, and what each side is
            responsible for. It is a business document, not a government form, and
            there is no single official version of it.
          </p>
        </section>

        <section className="sf-block">
          <h2>When people commonly use one</h2>
          <p>
            Many freelancers and the clients who hire them put something in
            writing before work starts. Situations where people often do this
            include:
          </p>
          <ul>
            <li>
              A one-off project with a deadline — a website build, a logo, a
              written report, a photo shoot.
            </li>
            <li>
              Ongoing work billed hourly or monthly, where the terms carry over the
              same way from invoice to invoice.
            </li>
            <li>
              Work where the client will share confidential material, logins, or
              unreleased plans.
            </li>
            <li>
              Work that produces something the client wants to own or reuse — code,
              design files, copy, video.
            </li>
            <li>
              Jobs where expenses, travel, or equipment are part of the cost and
              both sides want those spelled out.
            </li>
            <li>
              Any arrangement where the two sides have not worked together before
              and want the basics written down rather than remembered.
            </li>
          </ul>
          <p>
            People often use one because a written record is easier to point to
            later than a conversation, and because writing the terms down tends to
            surface questions — like who owns the files — before the work is
            finished rather than after.
          </p>
        </section>

        <section className="sf-block">
          <h2>What a typical one covers</h2>
          <p>
            Most agreements of this kind follow the same rough shape. They name
            both parties and the effective date; describe the services and any
            deliverables; state a rate or project amount, a payment schedule, and
            how invoices are sent and paid; and set out the length of the
            arrangement and how either side can end it.
          </p>
          <p>
            Beyond that core, agreements commonly include clauses on taxes,
            expenses, confidentiality, who owns the finished work, insurance, and
            what happens to materials at the end. Some also include
            non-solicitation or non-competition language — those clauses are
            treated differently from state to state, and some places limit or
            restrict them. The SurplusClaimAI template has sixteen numbered
            sections covering this ground, with optional sections marked so you
            can delete the ones you do not want.
          </p>
        </section>

        <section className="sf-block">
          <h2>What it does not do</h2>
          <p>
            An independent contractor agreement is a record of what two people
            agreed to. It is not a substitute for understanding your own
            situation, and it does not do a few things people sometimes assume it
            does.
          </p>
          <ul>
            <li>
              <strong>
                It does not decide whether someone is an independent contractor or
                an employee.
              </strong>{" "}
              That question generally turns on the actual working relationship —
              how the work is directed, who sets the schedule, who supplies the
              tools, how payment is structured, and similar facts. Different
              agencies and courts apply different tests, and the rules vary by
              state. A signed agreement can record what the parties intended, but
              the paperwork alone does not settle the question.
            </li>
            <li>
              <strong>It does not cover every situation.</strong> A template is
              written for the ordinary case. Unusual work, regulated industries,
              and multi-party arrangements often raise issues a generic form does
              not address.
            </li>
            <li>
              <strong>It does not replace a lawyer's read of your facts.</strong>{" "}
              It also does not review itself, fill itself in, or check whether the
              terms you typed are the terms you meant.
            </li>
            <li>
              <strong>It does not promise any result.</strong> Having a signed
              document does not mean a payment arrives, a client behaves, or a
              disagreement goes a particular way.
            </li>
          </ul>
        </section>

        <section className="sf-block">
          <h2>Deciding is your call</h2>
          <p>
            Whether to put an agreement in writing — and what to put in it —
            depends on your work, your client, your state, and how much is at
            stake. Only you can weigh that. Some people handle straightforward,
            low-value jobs on a short written email; others use a full agreement
            for everything. Neither approach is unusual.
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
            The Independent Contractor Agreement template in our store is a{" "}
            <strong>blank fill-in form</strong>: a one-time download (editable DOCX
            plus a print-ready PDF), and you fill in the blanks yourself. It is not
            personalized, we do not complete or review it for you, and it is not
            legal advice. {guidePriceSentence("independent-contractor-agreement")}
          </p>
          <GuideCta
            to="/independent-contractor-agreement"
            label="Independent Contractor Agreement template"
          />
          <p>
            If you are on the other side of that arrangement — bringing someone in
            to help with the work rather than being hired yourself — our guide to{" "}
            <Link to="/do-i-need-a-contract-with-a-subcontractor">
              contracts with a subcontractor
            </Link>{" "}
            covers it from that side.
          </p>
        </section>
      </div>
    </GuidePage>
  );
}
