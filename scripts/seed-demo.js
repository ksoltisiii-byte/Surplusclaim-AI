#!/usr/bin/env node
/**
 * Seed canonical demo workflow data (idempotent, safe to run repeatedly).
 * - Ensures the schema + demo properties/owners exist (via the Python pipeline if needed).
 * - Seeds outreach_log, engagements, claims, payments, partners, referrals ONLY if
 *   the target table is empty, so it never duplicates or clobbers real work.
 *
 * Usage: node scripts/seed-demo.js
 */
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { db, rows, run, close, config } = require('../lib/db');

const ROOT = path.resolve(__dirname, '..');
const FEE = config.contingency_fee_percent || 30;

function ensureProperties() {
  const c = Number(rows('SELECT COUNT(*) c FROM properties')[0].c) || 0;
  if (c > 0) return console.log(`[seed] properties: ${c} existing records (skipping pipeline seed)`);
  console.log('[seed] properties empty — running python pipeline seed…');
  try {
    const out = execFileSync('python3', [path.join(ROOT, 'data-pipeline', 'pipeline.py')], { encoding: 'utf8' });
    console.log('[seed]', out.trim());
  } catch (err) {
    console.error('[seed] python pipeline failed:', err.message);
    console.error('[seed] cannot continue without properties/owners.');
    process.exit(1);
  }
}

function seedTable(name, sql, params = []) {
  const c = Number(rows(`SELECT COUNT(*) c FROM ${name}`)[0].c) || 0;
  if (c > 0) return console.log(`[seed] ${name}: ${c} existing (skipping)`);
  run(sql, ...params);
  const n = Number(rows(`SELECT COUNT(*) c FROM ${name}`)[0].c) || 0;
  console.log(`[seed] ${name}: inserted ${n}`);
}

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

ensureProperties();
const owners = rows('SELECT id, property_id FROM owners ORDER BY id');
if (owners.length === 0) {
  console.error('[seed] No owners found; aborting.');
  process.exit(1);
}
const [o1, o2, o3] = [owners[0], owners[1], owners[2] || owners[0]];

// outreach_log — one delivered email per owner (populates "Contacted" stage)
seedTable('outreach_log', `
  INSERT INTO outreach_log(owner_id, channel, direction, template, message_id, status, sent_at)
  VALUES (?, 'email', 'outbound', 'surplus-notice', 'demo-msg-001', 'delivered', ?),
         (?, 'email', 'outbound', 'surplus-notice', 'demo-msg-002', 'delivered', ?),
         (?, 'email', 'outbound', 'surplus-notice', 'demo-msg-003', 'delivered', ?)`,
  [o1.id, daysAgo(20), o2.id, daysAgo(25), o3.id, daysAgo(30)]);

// engagements — two signed, one pending
seedTable('engagements', `
  INSERT INTO engagements(owner_id, fee_percent, status, signed_at, document_url)
  VALUES (?, ?, 'signed', ?, '/signatures/demo-eng-1.png'),
         (?, ?, 'signed', ?, '/signatures/demo-eng-2.png'),
         (?, ?, 'pending', NULL, NULL)`,
  [o1.id, FEE, daysAgo(14), o2.id, FEE, daysAgo(10), o3.id, FEE]);

// claims — one recovered, one filed, one draft
seedTable('claims', `
  INSERT INTO claims(property_id, owner_id, claim_number, state, status, filed_at, recovered_amount)
  VALUES (?, ?, 'SCA-CA-2026-0001', 'CA', 'recovered', ?, 45000),
         (?, ?, 'SCA-FL-2026-0002', 'FL', 'filed', ?, 0),
         (?, ?, 'SCA-TX-2026-0003', 'TX', 'draft', NULL, 0)`,
  [o1.property_id, o1.id, daysAgo(30), o2.property_id, o2.id, daysAgo(6), o3.property_id, o3.id]);

// payments — paid recovery + pending installment
const claim1 = rows('SELECT id FROM claims WHERE claim_number = ?', 'SCA-CA-2026-0001')[0];
const claim2 = rows('SELECT id FROM claims WHERE claim_number = ?', 'SCA-FL-2026-0002')[0];
seedTable('payments', `
  INSERT INTO payments(claim_id, amount, payment_type, status, paid_at)
  VALUES (?, 45000, 'recovery', 'paid', ?),
         (?, 14000, 'recovery', 'pending', NULL)`,
  [claim1.id, daysAgo(3), claim2.id]);

// partners + referrals
seedTable('partners', `
  INSERT INTO partners(name, email, phone, partner_type, status)
  VALUES ('Harbor Realty Group', 'realtor@harborrealty.example', '(555) 201-8890', 'real-estate', 'active'),
         ('Community Legal Aid', 'intake@communitylegalaid.example', '(555) 204-1177', 'attorney', 'active')`);
const p1 = rows('SELECT id FROM partners WHERE name = ?', 'Harbor Realty Group')[0];
const p2 = rows('SELECT id FROM partners WHERE name = ?', 'Community Legal Aid')[0];
seedTable('referrals', `
  INSERT INTO referrals(partner_id, owner_id, property_id, status, notes)
  VALUES (?, ?, ?, 'converted', 'Demo referral — owner engaged'),
         (?, NULL, NULL, 'received', 'Demo referral — pending owner contact')`,
  [p1.id, o1.id, o1.property_id, p2.id]);

console.log('[seed] done.');
close();
