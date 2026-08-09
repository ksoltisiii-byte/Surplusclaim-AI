/**
 * SurplusClaim AI — Digital Intake & E-Sign Server (port 5000)
 * Homeowner info form + engagement letter + HTML5 Canvas signature pad.
 * On signature: records the signed engagement and auto-generates the claim
 * via the claim engine (HTTP) with a local fallback if the engine is not up.
 */
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const { config, rows, row, run } = require('../lib/db');

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const FEE = config.contingency_fee_percent || 30;
const SIG_DIR = path.join(__dirname, 'public', 'signatures');
fs.mkdirSync(SIG_DIR, { recursive: true });

/* -------------------------------- helpers -------------------------------- */

function claimNumber(state) {
  const year = new Date().getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `SCA-${String(state || 'US').toUpperCase()}-${year}-${seq}`;
}

/** Try the claim engine (Python service built by backend); fall back to a local insert. */
async function generateClaim({ owner_id, property_id, state }) {
  const ce = config.claim_engine || {};
  if (ce.host && ce.port) {
    const url = `http://${ce.host}:${ce.port}${ce.path || '/generate'}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), ce.timeout_ms || 3000);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id, property_id, state }),
        signal: ac.signal
      });
      clearTimeout(timer);
      if (resp.ok) {
        const d = await resp.json().catch(() => ({}));
        if (d && d.claim_number) {
          return { claim_number: d.claim_number, status: d.status || 'draft', engine: 'external' };
        }
      }
    } catch (err) {
      clearTimeout(timer);
      console.log(`[intake] claim engine unavailable (${url}): ${err.message} — using local fallback`);
    }
  }
  const claimNumberVal = claimNumber(state);
  const info = run(
    `INSERT INTO claims(property_id, owner_id, claim_number, state, status, created_at)
     VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)`,
    property_id, owner_id, claimNumberVal, String(state || '').toUpperCase(), 'draft'
  );
  return { claim_number: claimNumberVal, status: 'draft', engine: 'fallback', id: Number(info.lastInsertRowid) };
}

/* --------------------------------- API ----------------------------------- */

/** GET /api/health */
app.get('/api/health', (req, res) => {
  let dbOk = false;
  try { dbOk = rows('SELECT COUNT(*) c FROM properties').length >= 0; } catch (_) {}
  res.json({ ok: dbOk, service: 'intake', port: config.services.intake.port, timestamp: new Date().toISOString() });
});

/** GET /api/properties — property+owner pairs for the intake selector */
app.get('/api/properties', (req, res) => {
  res.json(rows(`
    SELECT p.id AS property_id, p.address, p.city, p.state, p.zip_code, p.county,
           p.auction_date, p.sale_price, p.mortgage_balance, p.surplus_amount, p.status,
           o.id AS owner_id, o.first_name, o.last_name, o.email, o.phone, o.mailing_address
    FROM properties p JOIN owners o ON o.property_id = p.id
    ORDER BY p.surplus_amount DESC`));
});

/** GET /api/letter?owner_id= — the engagement letter text for display */
app.get('/api/letter', (req, res) => {
  const owner = row(`
    SELECT o.id AS owner_id, o.first_name, o.last_name, o.email,
           p.id AS property_id, p.address, p.city, p.state, p.zip_code,
           p.auction_date, p.sale_price, p.mortgage_balance, p.surplus_amount
    FROM owners o JOIN properties p ON p.id = o.property_id
    WHERE o.id = ?`, Number(req.query.owner_id) || 0);
  if (!owner) return res.status(404).json({ error: 'Owner not found.' });

  const fee = FEE;
  const estFee = Math.round((owner.surplus_amount || 0) * (fee / 100));
  res.json({
    owner,
    letter: {
      fee_percent: fee,
      estimated_fee: estFee,
      title: 'SURPLUS RECOVERY ENGAGEMENT LETTER',
      body: [
        `This letter confirms that ${owner.first_name} ${owner.last_name} ("Client") engages SurplusClaim AI ("Company") to investigate and, if appropriate, pursue recovery of surplus proceeds arising from the foreclosure sale of ${owner.address}, ${owner.city}, ${owner.state} ${owner.zip_code || ''} (auction date: ${owner.auction_date || '—'}).`,
        `The Company's fee is ${fee}% of any funds actually recovered on Client's behalf. The Client is never charged a fee unless funds are recovered. All out-of-pocket filing or notice costs, if any, will be disclosed and approved by the Client in advance.`,
        `The Client confirms they are the former homeowner (or an authorized representative) and that they have not already filed a claim for these surplus funds. The Client may cancel at any time by written notice before a claim is filed.`,
        `By signing below, the Client authorizes the Company to prepare and file the state-specific claim forms required to recover the surplus and to communicate with the court, county, or trustee holding the funds. The Company is not a law firm, and this agreement does not create an attorney-client relationship. The Client is encouraged to consult their own attorney before signing.`
      ].join('\n\n')
    }
  });
});

/**
 * POST /api/sign — validates the canvas signature and homeowner info,
 * records the signed engagement, then auto-generates the claim.
 * Body: { owner_id, signer_name, signer_email, signer_phone, mailing_address,
 *         signature (data:image/png;base64,...), agree }
 */
app.post('/api/sign', async (req, res) => {
  const b = req.body || {};
  const owner = row(`
    SELECT o.id AS owner_id, o.property_id, o.first_name, o.last_name,
           p.state, p.address, p.city
    FROM owners o JOIN properties p ON p.id = o.property_id
    WHERE o.id = ?`, Number(b.owner_id) || 0);
  if (!owner) return res.status(404).json({ error: 'Owner not found. Please select a property first.' });

  const name = String(b.signer_name || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Please enter the signer\u2019s full legal name.' });
  if (!b.agree) return res.status(400).json({ error: 'Please confirm that you have read and agree to the engagement letter.' });

  const sig = String(b.signature || '');
  if (!sig.startsWith('data:image/png;base64,') || sig.length < 1500) {
    return res.status(400).json({ error: 'Please draw your signature on the pad before signing.' });
  }
  const sigBuf = Buffer.from(sig.split(',')[1], 'base64');
  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (sigBuf.length < 400 || !sigBuf.subarray(0, 8).equals(PNG_MAGIC)) {
    return res.status(400).json({ error: 'Invalid signature image. Please draw your signature again.' });
  }

  // 1. Save signature image
  const base64 = sig.split(',')[1];
  const stamp = Date.now();
  const sigFile = `${owner.owner_id}-${stamp}.png`;
  fs.writeFileSync(path.join(SIG_DIR, sigFile), Buffer.from(base64, 'base64'));

  // 2. Update owner contact details
  run(`UPDATE owners SET email=COALESCE(?, email), phone=COALESCE(?, phone),
        mailing_address=COALESCE(?, mailing_address), verified=1 WHERE id=?`,
    b.signer_email ? String(b.signer_email).trim().toLowerCase() : null,
    b.signer_phone ? String(b.signer_phone).trim() : null,
    b.mailing_address ? String(b.mailing_address).trim() : null,
    owner.owner_id);

  // 3. Record signed engagement
  const eng = run(
    `INSERT INTO engagements(owner_id, fee_percent, status, signed_at, document_url, created_at)
     VALUES(?,?, 'signed', CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)`,
    owner.owner_id, FEE, `/signatures/${sigFile}`
  );

  // 4. Auto-generate the claim (claim engine with fallback)
  let claim;
  try {
    claim = await generateClaim({
      owner_id: owner.owner_id,
      property_id: owner.property_id,
      state: owner.state
    });
  } catch (err) {
    claim = { engine: 'error', error: err.message };
  }

  res.status(201).json({
    ok: true,
    engagement_id: Number(eng.lastInsertRowid),
    signer: name,
    property: `${owner.address}, ${owner.city}, ${owner.state}`,
    signature_file: `/signatures/${sigFile}`,
    claim
  });
});

/* -------------------------------- frontend -------------------------------- */

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const host = config.services.intake.host || '0.0.0.0';
const port = config.services.intake.port || 5000;
app.listen(port, host, () => {
  console.log(`[intake] SurplusClaim AI e-sign intake listening on http://${host}:${port} (mode: ${config.mode})`);
});
