/**
 * SurplusClaim AI — Operations Dashboard (port 3000)
 * Express API + static frontend. Reads live data from the shared SQLite DB.
 */
'use strict';

const path = require('node:path');
const express = require('express');
const { config, rows, row, scoreLead, scoreLabel } = require('../lib/db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FEE = config.contingency_fee_percent || 30;

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

/** GET /api/funnel — pipeline stage counts */
app.get('/api/funnel', (req, res) => {
  const identified = Number(row('SELECT COUNT(*) c FROM properties').c) || 0;
  const contacted = Number(row(`SELECT COUNT(DISTINCT owner_id) c FROM outreach_log WHERE direction='outbound'`).c) || 0;
  const engaged = Number(row('SELECT COUNT(*) c FROM engagements').c) || 0;
  const signed = Number(row(`SELECT COUNT(*) c FROM engagements WHERE status='signed'`).c) || 0;
  const filed = Number(row(`SELECT COUNT(*) c FROM claims WHERE status <> 'draft'`).c) || 0;
  const recovered = Number(row(`SELECT COUNT(*) c FROM claims WHERE recovered_amount > 0`).c) || 0;

  res.json({
    stages: [
      { stage: 'Identified', key: 'identified', count: identified },
      { stage: 'Contacted', key: 'contacted', count: contacted },
      { stage: 'Engaged', key: 'engaged', count: engaged },
      { stage: 'Signed', key: 'signed', count: signed },
      { stage: 'Claims Filed', key: 'filed', count: filed },
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
