/**
 * SurplusClaim AI — Operations Dashboard (port 3000)
 * Express API + static frontend. Reads live data from the shared SQLite DB.
 */
'use strict';

const path = require('node:path');
const express = require('express');
const { config, rows, row, run, scoreLead, scoreLabel } = require('../lib/db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FEE = config.contingency_fee_percent || 30;

/* ---------------------- outreach templates (copy of outreach/outreach.py TEMPLATES) -------- */

const OUTREACH_TEMPLATES = {
  initial: {
    channel: 'email',
    subject: 'Information about possible surplus funds',
    body: 'Hello {first_name},\n\nOur records indicate there may be surplus foreclosure funds associated with {address} in {state}. We can explain the public-record process and answer questions; recovery is not guaranteed. There is no fee unless funds are recovered.\n\nIf you do not want further messages, reply STOP.'
  },
  follow_up: {
    channel: 'email',
    subject: 'Following up about surplus funds',
    body: 'Hello {first_name},\n\nI’m following up regarding possible surplus funds connected to {address}. Please contact us only if you would like more information. There is no obligation and no fee unless funds are recovered. Reply STOP to opt out.'
  },
  final: {
    channel: 'email',
    subject: 'Last planned update about surplus funds',
    body: 'Hello {first_name},\n\nThis is our last planned message about possible surplus funds related to {address}. If you would like information, you may contact us; otherwise no action is needed. Reply STOP to opt out.'
  },
  sms: {
    channel: 'sms',
    subject: '',
    body: 'Hi {first_name}, possible surplus funds may be associated with {address}, {state}. No obligation and no fee unless recovered. Reply STOP to opt out.'
  }
};

function renderTemplate(template, lead) {
  const t = OUTREACH_TEMPLATES[template];
  const fill = (s) => s
    .replace(/\{first_name\}/g, lead.first_name || '')
    .replace(/\{address\}/g, lead.address || '')
    .replace(/\{state\}/g, lead.state || '');
  return { channel: t.channel, subject: fill(t.subject), body: fill(t.body) };
}

/* ------------------------------- API ------------------------------------ */

/** GET /api/health — used by start.sh and uptime checks */
app.get('/api/health', (req, res) => {
  let dbOk = false;
  try {
    dbOk = rows('SELECT COUNT(*) AS c FROM properties').length >= 0;
  } catch (_) { /* dbOk stays false */ }
  res.json({
    ok: dbOk,
    service: 'dashboard',
    port: config.services.dashboard.port,
    mode: config.mode,
    db: dbOk ? 'connected' : 'error',
    timestamp: new Date().toISOString()
  });
});

/** GET /api/summary — headline KPIs */
app.get('/api/summary', (req, res) => {
  const props = row(`
    SELECT COUNT(*) AS total,
           COALESCE(SUM(surplus_amount),0) AS surplus_total,
           ROUND(COALESCE(AVG(surplus_amount),0),0) AS surplus_avg
    FROM properties`);
  const owners = row(`SELECT COUNT(*) AS total, COALESCE(SUM(verified),0) AS verified FROM owners`);
  const eng = row(`SELECT COUNT(*) AS total, COALESCE(SUM(status='signed'),0) AS signed FROM engagements`);
  const claims = row(`
    SELECT COUNT(*) AS total,
           COALESCE(SUM(status <> 'draft'),0) AS filed,
           COALESCE(SUM(recovered_amount > 0),0) AS recovered,
           COALESCE(SUM(recovered_amount),0) AS recovered_amount
    FROM claims`);
  const pays = row(`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS paid_amount
                    FROM payments WHERE status='paid'`);

  const surplusTotal = Number(props.surplus_total) || 0;
  const recoveredAmount = Number(claims.recovered_amount) || 0;

  res.json({
    properties: {
      total: Number(props.total) || 0,
      surplus_total: surplusTotal,
      surplus_avg: Number(props.surplus_avg) || 0
    },
    owners: {
      total: Number(owners.total) || 0,
      verified: Number(owners.verified) || 0
    },
    engagements: {
      total: Number(eng.total) || 0,
      signed: Number(eng.signed) || 0
    },
    claims: {
      total: Number(claims.total) || 0,
      filed: Number(claims.filed) || 0,
      recovered: Number(claims.recovered) || 0,
      recovered_amount: recoveredAmount
    },
    payments: {
      total: Number(pays.total) || 0,
      paid_amount: Number(pays.paid_amount) || 0
    },
    projected_fee: surplusTotal * (FEE / 100),
    fees_earned: recoveredAmount * (FEE / 100),
    contingency_fee_percent: FEE
  });
});

/** GET /api/funnel — pipeline stage counts (Leads → Contacted → Engaged → Filed → Recovered) */
app.get('/api/funnel', (req, res) => {
  const leads = Number(row('SELECT COUNT(*) c FROM properties').c) || 0;
  const contacted = Number(row(`SELECT COUNT(DISTINCT owner_id) c FROM outreach_log WHERE direction='outbound'`).c) || 0;
  const engaged = Number(row('SELECT COUNT(*) c FROM engagements').c) || 0;
  const filed = Number(row(`SELECT COUNT(*) c FROM claims WHERE status <> 'draft'`).c) || 0;
  const recovered = Number(row(`SELECT COUNT(*) c FROM claims WHERE recovered_amount > 0`).c) || 0;

  res.json({
    stages: [
      { stage: 'Leads', key: 'leads', count: leads },
      { stage: 'Contacted', key: 'contacted', count: contacted },
      { stage: 'Engaged', key: 'engaged', count: engaged },
      { stage: 'Filed', key: 'filed', count: filed },
      { stage: 'Recovered', key: 'recovered', count: recovered }
    ]
  });
});

/** GET /api/states — surplus + property counts by state */
app.get('/api/states', (req, res) => {
  res.json(rows(`
    SELECT state,
           COUNT(*) AS properties,
           ROUND(COALESCE(SUM(surplus_amount),0),0) AS surplus_total
    FROM properties GROUP BY state ORDER BY surplus_total DESC`));
});

/** GET /api/leads — top leads (property + owner + score), ?limit= (default 10) */
app.get('/api/leads', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const leads = rows(`
    SELECT p.id AS property_id, p.address, p.city, p.state, p.zip_code, p.county,
           p.auction_date, p.sale_price, p.mortgage_balance, p.surplus_amount, p.status,
           o.id AS owner_id, o.first_name, o.last_name, o.email, o.phone, o.verified, o.opted_out
    FROM properties p
    LEFT JOIN owners o ON o.property_id = p.id
    WHERE p.surplus_amount > 0
    ORDER BY p.surplus_amount DESC
    LIMIT ?`, limit).map((l) => {
    const score = scoreLead(l);
    return { ...l, score, score_label: scoreLabel(score) };
  });
  res.json({ leads, limit });
});

/** GET /api/outreach — leads with contact status (from outreach_log) + templates.
 *  Powering the manual "copy-ready message" panel (no auto-send). */
app.get('/api/outreach', (req, res) => {
  const leads = rows(`
    SELECT p.id AS property_id, p.address, p.city, p.state, p.zip_code, p.county,
           p.auction_date, p.surplus_amount, p.status,
           o.id AS owner_id, o.first_name, o.last_name, o.email, o.phone,
           o.verified, o.opted_out, o.mailing_address
    FROM properties p
    JOIN owners o ON o.property_id = p.id
    WHERE p.surplus_amount > 0
    ORDER BY p.surplus_amount DESC`).map((l) => {
    const score = scoreLead(l);
    const contact = row(
      `SELECT channel, template, status, sent_at FROM outreach_log
       WHERE owner_id = ? AND direction = 'outbound' ORDER BY id DESC LIMIT 1`, l.owner_id);
    return {
      ...l,
      score, score_label: scoreLabel(score),
      contact_status: contact ? contact.status : 'not_contacted',
      last_channel: contact ? contact.channel : null,
      last_template: contact ? contact.template : null,
      last_sent_at: contact ? contact.sent_at : null
    };
  });
  res.json({ leads, templates: OUTREACH_TEMPLATES });
});

/** GET /api/outreach/preview?owner_id=&template= — server-rendered message */
app.get('/api/outreach/preview', (req, res) => {
  const ownerId = parseInt(req.query.owner_id, 10);
  const template = req.query.template;
  if (!ownerId || !OUTREACH_TEMPLATES[template]) {
    return res.status(400).json({ error: 'owner_id and template are required (initial|follow_up|final|sms)' });
  }
  const lead = row(`SELECT o.first_name, o.last_name, o.email, o.phone, p.address, p.state
                    FROM owners o JOIN properties p ON p.id = o.property_id WHERE o.id = ?`, ownerId);
  if (!lead) return res.status(404).json({ error: 'owner not found' });
  res.json(renderTemplate(template, lead));
});

/** POST /api/outreach/contacted — record a manual send so the funnel tracks it.
 *  Body: { owner_id, template, channel? } → writes outreach_log (status='sent'). */
app.post('/api/outreach/contacted', (req, res) => {
  const { owner_id, template, channel } = req.body || {};
  const oid = parseInt(owner_id, 10);
  if (!oid) return res.status(400).json({ error: 'owner_id is required' });
  const owner = row('SELECT opted_out FROM owners WHERE id = ?', oid);
  if (!owner) return res.status(404).json({ error: 'owner not found' });
  if (owner.opted_out) {
    return res.status(400).json({ error: 'owner has opted out — do not contact' });
  }
  const t = OUTREACH_TEMPLATES[template] || {};
  const chan = String(channel || t.channel || 'email').toLowerCase();
  const sentAt = new Date().toISOString();
  const info = run(
    `INSERT INTO outreach_log(owner_id, channel, direction, template, status, sent_at)
     VALUES(?,?,?,?,?,?)`,
    oid, chan, 'outbound', template || 'manual', 'sent', sentAt
  );
  res.status(201).json({
    id: Number(info.lastInsertRowid), owner_id: oid, channel: chan,
    template: template || 'manual', status: 'sent', sent_at: sentAt
  });
});

/** GET /api/revenue — fee projection + payment tracking summary */
app.get('/api/revenue', (req, res) => {
  const s = row(`
    SELECT COALESCE(SUM(surplus_amount),0) AS surplus_total FROM properties`);
  const r = row(`
    SELECT COALESCE(SUM(recovered_amount),0) AS recovered FROM claims`);
  const surplusTotal = Number(s.surplus_total) || 0;
  const recovered = Number(r.recovered) || 0;
  const conversion = config.revenue_model.pipeline_conversion_12mo || 0.25;
  const pipeline = Math.max(0, surplusTotal - recovered);
  const projectedFee = surplusTotal * (FEE / 100);
  const feesEarned = recovered * (FEE / 100);
  const projection12mo = feesEarned + pipeline * (FEE / 100) * conversion;

  res.json({
    contingency_fee_percent: FEE,
    surplus_total: surplusTotal,
    recovered_amount: recovered,
    pipeline_remaining: pipeline,
    projected_fee: projectedFee,
    fees_earned: feesEarned,
    projection_12mo: Math.round(projection12mo),
    model: { pipeline_conversion_12mo: conversion }
  });
});

/** GET /api/payments — payment tracker (payments joined to claims/properties/owners) */
app.get('/api/payments', (req, res) => {
  res.json(rows(`
    SELECT pay.id AS payment_id, pay.amount, pay.payment_type, pay.status, pay.paid_at, pay.created_at,
           c.claim_number, c.recovered_amount AS claim_recovered,
           p.address, p.city, p.state, p.surplus_amount,
           o.first_name, o.last_name
    FROM payments pay
    JOIN claims c ON c.id = pay.claim_id
    JOIN properties p ON p.id = c.property_id
    JOIN owners o ON o.id = c.owner_id
    ORDER BY COALESCE(pay.paid_at, pay.created_at) DESC`));
});

/* ------------------------------ frontend --------------------------------- */

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const host = config.services.dashboard.host || '0.0.0.0';
const port = config.services.dashboard.port || 3000;
app.listen(port, host, () => {
  console.log(`[dashboard] SurplusClaim AI dashboard listening on http://${host}:${port} (mode: ${config.mode})`);
});
