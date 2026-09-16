import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  getEngagementByToken,
  submitSignature,
} from "~/lib/esign";
import type {
  SignBusiness,
  SignEngagementData,
  SignLetter,
} from "~/lib/esign";

/**
 * Public e-sign route: /sign?token=<unguessable per-owner UUID>
 *
 * A homeowner who responds to our outreach is sent THIS link. It loads ONLY
 * their own property + the engagement letter from the database (never any
 * demo data or another owner's information), captures a canvas signature, and
 * persists the signed engagement to Neon.
 */
export const Route = createFileRoute("/sign")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" && search.token.trim() ? search.token.trim() : null,
  }),
  head: () => ({
    meta: [{ title: "Sign Your Engagement — SurplusClaim AI" }],
  }),
  component: SignPage,
});

function fmtMoney(n: number | null): string {
  return "$" + Number(n || 0).toLocaleString("en-US");
}

/* ------------------------------ signature pad ----------------------------- */

function SignaturePad({ onResult }: { onResult: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const pad = canvasRef.current;
    if (!pad) return;
    const ctx = pad.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    const dpr = window.devicePixelRatio || 1;
    const rect = pad.getBoundingClientRect();
    pad.width = Math.max(1, Math.round(rect.width * dpr));
    pad.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b2a4a";

    const pos = (e: PointerEvent) => {
      const r = pad.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      pad.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      ctx.beginPath();
      const p = pos(e);
      ctx.moveTo(p.x, p.y);
    };
    const move = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const up = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      onResultRef.current(pad.toDataURL("image/png"));
    };

    pad.addEventListener("pointerdown", down);
    pad.addEventListener("pointermove", move);
    pad.addEventListener("pointerup", up);
    pad.addEventListener("pointercancel", up);
    return () => {
      pad.removeEventListener("pointerdown", down);
      pad.removeEventListener("pointermove", move);
      pad.removeEventListener("pointerup", up);
      pad.removeEventListener("pointercancel", up);
    };
  }, []);

  const clearPad = () => {
    const ctx = ctxRef.current;
    const pad = canvasRef.current;
    if (!ctx || !pad) return;
    ctx.clearRect(0, 0, pad.width, pad.height);
    onResultRef.current(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="sig-pad"
        aria-label="Signature pad — draw your signature here"
      />
      <div className="sig-actions">
        <button type="button" className="btn secondary" onClick={clearPad}>
          Clear
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- page ---------------------------------- */

function SignPage() {
  const { token } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [owner, setOwner] = useState<SignEngagementData | null>(null);
  const [letter, setLetter] = useState<SignLetter | null>(null);
  const [business, setBusiness] = useState<SignBusiness | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mailing, setMailing] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await getEngagementByToken({ data: { token: token ?? "" } });
      if (cancelled) return;
      if (res.ok) {
        setOwner(res.data);
        setLetter(res.letter);
        setBusiness(res.business);
        const o = res.data;
        setName(o.first_name ? `${o.first_name} ${o.last_name}`.trim() : "");
        setEmail(o.email ?? "");
        setPhone(o.phone ?? "");
        setMailing(o.mailing_address ?? "");
      } else {
        setError({ code: res.code, message: res.message ?? "" });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!signature) {
      setMsg({ kind: "err", text: "Please draw your signature on the pad." });
      return;
    }
    if (!agree) {
      setMsg({ kind: "err", text: "Please confirm that you have read and agree to the engagement letter." });
      return;
    }
    setSubmitting(true);
    const res = await submitSignature({
      data: {
        token: token ?? "",
        signer_name: name,
        signer_email: email,
        signer_phone: phone || undefined,
        mailing_address: mailing || undefined,
        signature,
        agree,
      },
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(res.reference);
      window.scrollTo(0, 0);
    } else {
      setMsg({ kind: "err", text: res.message });
    }
  };

  return (
    <div className="sign">
      <header>
        <div>
          <div className="logo">
            SurplusClaim <span>AI</span>
          </div>
          <div className="sub">Secure digital intake &amp; e-signature</div>
        </div>
      </header>

      <div className="wrap">
        {loading && (
          <div className="card center">
            <p className="muted">Checking your link…</p>
          </div>
        )}

        {!loading && error && (
          <div className="card">
            <h2>We couldn't open your engagement</h2>
            <p style={{ marginTop: 8 }}>
              {error.code === "db-not-configured"
                ? "This page isn't fully set up yet. Please call us and we'll complete your intake with you directly — no paperwork needed on your end."
                : error.code === "not-found"
                  ? "We couldn't find the record for this link. It may have expired, or the link may be incomplete. If you received this from us, call or email and we'll sort it out."
                  : error.message || "Something went wrong loading your letter. Please try again in a moment."}
            </p>
            {error.code !== "not-found" && (
              <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={() => window.location.reload()}>
                Try again
              </button>
            )}
          </div>
        )}

        {!loading && !error && owner && letter && business && done === null && (
          <>
            <div className="card">
              <div className="psum">
                <div>
                  <div className="addr">
                    {owner.address}, {owner.city}, {owner.state}
                    {owner.zip_code ? ` ${owner.zip_code}` : ""}
                  </div>
                  <div className="meta">
                    {owner.county ? `${owner.county} · ` : ""}Auction date: {owner.auction_date || "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="amt">{fmtMoney(owner.surplus_amount)}</div>
                  <span className="tag">estimated surplus</span>
                </div>
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                The surplus shown is an estimate, not a guarantee — the actual amount (if any) is
                confirmed with the county.
              </p>
              {owner.signed && (
                <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                  A signed engagement is already on file for this property. Contact us if you have
                  questions or need to make any changes.
                </p>
              )}
            </div>

            <div className="card">
              <span className="step-n">Step 1 · Review</span>
              <h2>{letter.title}</h2>
              <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
                Please read the agreement carefully. You can print or save a copy for your records.
              </p>
              <div className="letter">
                {letter.paragraphs.map((p, i) => (
                  <p key={i} style={{ marginBottom: i === letter.paragraphs.length - 1 ? 0 : 10 }}>
                    {p}
                  </p>
                ))}
                <div className="fee" style={{ marginTop: 12 }}>
                  Estimated fee if funds are recovered: {fmtMoney(letter.estimated_fee)} (30% of the
                  estimated surplus — charged only on funds actually recovered and paid to you).
                </div>
              </div>
            </div>

            <form className="card" onSubmit={submit}>
              <span className="step-n">Step 2 · Sign</span>
              <h2>Your information &amp; signature</h2>
              <div className="row2">
                <div>
                  <label htmlFor="signerName">Full legal name</label>
                  <input
                    id="signerName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="As shown on your ID"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="signerEmail">Email</label>
                  <input
                    id="signerEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <div className="row2">
                <div>
                  <label htmlFor="signerPhone">Phone</label>
                  <input id="signerPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <label htmlFor="mailingAddress">Mailing address (for payment checks)</label>
                  <input id="mailingAddress" type="text" value={mailing} onChange={(e) => setMailing(e.target.value)} placeholder="123 Main St, City, State ZIP" />
                </div>
              </div>

              <label htmlFor="sigPadInput">Draw your signature below</label>
              <div id="sigPadInput">
                <SignaturePad onResult={(d) => setSignature(d && d.length > 1500 ? d : null)} />
              </div>

              <div className="check">
                <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <label htmlFor="agree">
                  I have read and agree to the engagement letter above. I confirm I am the former
                  homeowner or an authorized representative, and I have not already filed a claim for
                  these surplus funds. I understand SurplusClaim AI's fee is{" "}
                  <strong>30% of funds actually recovered</strong> and that no fee is owed unless
                  funds are recovered.
                </label>
              </div>

              <button className="btn primary" type="submit" disabled={submitting} style={{ marginTop: 18, width: "100%" }}>
                {submitting ? "Submitting…" : "Sign & Submit"}
              </button>
              {msg && (
                <div className={"notice " + (msg.kind === "err" ? "err" : "ok")}>{msg.text}</div>
              )}
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                By signing, you authorize the Company to prepare and file the state-specific claim
                forms required to recover the surplus. The Company is not a law firm and this does
                not create an attorney-client relationship. You may cancel at any time before a claim
                is filed.
              </p>
            </form>

            <p className="muted center" style={{ textAlign: "center", fontSize: 13 }}>
              Questions? Call <a href={business.phoneHref}>{business.phone}</a> or email{" "}
              <a href={`mailto:${business.optoutEmail}`}>{business.optoutEmail}</a>.
            </p>
          </>
        )}

        {!loading && done !== null && (
          <div className="card center">
            <div className="success">
              <div className="big">✓ Signed &amp; Submitted</div>
              <p className="muted">
                Your signed engagement letter is recorded. We'll review it and contact you about next
                steps for your claim.
              </p>
              <div>
                Reference: <span className="claimno">{done}</span>
              </div>
              {business && (
                <p className="muted" style={{ fontSize: 13 }}>
                  Questions? Call {business.phone} or email {business.optoutEmail}.
                </p>
              )}
            </div>
          </div>
        )}

        <footer>
          <p>
            <strong>SurplusClaim AI</strong> · 5922 Okeechobee Blvd Unit #1101, West Palm Beach, FL
            33417 · <a href="tel:+15618469786">561-846-9786</a> ·{" "}
            <a href="mailto:optout@surplusclaimai.com">optout@surplusclaimai.com</a>
          </p>
          <p className="legal">
            This is a solicitation, not a government notice. Nothing on this page guarantees that
            funds are available or that you are entitled to any amount. We earn a 30% contingency
            fee only if funds are recovered and paid to you; nothing is charged up front. You are not
            required to use our services — former owners may also inquire directly with the county.
          </p>
        </footer>
      </div>

      <style>{`
        :root {
          --blue-900: #0b2a4a; --blue-800: #123c66; --blue-700: #1a4f85;
          --blue-600: #2164a8; --blue-500: #2b7bd0; --blue-100: #e3eefb; --blue-50: #f2f7fd;
          --ink: #152433; --muted: #5c7186; --line: #dbe6f1; --white: #fff; --green: #1e9e6a;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif; background: #eef3f9; color: var(--ink); line-height: 1.6; }
        header { background: linear-gradient(135deg, var(--blue-900), var(--blue-600)); color: #fff; padding: 16px 28px; display: flex; align-items: center; gap: 14px; }
        header .logo { font-size: 19px; font-weight: 800; }
        header .logo span { color: #9cc8f5; }
        header .sub { font-size: 12.5px; opacity: .85; }
        .wrap { max-width: 880px; margin: 28px auto 60px; padding: 0 20px; }
        .card { background: var(--white); border: 1px solid var(--line); border-radius: 14px; padding: 26px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(16,42,67,.06); }
        .card h2 { font-size: 17px; color: var(--blue-900); margin-bottom: 4px; }
        .card.center { text-align: center; padding: 36px 26px; }
        .card .step-n { display: inline-block; background: var(--blue-600); color: #fff; font-size: 12px; font-weight: 800; padding: 2px 10px; border-radius: 999px; margin-bottom: 10px; }
        label { display: block; font-size: 13px; font-weight: 700; color: var(--blue-800); margin: 14px 0 5px; }
        input[type='text'], input[type='tel'], input[type='email'] { width: 100%; padding: 11px 13px; border: 1px solid var(--line); border-radius: 8px; font-size: 14.5px; background: #fbfdff; }
        input:focus { outline: 2px solid var(--blue-100); border-color: var(--blue-500); }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .psum { background: var(--blue-50); border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
        .psum .addr { font-size: 15px; font-weight: 700; color: var(--blue-900); }
        .psum .meta { font-size: 13px; color: var(--muted); }
        .psum .amt { font-size: 22px; font-weight: 800; color: var(--green); }
        .psum .tag { background: var(--blue-100); color: var(--blue-700); font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 999px; }
        .letter { background: #fbfdff; border: 1px solid var(--line); border-radius: 10px; padding: 20px 22px; font-size: 14px; color: #2c3e50; }
        .letter .fee { font-weight: 700; color: var(--blue-800); }
        .sig-pad { width: 100%; height: 200px; border: 2px dashed var(--blue-500); border-radius: 10px; background: #fff; touch-action: none; cursor: crosshair; }
        .sig-actions { margin-top: 10px; }
        .btn { display: inline-block; padding: 11px 22px; border: 0; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; }
        .btn.primary { background: var(--blue-600); color: #fff; }
        .btn.primary:hover { background: var(--blue-700); }
        .btn.secondary { background: var(--blue-100); color: var(--blue-700); }
        .btn:disabled { opacity: .55; cursor: not-allowed; }
        .check { display: flex; gap: 10px; align-items: flex-start; margin-top: 18px; }
        .check input { width: 17px; height: 17px; margin-top: 2px; }
        .check label { margin: 0; font-weight: 500; font-size: 13px; color: var(--muted); }
        .notice { margin-top: 14px; font-weight: 600; font-size: 14px; }
        .notice.err { color: #c0392b; }
        .notice.ok { color: var(--green); }
        .success .big { font-size: 26px; font-weight: 800; color: var(--green); margin-bottom: 10px; }
        .success .claimno { font-size: 18px; font-weight: 800; color: var(--blue-800); background: var(--blue-50); border: 1px solid var(--line); display: inline-block; padding: 10px 22px; border-radius: 10px; margin: 14px 0; }
        footer { margin-top: 34px; background: var(--blue-900); color: rgba(255,255,255,.85); padding: 26px 20px; text-align: center; font-size: 13px; border-radius: 12px; }
        footer a { color: #9cc8f5; }
        footer .legal { font-size: 12px; opacity: .8; max-width: 820px; margin: 10px auto 0; }
        .muted { color: var(--muted); }
        @media (max-width: 640px) { .row2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}