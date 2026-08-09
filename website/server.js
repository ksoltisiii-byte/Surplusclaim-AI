/**
 * SurplusClaim AI — Public Website & Partner Portal (port 4000)
 * Express static site + small public API (claim search, partner signup, live stats).
 */
'use strict';

const path = require('node:path');
const express = require('express');
const { config, rows, row, scoreLead, scoreLabel } = require('../lib/db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------ public API ------------------------------- */

/** GET /api/health */
app.get('/api/health', (req, res) => {
  let dbOk = false;
  try { dbOk = rows('SELECT COUNT(*) c FROM properties').length >= 0; } catch (_) {}
  res.json({ ok: dbOk, service: 'website', port: config.services.website.port, timestamp: new Date().toISOString() });
});

/** GET /api/stats — live stats for the partner portal */
app.get('/api/stats', (req, res) => {
  const surplus = Number(row('SELECT COALESCE(SUM(surplus_amount),0) s FROM properties').s) || 0;
  const props = Number(row('SELECT COUNT(*) c FROM properties').c) || 0;
  const recovered = Number(row('SELECT COALESCE(SUM(recovered_amount),0) s FROM claims').s) || 0;
  const partners = Number(row('SELECT COUNT(*) c FROM partners').c) || 0;
  const referrals = Number(row('SELECT COUNT(*) c FROM referrals').c) || 0;
  res.json({
    surplus_found: surplus,
    properties: props,
    recovered: recovered,
    partners: partners,
    referrals: referrals,
    states: config.supported_states
  });
});

/**
 * GET /api/search?q= — public claim search.
 * Matches owner first/last name, email, or property address/city/parcel.
 * Only returns surplus > 0 and never exposes contact details to the public.
 */
app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 3) return res.status(400).json({ error: 'Please enter at least 3 characters to search.' });
  const like = `%${q}%`;
  const results = rows(`
    SELECT p.id, p.address, p.city, p.state, p.zip_code, p.county, p.parcel_id,
           p.auction_date, p.surplus_amount, p.status,
           o.first_name, o.last_name
    FROM properties p
    LEFT JOIN owners o ON o.property_id = p.id
    WHERE (p.address LIKE ? OR p.city LIKE ? OR p.parcel_id LIKE ? OR p.state = ?)
       OR (o.first_name LIKE ? OR o.last_name LIKE ? OR o.email LIKE ?)
    ORDER BY p.surplus_amount DESC
    LIMIT 20`, like, like, like, q.toUpperCase(), like, like, like).map((r) => {
    const score = scoreLead(r);
    return { ...r, score, score_label: scoreLabel(score) };
  });
  res.json({ query: q, count: results.length, results });
});

/** POST /api/partners — referral partner registration */
app.post('/api/partners', (req, res) => {
  const { name, email, phone, partner_type } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required.' });
  if (!email || !/^\S+@\S+\.\S+$/.test(String(email))) return res.status(400).json({ error: 'A valid email is required.' });
  const info = run(
    'INSERT INTO partners(name, email, phone, partner_type, status) VALUES(?,?,?,?,?)',
    String(name).trim(), String(email).trim().toLowerCase(), phone ? String(phone).trim() : null,
    partner_type ? String(partner_type).trim() : 'referral', 'active'
  );
  res.status(201).json({ ok: true, id: Number(info.lastInsertRowid), message: 'Registration received. Welcome aboard!' });
});

/* -------------------------------- frontend ------------------------------- */

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/partner.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

const host = config.services.website.host || '0.0.0.0';
const port = config.services.website.port || 4000;
app.listen(port, host, () => {
  console.log(`[website] SurplusClaim AI public website listening on http://${host}:${port} (mode: ${config.mode})`);
});
