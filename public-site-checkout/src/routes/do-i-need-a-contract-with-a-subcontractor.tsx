import { createFileRoute, Link } from "@tanstack/react-router";
import { GuideCta, GuideNotice, GuidePage } from "~/components/guides";
import { guidePriceSentence } from "~/data/pricing";

export const Route = createFileRoute("/do-i-need-a-contract-with-a-subcontractor")({
  component: Guide,
  head: () => ({
    meta: [
      { title: "Do You Need a Contract With a Subcontractor? Full Guide" },
      {
        name: "description",
        content:
          "When a freelancer needs a written agreement with a subcontractor, what it should cover, and the mistakes that cost people work. General information only.",
      },
    ],
  }),
});

function Guide() {
  return (
    <GuidePage>
      <div className="sf-guide">
        <section className="sf-page-head">
          <h1>Do I need a contract with a subcontractor?</h1>
        </section>

        <section className="sf-block">
          <p>
            You have started bringing other people onto your work. A designer is
            picking up overflow, an editor is cutting a client's video, a developer
            is building the part you ran out of hours for. Money is about to change
            hands, and someone else's work is about to go out under your name.
          </p>
        </section>

        <GuideNotice>
          <strong>This page is general information, not legal advice.</strong>{" "}
          SurplusClaim AI is not a law firm, and reading this page does not create
          an attorney-client relationship. Nothing here tells you what applies to
          your situation.
        </GuideNotice>

        <section className="sf-block">
          <h2>The short answer</h2>
          <p>
            There is no rule that every arrangement needs a signed document, and
            plenty of small jobs run on an email and an invoice with nothing going
            wrong. But once a subcontractor touches a client's material, produces
            work the client is paying for, or gets paid more than once, a written
            agreement earns its place — not because paperwork stops problems, but
            because it gives both of you something to check against when memory and
            goodwill run thin.
          </p>
          <p>
            The honest version: for a small job, finished in days, with someone you
            know and pay on delivery, a short written message can cover the same
            ground. For anything running weeks or months, involving client files, or
            worth more than you would cheerfully write off, people more often use a
            real agreement.
          </p>
        </section>

        <section className="sf-block">
          <h2>When you genuinely need one — and when you don't</h2>
          <p>Situations where freelancers commonly put terms in writing:</p>
          <ul>
            <li>
              The subcontractor will see client material, logins, unreleased work,
              or a client's internal plans.
            </li>
            <li>
              The work produces something the client expects to own — code, design
              files, video, copy.
            </li>
            <li>The person will be paid more than once, or on a running basis.</li>
            <li>The subcontractor will deal with your client, or might want to.</li>
            <li>
              Your own client agreement requires written terms with anyone you bring
              in. Confidentiality and subcontracting clauses usually have to be
              passed down to whoever does the work.
            </li>
          </ul>
          <p>Where freelancers often skip it:</p>
          <ul>
            <li>A small fixed job, finished in days, paid on delivery.</li>
            <li>Someone you have worked with several times and trust.</li>
            <li>Work where a disagreement would cost less than the paperwork.</li>
          </ul>
          <p>
            Even then, most people keep something in writing — a text or an email.
            It is cheaper to send than to argue about later.
          </p>
        </section>

        <section className="sf-block">
          <h2>Contractor or employee: why the difference matters</h2>
          <p>
            The label on the document does not settle this. What generally counts is
            how the two of you actually work together. Factors that commonly come
            up:
          </p>
          <ul>
            <li>Who decides how the work is done, rather than just what result is wanted.</li>
            <li>Who sets the hours and the schedule.</li>
            <li>Who supplies the equipment, software, and materials.</li>
            <li>Whether the person works for other clients and can turn work down.</li>
            <li>
              Whether they run their own business, set their own rates, and invoice
              for their own work.
            </li>
            <li>
              How they are paid — a project fee, or a regular amount on a
              payroll-like rhythm.
            </li>
          </ul>
          <p>
            Freelancers get this wrong because the habits of freelancing drift
            toward employment without anyone deciding to. A subcontractor who works
            only for you, at your hours, on your laptop, waiting to be told the next
            task, starts to look like staff no matter what the document calls them.
            A written agreement records what the two of you intended. It does not
            decide the question by itself.
          </p>
          <p>
            It matters because different obligations can attach depending on how a
            person is classified — tax handling, insurance, and other
            responsibilities can sit with the person paying. Which ones apply, and
            how they are assessed, varies by state. This page does not tell you
            which side of the line your arrangement falls on, and no template can.
            Where the money or the duration is significant, that is a question for a
            licensed attorney or tax professional in your state.
          </p>
          <p>
            If your question is the other direction — you are the one being hired
            rather than the one hiring — our guide to{" "}
            <Link to="/do-i-need-an-independent-contractor-agreement">
              independent contractor agreements
            </Link>{" "}
            looks at it from that side.
          </p>
        </section>

        <section className="sf-block">
          <h2>What belongs in the agreement</h2>
          <p>
            <strong>Scope and deliverables.</strong> Write the actual work, not the
            category. "Homepage design, three concepts, one round of revisions,
            delivered as layered source files" is scope. "Design help" is not. Name
            what is included, and what is not. Say how changes get agreed — in
            writing, before the extra work starts.
          </p>
          <p>
            <strong>Payment and timing.</strong> The rate or project amount, what
            triggers an invoice, when it is due, how it is sent, whether expenses
            need approval first, and whether a deposit applies. If the work is
            hourly, a cap or not-to-exceed figure and a check-in point.
          </p>
          <p>
            <strong>Who owns the work.</strong> This is the clause people forget.
            The person who creates something is often the one holding the rights in
            it, so if your client expects to own the finished files, the chain has
            to run from your subcontractor to you, and then from you to your client.
            Two approaches appear in ordinary agreements: the subcontractor assigns
            the work to you, sometimes once you have paid in full; or the
            subcontractor keeps ownership and licenses the work to you. Neither is
            right for everyone — it depends on what your client expects and what you
            have promised. Cover the material the person brings — code libraries,
            fonts, stock assets — and whether your client's use of the finished work
            covers it.
          </p>
          <p>
            <strong>Confidentiality.</strong> What the subcontractor may not disclose
            or reuse, and what happens to that material at the end.
          </p>
          <p>
            <strong>Whether the subcontractor may approach your client directly.</strong>{" "}
            Many freelancers include a clause limiting this, during the work or for a
            period afterwards. Wording of that kind is treated differently from state
            to state, and some places limit or prohibit certain versions of it, so it
            has to be written for where you and the subcontractor are. Leave it out,
            and the document says nothing about it.
          </p>
          <p>
            <strong>What happens if the work stops.</strong> In both directions: the
            subcontractor walks, or you end it. Notice period, whether either side
            can end it for any reason or only for a defined failure, what is paid for
            work already done, and what has to be handed back.
          </p>
          <p>
            <strong>A clear statement that the person is an independent contractor.</strong>{" "}
            Who handles their own taxes, who supplies their own equipment, that they
            are not an employee, and that they can work for others. This records
            intent — see the classification section above for what it does not do.
          </p>
        </section>

        <section className="sf-block">
          <h2>Why an agreement and an NDA usually travel together</h2>
          <p>
            If a subcontractor is going to see your client's material, two questions
            come up: what are they doing, and what may they do with what they see.
            The first is the contract. The second is the NDA.
          </p>
          <p>
            Some agreements fold confidentiality in as one section. Some people use
            a separate NDA instead — often earlier, while scoping someone they may
            not end up hiring. A standalone NDA is also the document a client
            sometimes asks you to sign, which makes it the natural thing to hand down
            in the same shape, so the obligations you owe upward are matched by the
            ones you hold below.
          </p>
          <p>
            An NDA can be one-way or mutual, depending on whether both sides are
            sharing anything. And it does not stand in for a contract: it says what
            may not be done with information, not what work is owed or who ends up
            owning it.
          </p>
        </section>

        <section className="sf-block">
          <h2>Mistakes freelancers actually make</h2>
          <ul>
            <li>
              <strong>No written scope.</strong> "A few pages" or "some edits" turns
              into an argument about what those words meant, with nothing to check
              them against.
            </li>
            <li>
              <strong>No ownership clause.</strong> The work is delivered, the client
              asks for the source files, and nobody wrote down who holds what.
            </li>
            <li>
              <strong>Letting the subcontractor talk to the client unsupervised.</strong>{" "}
              Your client starts directing the work — one of the factors that reads as
              employment — and scope changes without you hearing about it.
            </li>
            <li>
              <strong>Hourly with no cap.</strong> An open-ended hourly arrangement
              with no ceiling has no natural stopping point.
            </li>
            <li>
              <strong>Treating a contractor like an employee.</strong> Set hours,
              daily check-ins, your equipment, your software seats, no other clients,
              "ask me before you do anything." The document says contractor; the week
              says otherwise.
            </li>
          </ul>
        </section>

        <section className="sf-block">
          <h2>When the relationship ends or goes wrong</h2>
          <p>
            End it in writing, even when it is friendly: the date, what is finished,
            what is owed, what is being handed over. Collect the material — source
            files, working files, logins, client assets — and confirm it in the same
            message. Settle the money against what the agreement says, not what you
            remember agreeing. Keep the record: the signed document, invoices, and
            the messages where scope changed.
          </p>
          <p>
            If there is a disagreement, put your understanding of the facts in
            writing early and calmly, with dates, and read what the agreement says
            about how disputes are handled — some name a state's law, some name a
            process to try first. If the amount justifies it, have a licensed
            attorney in the relevant state look at the documents. We do not do that,
            and cannot tell you how a disagreement would come out.
          </p>
          <p>
            One thing freelancers get caught by: if your client holds back payment,
            that does not automatically change what you owe the subcontractor. The
            two relationships are separate unless your agreement ties them together.
          </p>
        </section>

        <section className="sf-block">
          <h2>Deciding is your call</h2>
          <p>
            Whether to use a full agreement, a one-page letter, or an email depends
            on the work, the person, your state, and how much money is at stake. Only
            you can weigh that. Some freelancers put everything in a signed
            agreement; some use a short brief and save the longer document for bigger
            jobs. Neither is unusual, and this page does not pick for you.
          </p>
          <p>
            If you want help deciding what fits your situation — including how the
            person should be classified — that is a conversation with a licensed
            attorney or tax professional in your state. We do not provide that help,
            and this page is not a stand-in for it.
          </p>
        </section>

        <section className="sf-block">
          <h2>If you want a form to fill in</h2>
          <p>
            The Independent Contractor Agreement template in our store is a{" "}
            <strong>blank fill-in form</strong>: a one-time download (editable DOCX
            plus a print-ready PDF), and you fill in the blanks yourself. It has
            sixteen numbered sections, with the optional ones marked so you can
            delete what does not apply. It is written between a client and a
            contractor, which is the shape you would use with a subcontractor: your
            details as the client, theirs as the contractor. It is not personalized,
            we do not complete or review it for you, and it is not legal advice.{" "}
            {guidePriceSentence("independent-contractor-agreement")}
          </p>
          <GuideCta
            to="/independent-contractor-agreement"
            label="Independent Contractor Agreement template"
          />
          <p>
            If the work means handing over client material, the Non-Disclosure
            Agreement template is the matching blank form, in the same format.
          </p>
          <GuideCta
            to="/non-disclosure-agreement"
            label="Non-Disclosure Agreement template"
          />
        </section>

        <section className="sf-block">
          <p>
            <em>
              This page is general information, not legal advice. SurplusClaim AI is
              not a law firm and does not provide legal services; nothing here
              creates an attorney-client relationship. The templates we sell are
              blank forms you complete yourself. They are not a substitute for advice
              from a licensed attorney in your state, and no outcome is promised.
            </em>
          </p>
        </section>
      </div>
    </GuidePage>
  );
}
