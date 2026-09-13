#!/usr/bin/env node
/**
 * SurplusClaim AI — Lob print-and-mail dispatcher for generated letters.
 *
 * Reads the manifest produced by generate-letters.js (letters/output/manifest.csv,
 * default) and mails one USPS First-Class letter per mail-ready lead through
 * Lob's Letters API. The letter body comes from
 * letters/output/letters/<uid>.html.
 *
 * Modes:
 *   --dry-run  validate everything and report, but make NO API calls
 *   --test     use the Lob TEST secret (env LOB_TEST_API_KEY); nothing mails
 *   (default)  live send with the Lob LIVE secret (env LOB_API_KEY)
 *
 * File format: we send the letter as raw HTML in Lob's `file` field — Lob
 * rasterizes HTML → PDF server-side at print time (their documented,
 * recommended mode for letters), so no local PDF toolchain is required. If a
 * <uid>.pdf already exists in --pdf-dir, it takes precedence (base64 PDF).
 *
 * Safety rails (match generate-letters.js guardrails):
 *   - Rows with mail_ready!=true are never sent.
 *   - Letters whose content contains the "NOT FOR MAILING" demo stamp are never sent.
 *   - The business config must be complete (no REPLACE_ placeholders).
 *   - A send log (letters/output/lob_send_log.csv) records every API call;
 *     uids already sent successfully in this mode are skipped on re-runs
 *     unless --force. Never mail the same lead twice by accident.
 *
 * Usage:
 *   node letters/send-lob.js --dry-run
 *   node letters/send-lob.js --test --verify --max 5
 *   LOB_API_KEY=live_xxx node letters/send-lob.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const DEFAULT_MANIFEST = path.join(__dirname, "output", "manifest.csv");
const DEFAULT_LETTERS_DIR = path.join(__dirname, "output", "letters");
const DEFAULT_CONFIG = path.join(__dirname, "config.json");
const DEFAULT_LOG = path.join(__dirname, "output", "lob_send_log.csv");
const LOB_API_BASE = "https://api.lob.com/v1";
// LGBS feed has no owner names; this salutation is owner-approved copy.
const RECIPIENT_NAME_FALLBACK = "Property Owner / Former Owner";
// Lob Developer-plan USPS first-class letter rate (B/W). Used for cost
// estimates in dry-run and the cost column of the send log.
const COST_PER_LETTER = 0.828;
const LOG_HEADER = [
  "sent_at", "mode", "uid", "cause_nbr", "mail_type", "color",
  "http_status", "lob_letter_id", "lob_status", "deliverability",
  "to_name", "to_line1", "to_city", "to_state", "to_zip",
  "estimated_surplus", "cost", "error",
];

/* ------------------------------------------------------------------ */
/* Tiny CSV parser (RFC4180-ish: quoted fields, embedded commas/newlines) */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\r") {
      // skip
    } else if (ch === "\n") {
      row.push(field); field = "";
      if (row.length > 1 || row[0].trim() !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); if (row.length > 1 || row[0].trim() !== "") rows.push(row); }
  return rows;
}

function csvEscape(v) {
  return `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
}

function parseArgs(argv) {
  const opts = {
    dryRun: false, test: false, verify: false, force: false, color: false,
    max: Infinity, delayMs: 250, manifest: DEFAULT_MANIFEST,
    lettersDir: DEFAULT_LETTERS_DIR, config: DEFAULT_CONFIG, log: DEFAULT_LOG,
    pdfDir: null, help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const eq = a.indexOf("=");
    const name = eq >= 0 ? a.slice(0, eq) : a;
    const inline = eq >= 0 ? a.slice(eq + 1) : null;
    const next = () => (eq >= 0 ? inline : argv[++i]);
    switch (name) {
      case "--dry-run": opts.dryRun = true; break;
      case "--test": opts.test = true; break;
      case "--verify": opts.verify = true; break;
      case "--force": opts.force = true; break;
      case "--color": opts.color = true; break;
      case "--max": opts.max = parseInt(next(), 10); break;
      case "--delay-ms": opts.delayMs = parseInt(next(), 10); break;
      case "--manifest": opts.manifest = next(); break;
      case "--letters-dir": opts.lettersDir = next(); break;
      case "--config": opts.config = next(); break;
      case "--log": opts.log = next(); break;
      case "--pdf-dir": opts.pdfDir = next(); break;
      case "-h": case "--help": opts.help = true; break;
      default:
        console.error(`[error] Unknown option: ${a}`);
        process.exit(2);
    }
  }
  return opts;
}

/* ------------------------------------------------------------------ */
function loadConfig(configPath) {
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.error(`[error] Cannot read business config ${configPath}: ${err.message}`);
    process.exit(1);
  }
  const REQUIRED = ["business_name", "business_address", "business_city", "business_state", "business_zip", "business_phone", "business_website"];
  const missing = REQUIRED.filter((k) => {
    const v = (cfg[k] || "").toString().trim();
    return v === "" || /^REPLACE/i.test(v);
  });
  return { cfg, missing };
}

function buildFrom(cfg) {
  return {
    name: String(cfg.business_name).slice(0, 40),
    address_line1: String(cfg.business_address).slice(0, 64),
    address_city: String(cfg.business_city).slice(0, 40),
    address_state: String(cfg.business_state).slice(0, 2),
    address_zip: String(cfg.business_zip).slice(0, 10),
    address_country: "US",
  };
}

function buildTo(row) {
  const first = (row.first_name || "").trim();
  const last = (row.last_name || "").trim();
  const name = (first || last) ? `${first} ${last}`.trim().slice(0, 40) : RECIPIENT_NAME_FALLBACK;
  return {
    name,
    address_line1: String(row.address || "").slice(0, 64),
    address_city: String(row.city || "").slice(0, 40),
    address_state: String(row.state || "").slice(0, 2),
    address_zip: String(row.zip || "").slice(0, 10),
    address_country: "US",
  };
}

function parseManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    console.error(`[error] Manifest not found: ${manifestPath}\n  Run the letter generator first: node letters/generate-letters.js`);
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(manifestPath, "utf8"));
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || "").trim()])));
}

function letterFileFor(row, lettersDir, pdfDir) {
  // Manifest letter_file is "letters/<uid>.html" (relative to output/): accept
  // either that form or a bare filename.
  let base = row.letter_file || "";
  const bare = path.basename(base);
  const htmlPath = path.join(lettersDir, bare);
  if (pdfDir) {
    const pdfPath = path.join(pdfDir, `${bare.replace(/\.html$/, "")}.pdf`);
    if (fs.existsSync(pdfPath)) return { kind: "pdf", path: pdfPath };
  }
  return { kind: "html", path: htmlPath };
}

function readLetterFile(file) {
  if (!fs.existsSync(file.path)) return { ok: false, reason: `letter file not found: ${file.path}` };
  let content;
  try {
    content = fs.readFileSync(file.path, "utf8");
  } catch (err) {
    return { ok: false, reason: `letter unreadable: ${err.message}` };
  }
  if (/NOT FOR MAILING/i.test(content)) {
    return { ok: false, reason: `letter is DEMO-stamped (NOT FOR MAILING): ${file.path}` };
  }
  if (!/<html[\s>]/i.test(content)) {
    return { ok: false, reason: `letter has no <html> root — not a renderable letter: ${file.path}` };
  }
  if (file.kind === "pdf") {
    return { ok: true, content: `data:application/pdf;base64,${fs.readFileSync(file.path).toString("base64")}` };
  }
  return { ok: true, content };
}

/* ------------------------------------------------------------------ */
async function lobFetch(apiKey, endpoint, body) {
  const res = await fetch(`${LOB_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* non-JSON error body */ }
  return { status: res.status, data };
}

async function lobVerify(apiKey, to) {
  // USPS address verification. Skips only the genuinely undeliverable ones;
  // "deliverable_*" variants are still mailed (Lob applies corrections).
  const { status, data } = await lobFetch(apiKey, "/us_verifications", {
    primary_line: to.address_line1,
    city: to.address_city,
    state: to.address_state,
    zip_code: to.address_zip,
  });
  if (status >= 200 && status < 300 && data) {
    return { ok: true, deliverability: data.deliverability || "unknown", raw: data };
  }
  return {
    ok: false,
    deliverability: "verify_error",
    error: `verify HTTP ${status}${data && data.error ? `: ${data.error.message || JSON.stringify(data.error)}` : ""}`,
  };
}

async function lobSendLetter(apiKey, { description, to, from, file, color }) {
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { status, data } = await lobFetch(apiKey, "/letters", {
      description,
      to,
      from,
      file,
      color,
      mail_type: "usps_first_class",
      use_type: "marketing",
      address_placement: "top_first_page",
    });
    if (status === 429 || status >= 500) {
      last = { status, data };
      if (attempt === 0) await new Promise((r) => setTimeout(r, 2500));
      continue;
    }
    return { ok: status >= 200 && status < 300, status, data };
  }
  return { ok: false, status: last.status, data: last.data, retried: true };
}

/* ------------------------------------------------------------------ */
function readPriorLog(logPath, mode) {
  if (!fs.existsSync(logPath)) return new Set();
  const rows = parseCsv(fs.readFileSync(logPath, "utf8"));
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const sent = new Set();
  const uidI = idx.uid, modeI = idx.mode, idI = idx.lob_letter_id;
  for (const r of rows.slice(1)) {
    if (r[modeI] === mode && r[idI] && !r[idI].startsWith("ERR")) sent.add(r[uidI]);
  }
  return sent;
}

function appendLog(logPath, entry) {
  const fresh = !fs.existsSync(logPath);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const line = LOG_HEADER.map((h) => csvEscape(entry[h] ?? "")).join(",");
  fs.appendFileSync(logPath, (fresh ? LOG_HEADER.map(csvEscape).join(",") + "\n" : "") + line + "\n");
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ------------------------------------------------------------------ */
async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(`Usage: node letters/send-lob.js [options]

  --dry-run        validate + report only; makes NO API calls (default when no key)
  --test           use Lob TEST secret from env LOB_TEST_API_KEY
  (no flag)        live send using env LOB_API_KEY
  --verify         pre-flight USPS address verification; skips undeliverable
  --max N          process at most N mail-ready leads
  --pdf-dir DIR    if a <uid>.pdf exists there, send it instead of HTML
  --force          re-send uids already logged as sent in this mode
  --color          color printing (default is B/W)
  --delay-ms N     pause between API calls (default 250)
  --manifest PATH  manifest CSV (default letters/output/manifest.csv)
  --letters-dir P  letter HTML directory (default letters/output/letters)
  --config PATH    business config JSON (default letters/config.json)
  --log PATH       send log CSV (default letters/output/lob_send_log.csv)`);
    return;
  }

  const { cfg, missing } = loadConfig(opts.config);
  const from = buildFrom(cfg);

  // Resolve mode + API key.
  let mode = "live";
  let apiKey = process.env.LOB_API_KEY || "";
  if (opts.test) { mode = "test"; apiKey = process.env.LOB_TEST_API_KEY || ""; }
  if (opts.dryRun) mode = "dry-run";
  if (!opts.dryRun && !apiKey) {
    console.error(`[error] ${mode === "test" ? "LOB_TEST_API_KEY" : "LOB_API_KEY"} is not set (needed for ${mode} mode).\n  Use --dry-run to validate without sending, or export the key.`);
    process.exit(2);
  }
  if (opts.verify && opts.dryRun) {
    console.warn("[warn] --verify has no effect in --dry-run mode (no API calls are made).");
  }

  const manifest = parseManifest(opts.manifest);
  console.log(`Manifest      : ${path.relative(process.cwd(), opts.manifest)} (${manifest.length} rows)`);
  if (missing.length) {
    console.error(`[error] Business config is not mail-ready — missing/placeholder: ${missing.join(", ")}\n  Fix ${opts.config} first (see letters/config.example.json). Refusing to send.`);
    process.exit(1);
  }

  const eligible = manifest.filter((r) => r.mail_ready === "true" && (r.missing_business_fields || "") === "");
  const blocked = manifest.length - eligible.length;
  console.log(`Mail-ready    : ${eligible.length} (${blocked} blocked by mail_ready gate)`);

  // Load letter bodies and validate everything before touching the API.
  const jobs = [];
  for (const row of eligible) {
    const file = letterFileFor(row, opts.lettersDir, opts.pdfDir);
    const read = readLetterFile(file);
    if (!read.ok) {
      console.warn(`[warn] Skipping ${row.uid}: ${read.reason}`);
      continue;
    }
    jobs.push({ row, file, body: read.content });
  }

  const priorSent = opts.force ? new Set() : readPriorLog(opts.log, mode);
  const freshJobs = jobs.filter((j) => !priorSent.has(j.row.uid));
  const alreadySent = jobs.length - freshJobs.length;

  const take = Math.min(freshJobs.length, opts.max);
  const todo = freshJobs.slice(0, take);
  const deferred = freshJobs.length - take;

  console.log(`\nPlan (mode=${mode}${opts.verify ? ", verify" : ""}${opts.color ? ", COLOR" : ", B/W"}):`);
  const surpluses = todo.map((j) => parseFloat(j.row.estimated_surplus) || 0);
  const sumSurplus = surpluses.reduce((a, b) => a + b, 0);
  const mailCost = todo.length * COST_PER_LETTER;
  console.log(`  ready to send : ${todo.length}  (estimated surplus $${sumSurplus.toFixed(2)}; 30% fee $${(sumSurplus * 0.30).toFixed(2)})`);
  console.log(`  mail cost     : ~$${mailCost.toFixed(2)} (${todo.length} letters @ $${COST_PER_LETTER.toFixed(3)}/letter, Lob Developer plan)`);
  console.log(`  already sent  : ${alreadySent}${opts.force ? " (forced)" : ""}`);
  console.log(`  deferred      : ${deferred} (--max/other)`);

  if (opts.dryRun) {
    console.log("\nDry run: NO API calls made. If this were a real send:");
    let n = 0;
    for (const j of todo) {
      if (n++ < 8) {
        console.log(`  -> ${j.row.uid}  ${j.row.address}, ${j.row.city}, ${j.row.state} ${j.row.zip}  (${j.row.estimated_surplus})  [${j.file.kind}]`);
      }
    }
    if (n > 8) console.log(`  ... and ${n - 8} more`);
    console.log(`\nVALIDATION: ${todo.length}/${jobs.length} letters ready. OK (dry-run).`);
    return;
  }

  // Real (test or live) send.
  const results = [];
  let sentCount = 0;
  let sentSurplus = 0;
  for (let i = 0; i < todo.length; i++) {
    const j = todo[i];
    const to = buildTo(j.row);
    const row = {
      sent_at: new Date().toISOString(),
      mode,
      uid: j.row.uid,
      cause_nbr: j.row.cause_nbr || "",
      mail_type: "usps_first_class",
      color: opts.color ? "true" : "false",
      to_name: to.name,
      to_line1: to.address_line1,
      to_city: to.address_city,
      to_state: to.address_state,
      to_zip: to.address_zip,
      estimated_surplus: j.row.estimated_surplus || "",
      cost: "",
      lob_letter_id: "", lob_status: "", deliverability: "", http_status: "", error: "",
    };

    try {
      let sendResult = null;
      if (opts.verify) {
        const v = await lobVerify(apiKey, to);
        row.deliverability = v.deliverability;
        if (!v.ok) row.error = v.error;
        else if (v.deliverability === "undeliverable") row.error = "skipped: undeliverable (--verify)";
        else sendResult = await lobSendLetter(apiKey, {
          description: `SurplusClaim AI — surplus outreach uid ${j.row.uid} (cause ${j.row.cause_nbr || "n/a"})`,
          to, from,
          file: j.body,
          color: opts.color,
        });
      } else {
        sendResult = await lobSendLetter(apiKey, {
          description: `SurplusClaim AI — surplus outreach uid ${j.row.uid} (cause ${j.row.cause_nbr || "n/a"})`,
          to, from,
          file: j.body,
          color: opts.color,
        });
      }

      if (sendResult) {
        row.http_status = String(sendResult.status || "");
        if (sendResult.ok && sendResult.data && sendResult.data.id) {
          row.lob_letter_id = sendResult.data.id;
          row.lob_status = sendResult.data.status || "";
          if (!row.deliverability && sendResult.data.to && sendResult.data.to.deliverability) {
            row.deliverability = sendResult.data.to.deliverability;
          }
          row.cost = COST_PER_LETTER.toFixed(2);
          console.log(`  [${mode}] ${j.row.uid} -> ${sendResult.data.id} (${sendResult.data.status || "processed"})`);
        } else if (sendResult.data) {
          row.error = `HTTP ${sendResult.status}${sendResult.data.error ? `: ${sendResult.data.error.message || JSON.stringify(sendResult.data.error)}` : ""}`;
          row.lob_letter_id = "ERR"; // never treated as sent in later runs
        } else {
          row.error = `HTTP ${sendResult.status} (no JSON body)`;
          row.lob_letter_id = "ERR";
        }
      }
    } catch (err) {
      row.error = err.message || String(err);
    }

    appendLog(opts.log, row);
    results.push(row);
    if (row.lob_letter_id && row.lob_letter_id !== "ERR" && !row.error) {
      sentCount++;
      sentSurplus += parseFloat(j.row.estimated_surplus) || 0;
    }
    if (i < todo.length - 1 && opts.delayMs > 0) await sleep(opts.delayMs);
  }

  console.log(`\nDone (mode=${mode}). Sent: ${sentCount}; failed/skipped: ${todo.length - sentCount}. Log: ${opts.log}`);
  console.log(`Sent surplus total: $${sentSurplus.toFixed(2)} (30% contingency fee: $${(sentSurplus * 0.30).toFixed(2)})`);
  console.log(`Mail cost (sent): ~$${(sentCount * COST_PER_LETTER).toFixed(2)} (${sentCount} @ $${COST_PER_LETTER.toFixed(3)})`);
  if (mode === "test") console.log("TEST MODE — nothing was actually mailed.");
}

main().catch((err) => {
  console.error("[error] Unhandled failure:", err.message || err);
  process.exit(1);
});