import { createServerFn } from "@tanstack/react-start";
import { Buffer } from "node:buffer";
import { sql } from "~/db";
import { BUSINESS } from "~/data/business";

/**
 * Server-side logic for the public e-sign route (`/sign`).
 *
 * The engagement letter and the homeowner's property come from the Neon
 * database (DATABASE_URL). `sql()` from ~/db resolves lazily, so this module
 * typechecks and the site builds even before the database is connected; at
 * runtime, queries return `db-not-configured` until DATABASE_URL exists.
 *
 * A homeowner reaches this flow ONLY through an unguessable per-owner
 * `sign_token` (UUID) — never through an id or a picker. Each token resolves to
 * exactly one owner/property; no demo data is ever exposed.
 */

export const FEE_PERCENT = 30;

export interface SignLetter {
  title: string;
  paragraphs: string[];
  fee_percent: number;
  estimated_fee: number;
}

export interface SignEngagementData {
  owner_id: number;
  property_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mailing_address: string | null;
  signed: boolean;
  signed_at: string | null;
  /* property */
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  county: string | null;
  auction_date: string | null;
  sale_price: number | null;
  mortgage_balance: number | null;
  surplus_amount: number | null;
}

export interface SignBusiness {
  name: string;
  address: string;
  cityStateZip: string;
  phone: string;
  phoneHref: string;
  website: string;
  optoutEmail: string;
}

type LoadResult =
  | { ok: true; data: SignEngagementData; letter: SignLetter; business: SignBusiness }
  | { ok: false; code: "db-not-configured" | "not-found" | "error"; message?: string };

function mapRow(r: Record<string, unknown>): SignEngagementData {
  const num = (v: unknown): number | null => (v == null ? null : Number(v));
  return {
    owner_id: Number(r.owner_id),
    property_id: Number(r.property_id),
    first_name: String(r.first_name ?? ""),
    last_name: String(r.last_name ?? ""),
    email: r.email == null ? null : String(r.email),
    phone: r.phone == null ? null : String(r.phone),
    mailing_address: r.mailing_address == null ? null : String(r.mailing_address),
    signed: r.eng_status === "signed",
    signed_at: r.eng_signed_at == null ? null : String(r.eng_signed_at),
    address: String(r.address ?? ""),
    city: String(r.city ?? ""),
    state: String(r.state ?? ""),
    zip_code: r.zip_code == null ? null : String(r.zip_code),
    county: r.county == null ? null : String(r.county),
    auction_date: r.auction_date == null ? null : String(r.auction_date),
    sale_price: num(r.sale_price),
    mortgage_balance: num(r.mortgage_balance),
    surplus_amount: num(r.surplus_amount),
  };
}

/** Same canonical wording as the local intake server's GET /api/letter (port 5000). */
function composeLetter(o: SignEngagementData): SignLetter {
  const estimatedFee = Math.round((o.surplus_amount || 0) * (FEE_PERCENT / 100));
  const zip = o.zip_code ? ` ${o.zip_code}` : "";
  const paragraphs = [
    `This letter confirms that ${o.first_name} ${o.last_name} ("Client") engages ${BUSINESS.name} ("Company") to investigate and, if appropriate, pursue recovery of surplus proceeds arising from the foreclosure sale of ${o.address}, ${o.city}, ${o.state}${zip} (auction date: ${o.auction_date || "—"}).`,
    `The Company's fee is ${FEE_PERCENT}% of any funds actually recovered on Client's behalf. The Client is never charged a fee unless funds are recovered. All out-of-pocket filing or notice costs, if any, will be disclosed and approved by the Client in advance.`,
    `The Client confirms they are the former homeowner (or an authorized representative) and that they have not already filed a claim for these surplus funds. The Client may cancel at any time by written notice before a claim is filed.`,
    `By signing below, the Client authorizes the Company to prepare and file the state-specific claim forms required to recover the surplus and to communicate with the court, county, or trustee holding the funds. The Company is not a law firm, and this agreement does not create an attorney-client relationship. The Client is encouraged to consult their own attorney before signing.`,
  ];
  return { title: "SURPLUS RECOVERY ENGAGEMENT LETTER", paragraphs, fee_percent: FEE_PERCENT, estimated_fee: estimatedFee };
}

const BUSINESS_PUBLIC: SignBusiness = {
  name: BUSINESS.name,
  address: BUSINESS.address,
  cityStateZip: BUSINESS.cityStateZip,
  phone: BUSINESS.phone,
  phoneHref: BUSINESS.phoneHref,
  website: BUSINESS.website,
  optoutEmail: BUSINESS.optoutEmail,
};

/**
 * Load the engagement letter + property data for one homeowner by their
 * unguessable sign token. `not-found` is also returned for opted-out owners so
 * a token cannot be probed.
 */
export const getEngagementByToken = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => ({ token: String(d?.token ?? "").trim() }))
  .handler(async ({ data }): Promise<LoadResult> => {
    if (!data.token) return { ok: false, code: "not-found" };
    let db: ReturnType<typeof sql>;
    try {
      db = sql();
    } catch {
      return { ok: false, code: "db-not-configured" };
    }
    try {
      const rows = await db`
        SELECT o.id AS owner_id, o.property_id, o.first_name, o.last_name, o.email, o.phone,
               o.mailing_address, o.opted_out,
               p.address, p.city, p.state, p.zip_code, p.county, p.auction_date,
               p.sale_price, p.mortgage_balance, p.surplus_amount,
               e.status AS eng_status, e.signed_at AS eng_signed_at
        FROM owners o
        JOIN properties p ON p.id = o.property_id
        LEFT JOIN engagements e ON e.owner_id = o.id AND e.status = 'signed'
        WHERE o.sign_token = ${data.token}
        LIMIT 1`;
      if (!rows.length || rows[0].opted_out) return { ok: false, code: "not-found" };
      const d = mapRow(rows[0]);
      return { ok: true, data: d, letter: composeLetter(d), business: BUSINESS_PUBLIC };
    } catch (err) {
      console.error("[esign] load error:", err);
      return { ok: false, code: "error", message: "We couldn't load your letter right now. Please try again." };
    }
  });

export interface SignSubmitInput {
  token: string;
  signer_name: string;
  signer_email: string;
  signer_phone?: string;
  mailing_address?: string;
  signature: string; // data:image/png;base64,...
  agree: boolean;
}

type SubmitResult =
  | { ok: true; engagement_id: number; reference: string }
  | { ok: false; code?: "db-not-configured" | "not-found"; message: string };

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const submitSignature = createServerFn({ method: "POST" })
  .validator((d: SignSubmitInput) => ({
    token: String(d?.token ?? "").trim(),
    signer_name: String(d?.signer_name ?? "").trim(),
    signer_email: String(d?.signer_email ?? "").trim().toLowerCase(),
    signer_phone: String(d?.signer_phone ?? "").trim() || undefined,
    mailing_address: String(d?.mailing_address ?? "").trim() || undefined,
    signature: String(d?.signature ?? ""),
    agree: Boolean(d?.agree),
  }))
  .handler(async ({ data }): Promise<SubmitResult> => {
    const { token, signer_name: name, signer_email: email, signature: sig, agree } = data;
    if (!token) return { ok: false, code: "not-found", message: "This link is not valid." };
    if (name.length < 2) return { ok: false, message: "Please enter your full legal name." };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Please enter a valid email address." };
    if (!agree) return { ok: false, message: "Please confirm that you have read and agree to the engagement letter." };
    if (!sig.startsWith("data:image/png;base64,") || sig.length < 1500) {
      return { ok: false, message: "Please draw your signature on the pad before signing." };
    }
    const sigBuf = Buffer.from(sig.split(",")[1] ?? "", "base64");
    if (sigBuf.length < 400 || !sigBuf.subarray(0, 8).equals(PNG_MAGIC)) {
      return { ok: false, message: "Invalid signature image. Please draw your signature again." };
    }

    let db: ReturnType<typeof sql>;
    try {
      db = sql();
    } catch {
      return { ok: false, code: "db-not-configured", message: "This page isn't fully set up yet — please contact us." };
    }

    try {
      // Re-resolve the token so submission can only ever write to the token's
      // own owner row.
      const owners = await db`
        SELECT o.id AS owner_id, o.property_id, o.first_name, o.last_name, o.email, o.phone,
               o.mailing_address, o.opted_out,
               p.address, p.city, p.state, p.zip_code, p.county, p.auction_date,
               p.sale_price, p.mortgage_balance, p.surplus_amount,
               e.status AS eng_status, e.signed_at AS eng_signed_at
        FROM owners o
        JOIN properties p ON p.id = o.property_id
        LEFT JOIN engagements e ON e.owner_id = o.id AND e.status = 'signed'
        WHERE o.sign_token = ${token}
        LIMIT 1`;
      if (!owners.length || owners[0].opted_out) {
        return { ok: false, code: "not-found", message: "This link is not valid." };
      }
      const ownerId = Number(owners[0].id);

      // Snapshot of the exact wording the homeowner signed (composed server-side).
      const letter = composeLetter(mapRow(owners[0]));
      const documentText = `${letter.title}\n\n${letter.paragraphs.join("\n\n")}`;

      const inserted = await db`
        INSERT INTO engagements (owner_id, fee_percent, status, signed_at, signer_name, signer_email, signature_png, document_text, created_at)
        VALUES (${ownerId}, ${FEE_PERCENT}, 'signed', now(), ${name}, ${email}, ${sig}, ${documentText}, now())
        RETURNING id`;
      const engagementId = Number(inserted[0].id);

      await db`
        UPDATE owners
        SET email = COALESCE(${email}, email),
            phone = COALESCE(${data.signer_phone}, phone),
            mailing_address = COALESCE(${data.mailing_address}, mailing_address),
            verified = TRUE
        WHERE id = ${ownerId}`;

      return { ok: true, engagement_id: engagementId, reference: `ENG-${engagementId}` };
    } catch (err) {
      console.error("[esign] submit error:", err);
      return { ok: false, message: "We couldn't save your signature right now. Please try again in a moment." };
    }
  });