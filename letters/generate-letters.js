#!/usr/bin/env node
/**
 * SurplusClaim AI — mail-merge letter generator (Texas leads, printed mail).
 *
 * Reads the lead CSV produced by scrapers/lgbs.py (the LGBS tax-sale feed),
 * renders one print-ready HTML letter per surplus candidate using the
 * owner-approved copy in LETTER_COPY.md verbatim, and writes a manifest CSV
 * mapping each lead uid to its letter file.
 *
 * Usage:
 *   node letters/generate-letters.js \
 *     [--input scrapers/output/harris_surplus.csv] \
 *     [--config letters/config.json] \
 *     [--out letters/output] \
 *     [--date 2026-09-08] [--strict] [--no-merged]
 *
 * Honesty guard: if the business config still contains placeholder values
 * (e.g. "REPLACE..."), letters are stamped DEMO — NOT FOR MAILING and the
 * manifest marks mail_ready=false. Use --strict to fail instead of stamping.
 * Never mail letters generated with placeholder business details.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEFAULT_INPUT = path.join(ROOT, "scrapers", "output", "harris_surplus.csv");
const DEFAULT_OUT = path.join(__dirname, "output");
const COPY_FILE = path.join(__dirname, "LETTER_COPY.md");
const CONFIG_EXAMPLE = path.join(__dirname, "config.example.json");
const DEFAULT_CONFIG = path.join(__dirname, "config.json");
const MIN_SURPLUS = 0.0; // include candidates where estimated surplus > 0

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

/* ------------------------------------------------------------------ */
/* Small markdown-ish renderer for the ratified copy (bold, italic, bullets) */
function inlineMd(text) {
  // **bold** then *italic* (order matters so ** isn't eaten by *)
  let s = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return s;
}

function renderBlocks(blocks) {
  const html = [];
  let isFirst = true;
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l !== "");
    if (lines.length === 0) continue;
    const joined = lines.join("\n");
    // First block = business letterhead (name, address, phone · website)
    if (isFirst) {
      isFirst = false;
      html.push(`<div class="letterhead">${lines.map(escHtml).join("<br>")}</div>`);
      continue;
    }
    // Entire block italic -> disclaimer
    if (/^\*[^*]+\*$/.test(joined)) {
      html.push(`<p class="disclaimer">${inlineMd(joined)}</p>`);
      continue;
    }
    // Addressee block
    if (joined.startsWith("**Property Owner")) {
      html.push(`<div class="addressee">${lines.map(inlineMd).join("<br>")}</div>`);
      continue;
    }
    // Subject (Re:) line
    if (joined.startsWith("**Re:")) {
      html.push(`<p class="subject">${inlineMd(joined)}</p>`);
      continue;
    }
    if (joined === "Dear Property Owner,") {
      html.push(`<p class="salutation">${inlineMd(joined)}</p>`);
      continue;
    }
    if (joined === "Sincerely,") {
      html.push(`<p class="salutation close">${inlineMd(joined)}</p>`);
      continue;
    }
    // Bullet list
    if (lines.every((l) => l.startsWith("- "))) {
      html.push(`<ul>${lines.map((l) => `<li>${inlineMd(l.replace(/^- /, ""))}</li>`).join("")}</ul>`);
      continue;
    }
    // Regular paragraph: collapse internal newlines to spaces
    html.push(`<p>${inlineMd(lines.join(" "))}</p>`);
  }
  return html.join("\n");
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------------ */
function parseArgs(argv) {
  const opts = { input: DEFAULT_INPUT, config: DEFAULT_CONFIG, out: DEFAULT_OUT, date: null, strict: false, merged: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--input") opts.input = next();
    else if (a === "--config") opts.config = next();
    else if (a === "--out") opts.out = next();
    else if (a === "--date") opts.date = next();
    else if (a === "--strict") opts.strict = true;
    else if (a === "--no-merged") opts.merged = false;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error(`Unknown option: ${a}`); printHelp(); process.exit(2); }
  }
  return opts;
}

function printHelp() {
  console.log(`SurplusClaim AI — mail-merge letter generator

Usage: node letters/generate-letters.js [options]

Options:
  --input PATH   Lead CSV from scrapers/lgbs.py (default: scrapers/output/harris_surplus.csv)
  --config PATH  Business JSON config, real values required before mailing (default: letters/config.json)
  --out DIR      Output directory (default: letters/output)
  --date YYYY-MM-DD  Letter date (default: today)
  --strict       Fail if business config still has placeholder values instead of stamping DEMO
  --no-merged    Skip the merged printable document
  -h, --help     Show this help`);
}

/* ------------------------------------------------------------------ */
function loadBusinessConfig(configPath, strict) {
  let p = configPath;
  if (!fs.existsSync(p)) {
    console.warn(`[warn] ${p} not found; falling back to ${CONFIG_EXAMPLE} (placeholders).`);
    p = CONFIG_EXAMPLE;
  }
  const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
  const required = ["business_name", "business_address", "business_city", "business_state", "business_zip", "business_phone", "business_website", "business_domain"];
  const missing = [];
  for (const key of required) {
    const v = (cfg[key] || "").trim();
    if (!v) { missing.push(key); continue; }
    if (/REPLACE|YOUR_|TODO/i.test(v)) missing.push(key);
  }
  if (missing.length > 0) {
    if (strict) {
      console.error(`[error] letters/config.json has placeholder/missing business fields: ${missing.join(", ")}\nFill real values before mailing (see letters/config.example.json).`);
      process.exit(1);
    }
    console.warn(`[warn] Business config not mail-ready (placeholder/missing: ${missing.join(", ")}).\nOutput will be stamped DEMO — NOT FOR MAILING. Use --strict to fail instead.`);
    cfg._demo = true;
  } else {
    cfg._demo = false;
  }
  return cfg;
}

function loadCopy() {
  const md = fs.readFileSync(COPY_FILE, "utf8");
  // Body = everything after the first --- separator line
  const idx = md.indexOf("\n---\n");
  if (idx < 0) throw new Error(`LETTER_COPY.md has no --- body separator`);
  return md.slice(idx + 5).trim();
}

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v || "");
  // The ratified copy already includes a "$" before {{estimated_surplus}},
  // so this returns the bare formatted number (commas, no cents).
  return Math.round(n).toLocaleString("en-US");
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// The ratified copy appends " County" after {{county}}, so strip a
// trailing "County"/"COUNTY" from the source value to avoid "Harris County County".
function countyBase(v) {
  const s = String(v || "").trim();
  return s.replace(/\s*[Cc]ounty$/, "").trim();
}

function renderLetter(row, cfg, letterDate, copy, demo) {
  const values = {
    date: letterDate,
    address: escHtml(row.address),
    city: escHtml(row.city),
    state: escHtml(row.state),
    zip: escHtml(row.zip),
    county: escHtml(countyBase(row.county)),
    cause_nbr: escHtml(row.cause_nbr || ""),
    estimated_surplus: fmtMoney(row.estimated_surplus),
    business_name: escHtml(cfg.business_name || ""),
    business_address: escHtml(cfg.business_address || ""),
    business_city: escHtml(cfg.business_city || ""),
    business_state: escHtml(cfg.business_state || ""),
    business_zip: escHtml(cfg.business_zip || ""),
    business_phone: escHtml(cfg.business_phone || ""),
    business_website: escHtml(cfg.business_website || ""),
    business_domain: escHtml(cfg.business_domain || ""),
  };
  let body = copy;
  for (const [k, v] of Object.entries(values)) {
    body = body.split(`{{${k}}}`).join(v);
  }
  const blocks = body.split(/\n\s*\n/);
  const content = renderBlocks(blocks);
  const demoBanner = demo
    ? `<div class="demo-banner">DEMO — NOT FOR MAILING — business details not finalized</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>SurplusClaim AI — ${escHtml(row.address)}, ${escHtml(row.city)} ${escHtml(row.state)}</title>
<style>
  @page { size: Letter; margin: 0.9in 0.9in 1in 0.9in; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a2430; font-size: 12pt; line-height: 1.5; margin: 0; padding: 0; }
  .page { max-width: 7in; margin: 0 auto; }
  .demo-banner { background: #c62828; color: #fff; font-family: Arial, sans-serif; font-weight: 700; text-align: center; padding: 8px; margin-bottom: 24px; letter-spacing: 0.5px; }
  .letterhead { margin-bottom: 28px; }
  .date { margin-bottom: 20px; }
  .addressee { margin-bottom: 20px; }
  .subject { font-weight: 700; margin-bottom: 16px; }
  p, li { margin: 0 0 10px 0; }
  ul { margin: 0 0 12px 0; padding-left: 24px; }
  strong { color: #0b1e33; }
  .disclaimer { font-size: 9pt; color: #47586b; margin-top: 28px; border-top: 1px solid #cfd8e3; padding-top: 10px; font-style: italic; }
  .page-break { page-break-before: always; }
  @media print { .demo-banner { display: none !important; } }
</style>
</head>
<body>
<div class="page">
${demoBanner}
${content}
</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cfg = loadBusinessConfig(opts.config, opts.strict);
  const copy = loadCopy();
  const letterDate = opts.date ? fmtDate(opts.date) : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  if (!fs.existsSync(opts.input)) {
    console.error(`[error] Input CSV not found: ${opts.input}\nRun the LGBS scraper first (python scrapers/lgbs.py) or pass --input.`);
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(opts.input, "utf8"));
  const header = rows.shift().map((h) => h.trim());
  const leads = rows
    .map((r) => {
      const obj = {};
      header.forEach((h, i) => { obj[h] = (r[i] || "").trim(); });
      return obj;
    })
    .filter((r) => {
      const est = Number(r.estimated_surplus);
      if (!Number.isFinite(est) || est <= MIN_SURPLUS) return false;
      if (!r.uid || !r.address || !r.city || !r.state) return false;
      return true;
    });

  if (leads.length === 0) {
    console.error(`[error] No surplus candidates (estimated_surplus > 0) found in ${opts.input}`);
    process.exit(1);
  }

  const outDir = opts.out;
  const lettersDir = path.join(outDir, "letters");
  fs.mkdirSync(lettersDir, { recursive: true });

  const manifest = [["uid", "letter_file", "mail_ready", "address", "city", "state", "zip", "county", "cause_nbr", "estimated_surplus", "status", "auction_date", "sale_type"]];
  const mergedParts = [];

  for (const lead of leads) {
    const letter = renderLetter(lead, cfg, letterDate, copy, cfg._demo);
    const fname = `${lead.uid}.html`;
    const fpath = path.join(lettersDir, fname);
    fs.writeFileSync(fpath, letter);
    const rel = path.relative(outDir, fpath).split(path.sep).join("/");
    manifest.push([
      lead.uid, rel, cfg._demo ? "false" : "true",
      lead.address, lead.city, lead.state, lead.zip, lead.county,
      lead.cause_nbr, lead.estimated_surplus, lead.status, lead.auction_date, lead.sale_type,
    ]);
    // Merged doc: add a page break before every letter except the first
    const merged = mergedParts.length === 0
      ? letter
      : letter.replace('<div class="page">', '<div class="page page-break">');
    mergedParts.push(merged);
  }

  const manifestPath = path.join(outDir, "manifest.csv");
  const csv = manifest.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  fs.writeFileSync(manifestPath, csv);

  let mergedPath = null;
  if (opts.merged) {
    mergedPath = path.join(lettersDir, "all-letters.html");
    fs.writeFileSync(mergedPath, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>All letters</title><style>@page{size:Letter;margin:0.9in 0.9in 1in 0.9in}body{font-family:Georgia,"Times New Roman",serif;color:#1a2430;font-size:12pt;line-height:1.5;margin:0;padding:0}.page{max-width:7in;margin:0 auto;page-break-after:always}.page-break{page-break-before:always}@media print{.demo-banner{display:none!important}}</style></head><body>${mergedParts.join("\n")}</body></html>`);
  }

  console.log(`\nGenerated ${leads.length} letter(s) from ${opts.input}`);
  console.log(`  per-lead HTML : ${path.join(lettersDir, "<uid>.html")}`);
  console.log(`  manifest CSV  : ${manifestPath}`);
  if (mergedPath) console.log(`  merged doc    : ${mergedPath}`);
  console.log(`  mail_ready    : ${cfg._demo ? "FALSE (DEMO — business config has placeholders)" : "true"}`);
  console.log(`  surplus sum   : $${fmtMoney(leads.reduce((s, l) => s + Number(l.estimated_surplus), 0))} across ${leads.length} candidate(s)\n`);
}

main();