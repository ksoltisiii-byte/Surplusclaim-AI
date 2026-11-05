/**
 * Mailing-list signup form.
 *
 * Renders NOTHING unless the server reports a configured MAILING_LIST_ENDPOINT
 * (see ~/lib/mailing-list). That is deliberate: the owner has not opened a
 * mailing-list account yet, and a form that collects an address and drops it on
 * the floor would be a lie told to the visitor. Setting the environment variable
 * is the only change needed to make this appear.
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getMailingListStatus, subscribeToMailingList } from "~/lib/mailing-list";

export function EmailSignup({ heading = "Template updates by email" }: { heading?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let live = true;
    getMailingListStatus()
      .then((status) => {
        if (live) setEnabled(status?.enabled === true);
      })
      .catch(() => {
        if (live) setEnabled(false);
      });
    return () => {
      live = false;
    };
  }, []);

  if (!enabled) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const response = await subscribeToMailingList({ data: { email } });
      setResult(response);
      if (response?.ok) setEmail("");
    } catch {
      setResult({
        ok: false,
        message: "We could not save that address. Please try again later.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sf-signup">
      <h3>{heading}</h3>
      <p>
        Occasional emails when there is a new template or a price change. Nothing
        else, and no sharing your address.
      </p>
      <form className="sf-signup-form" onSubmit={onSubmit}>
        <label htmlFor="sf-signup-email">Email address</label>
        <input
          id="sf-signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className="sf-cta" disabled={busy}>
          {busy ? "Sending…" : "Sign up"}
        </button>
      </form>
      {result && (
        <p
          className={result.ok ? "sf-signup-ok" : "sf-signup-error"}
          role="status"
          aria-live="polite"
        >
          {result.message}
        </p>
      )}
    </section>
  );
}
