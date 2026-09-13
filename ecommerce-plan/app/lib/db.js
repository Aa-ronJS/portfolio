'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { itemsFor } = require('./contents');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'kits.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  abn TEXT, contact_name TEXT, email TEXT, phone TEXT, address TEXT, industry TEXT,
  plan_billing TEXT DEFAULT 'annual',
  plan_start TEXT, plan_renewal TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kits (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,            -- site | vehicle
  modules TEXT DEFAULT '',       -- comma list: burns,eye,remote,outdoor
  location TEXT,                 -- "Workshop, near roller door" or "Ute ABC-123"
  installed_at TEXT NOT NULL,
  last_refill_at TEXT,
  next_refill_at TEXT,
  last_check_at TEXT,
  status TEXT DEFAULT 'active',  -- active | retired
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kit_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kit_id TEXT NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty_required INTEGER NOT NULL,
  qty_present INTEGER NOT NULL,
  expires_at TEXT                -- YYYY-MM-DD or NULL
);
CREATE TABLE IF NOT EXISTS aeds (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location TEXT, make_model TEXT, serial TEXT,
  pads_expiry TEXT, battery_expiry TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS refill_requests (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,            -- after_use | scheduled | problem
  items TEXT,                    -- JSON [{name, qty}]
  note TEXT, reporter TEXT,
  status TEXT DEFAULT 'open',    -- open | shipped | closed
  tracking TEXT,
  created_at TEXT NOT NULL, shipped_at TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  kit_id TEXT,
  type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ev_customer ON events(customer_id, created_at);
CREATE INDEX IF NOT EXISTS ki_kit ON kit_items(kit_id);
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT,                     -- whs_consultant | bookkeeper | association | trainer | broker | other
  contact_name TEXT, email TEXT, phone TEXT,
  fee_share REAL DEFAULT 0.15,   -- share of first-year plan revenue per referred account
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS partner_payouts (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'owed',    -- owed | paid
  created_at TEXT NOT NULL, paid_at TEXT
);
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business TEXT, contact_name TEXT, email TEXT, phone TEXT, industry TEXT,
  score INTEGER, answers TEXT,   -- JSON of the self-check answers
  partner_id TEXT, source TEXT DEFAULT 'check',
  status TEXT DEFAULT 'new',     -- new | contacted | won | lost
  created_at TEXT NOT NULL
);
`);

// ---------- migrations (additive columns; safe to rerun) ----------
function addColumn(table, col, decl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
}
addColumn('customers', 'source', "TEXT DEFAULT 'direct'");      // direct | paid | partner | referral | seo | check | other
addColumn('customers', 'partner_id', 'TEXT');
addColumn('customers', 'referred_by', 'TEXT');                   // customer id
addColumn('customers', 'status', "TEXT DEFAULT 'active'");       // active | past_due | cancelled
addColumn('customers', 'cancelled_at', 'TEXT');
addColumn('customers', 'cancel_reason', 'TEXT');
addColumn('customers', 'stripe_customer_id', 'TEXT');
addColumn('customers', 'stripe_subscription_id', 'TEXT');

// ---------- helpers ----------
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I
function code(len = 8) {
  const b = crypto.randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return s;
}
const id = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
function addMonths(iso, months) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const REFILL_MONTHS = parseInt(process.env.REFILL_MONTHS || '6', 10);

// ---------- customers ----------
function createCustomer(c) {
  const rec = {
    id: id(), token: code(16), name: c.name.trim(),
    abn: c.abn || null, contact_name: c.contact_name || null, email: c.email || null,
    phone: c.phone || null, address: c.address || null, industry: c.industry || null,
    plan_billing: c.plan_billing || 'annual',
    plan_start: c.plan_start || today(),
    plan_renewal: c.plan_renewal || addMonths(c.plan_start || today(), c.plan_billing === 'monthly' ? 1 : 12),
    notes: c.notes || null, created_at: now(),
    source: c.source || 'direct', partner_id: c.partner_id || null, referred_by: c.referred_by || null,
  };
  db.prepare(`INSERT INTO customers (id,token,name,abn,contact_name,email,phone,address,industry,plan_billing,plan_start,plan_renewal,notes,created_at,source,partner_id,referred_by)
    VALUES (@id,@token,@name,@abn,@contact_name,@email,@phone,@address,@industry,@plan_billing,@plan_start,@plan_renewal,@notes,@created_at,@source,@partner_id,@referred_by)`).run(rec);
  logEvent(rec.id, null, 'customer_created', { name: rec.name, source: rec.source });
  if (rec.referred_by) logEvent(rec.referred_by, null, 'referral_made', { referred: rec.name, referred_id: rec.id });
  return rec;
}
const SITE_PLAN_PY = 144, VEHICLE_PLAN_PY = 84;
function recordPartnerPayout(customer, siteKits, vehicleKits) {
  if (!customer.partner_id) return null;
  const p = getPartner(customer.partner_id);
  if (!p) return null;
  const amount = Math.round((siteKits * SITE_PLAN_PY + vehicleKits * VEHICLE_PLAN_PY) * p.fee_share * 100) / 100;
  if (amount <= 0) return null;
  const rec = { id: id(), partner_id: p.id, customer_id: customer.id, amount, status: 'owed', created_at: now() };
  db.prepare('INSERT INTO partner_payouts (id,partner_id,customer_id,amount,status,created_at) VALUES (@id,@partner_id,@customer_id,@amount,@status,@created_at)').run(rec);
  logEvent(customer.id, null, 'partner_payout_recorded', { partner: p.name, amount });
  return rec;
}
function cancelCustomer(cid, reason) {
  db.prepare("UPDATE customers SET status='cancelled', cancelled_at=?, cancel_reason=? WHERE id=?").run(now(), reason || null, cid);
  logEvent(cid, null, 'plan_cancelled', { reason });
}
function setBillingStatus(cid, status, extra = {}) {
  const sets = ['status = @status']; const params = { id: cid, status };
  for (const k of ['plan_renewal', 'stripe_customer_id', 'stripe_subscription_id']) if (extra[k]) { sets.push(`${k} = @${k}`); params[k] = extra[k]; }
  db.prepare(`UPDATE customers SET ${sets.join(', ')} WHERE id = @id`).run(params);
}
const getCustomerByStripe = (sid) => db.prepare('SELECT * FROM customers WHERE stripe_customer_id = ?').get(sid);
const getCustomerByEmail = (e) => e ? db.prepare('SELECT * FROM customers WHERE lower(email) = lower(?) ORDER BY created_at DESC').get(e) : null;

// ---------- partners ----------
function createPartner(p) {
  const rec = { id: id(), token: code(12), name: p.name.trim(), type: p.type || 'other', contact_name: p.contact_name || null,
    email: p.email || null, phone: p.phone || null, fee_share: parseFloat(p.fee_share || '0.15') || 0.15, status: 'active', notes: p.notes || null, created_at: now() };
  db.prepare('INSERT INTO partners (id,token,name,type,contact_name,email,phone,fee_share,status,notes,created_at) VALUES (@id,@token,@name,@type,@contact_name,@email,@phone,@fee_share,@status,@notes,@created_at)').run(rec);
  return rec;
}
const getPartner = (pid) => db.prepare('SELECT * FROM partners WHERE id = ?').get(pid);
const getPartnerByToken = (t) => db.prepare('SELECT * FROM partners WHERE token = ?').get(t);
const listPartners = () => db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM customers c WHERE c.partner_id = p.id) AS referred,
  (SELECT COALESCE(SUM(amount),0) FROM partner_payouts x WHERE x.partner_id = p.id AND x.status='owed') AS owed,
  (SELECT COALESCE(SUM(amount),0) FROM partner_payouts x WHERE x.partner_id = p.id AND x.status='paid') AS paid FROM partners p ORDER BY p.name`).all();
const listPartnerCustomers = (pid) => db.prepare('SELECT * FROM customers WHERE partner_id = ? ORDER BY created_at DESC').all(pid);
const listPartnerPayouts = (pid) => db.prepare('SELECT x.*, c.name AS customer_name FROM partner_payouts x JOIN customers c ON c.id = x.customer_id WHERE x.partner_id = ? ORDER BY x.created_at DESC').all(pid);
function markPayoutPaid(pid) { db.prepare("UPDATE partner_payouts SET status='paid', paid_at=? WHERE id=?").run(now(), pid); }

// ---------- leads ----------
function createLead(l) {
  const rec = { id: id(), business: l.business || null, contact_name: l.contact_name || null, email: l.email || null, phone: l.phone || null,
    industry: l.industry || null, score: l.score ?? null, answers: JSON.stringify(l.answers || {}), partner_id: l.partner_id || null,
    source: l.source || 'check', status: 'new', created_at: now() };
  db.prepare('INSERT INTO leads (id,business,contact_name,email,phone,industry,score,answers,partner_id,source,status,created_at) VALUES (@id,@business,@contact_name,@email,@phone,@industry,@score,@answers,@partner_id,@source,@status,@created_at)').run(rec);
  return rec;
}
const listLeads = () => db.prepare('SELECT l.*, p.name AS partner_name FROM leads l LEFT JOIN partners p ON p.id = l.partner_id ORDER BY l.created_at DESC LIMIT 500').all();
function setLeadStatus(lid, status) { db.prepare('UPDATE leads SET status=? WHERE id=?').run(status, lid); }
const getCustomer = (cid) => db.prepare('SELECT * FROM customers WHERE id = ?').get(cid);
const getCustomerByToken = (t) => db.prepare('SELECT * FROM customers WHERE token = ?').get(t);
const listCustomers = () => db.prepare('SELECT * FROM customers ORDER BY name').all();
function updateCustomer(cid, fields) {
  const allowed = ['name', 'abn', 'contact_name', 'email', 'phone', 'address', 'industry', 'plan_billing', 'plan_start', 'plan_renewal', 'notes', 'source', 'partner_id', 'referred_by', 'stripe_customer_id'];
  const sets = [];
  const params = { id: cid };
  for (const k of allowed) if (k in fields) { sets.push(`${k} = @${k}`); params[k] = fields[k] || null; }
  if (!sets.length) return;
  db.prepare(`UPDATE customers SET ${sets.join(', ')} WHERE id = @id`).run(params);
}

// ---------- kits ----------
function createKit(k) {
  const modules = (k.modules || []).filter(Boolean);
  const installed = k.installed_at || today();
  const rec = {
    id: id(), code: code(8), customer_id: k.customer_id, type: k.type === 'vehicle' ? 'vehicle' : 'site',
    modules: modules.join(','), location: k.location || null, installed_at: installed,
    last_refill_at: installed, next_refill_at: addMonths(installed, REFILL_MONTHS),
    last_check_at: installed, status: 'active', created_at: now(),
  };
  db.prepare(`INSERT INTO kits (id,code,customer_id,type,modules,location,installed_at,last_refill_at,next_refill_at,last_check_at,status,created_at)
    VALUES (@id,@code,@customer_id,@type,@modules,@location,@installed_at,@last_refill_at,@next_refill_at,@last_check_at,@status,@created_at)`).run(rec);
  seedItems(rec.id, rec.type, modules, installed);
  logEvent(rec.customer_id, rec.id, 'kit_registered', { code: rec.code, type: rec.type, location: rec.location });
  return rec;
}
function seedItems(kitId, type, modules, fromDate) {
  db.prepare('DELETE FROM kit_items WHERE kit_id = ?').run(kitId);
  const ins = db.prepare('INSERT INTO kit_items (kit_id,name,qty_required,qty_present,expires_at) VALUES (?,?,?,?,?)');
  for (const it of itemsFor(type, modules)) {
    ins.run(kitId, it.name, it.qty, it.qty, it.shelf ? addMonths(fromDate, it.shelf) : null);
  }
}
const getKit = (kid) => db.prepare('SELECT * FROM kits WHERE id = ?').get(kid);
const getKitByCode = (c) => db.prepare('SELECT * FROM kits WHERE code = ?').get(c);
const listKits = (cid) => db.prepare('SELECT * FROM kits WHERE customer_id = ? ORDER BY type, location').all(cid);
const listAllKits = () => db.prepare(`SELECT k.*, c.name AS customer_name FROM kits k JOIN customers c ON c.id = k.customer_id WHERE k.status='active' ORDER BY c.name, k.type, k.location`).all();
const listItems = (kid) => db.prepare('SELECT * FROM kit_items WHERE kit_id = ? ORDER BY id').all(kid);
function updateKit(kid, fields) {
  const allowed = ['location', 'status', 'next_refill_at', 'last_check_at'];
  const sets = []; const params = { id: kid };
  for (const k of allowed) if (k in fields) { sets.push(`${k} = @${k}`); params[k] = fields[k] || null; }
  if (sets.length) db.prepare(`UPDATE kits SET ${sets.join(', ')} WHERE id = @id`).run(params);
}
function setItem(itemId, qtyPresent, expiresAt) {
  db.prepare('UPDATE kit_items SET qty_present = ?, expires_at = ? WHERE id = ?').run(qtyPresent, expiresAt || null, itemId);
}

// ---------- after-use, checks, refills ----------
function recordUse(kit, used, note, reporter) {
  // used: [{id, name, qty}] from the scan page
  const upd = db.prepare('UPDATE kit_items SET qty_present = MAX(0, qty_present - ?) WHERE id = ? AND kit_id = ?');
  const items = [];
  for (const u of used) {
    upd.run(u.qty, u.id, kit.id);
    items.push({ name: u.name, qty: u.qty });
  }
  const req = {
    id: id(), kit_id: kit.id, kind: 'after_use', items: JSON.stringify(items),
    note: note || null, reporter: reporter || null, status: 'open', created_at: now(),
  };
  db.prepare('INSERT INTO refill_requests (id,kit_id,kind,items,note,reporter,status,created_at) VALUES (@id,@kit_id,@kind,@items,@note,@reporter,@status,@created_at)').run(req);
  db.prepare('UPDATE kits SET last_check_at = ? WHERE id = ?').run(today(), kit.id);
  logEvent(kit.customer_id, kit.id, 'after_use_reported', { items, note, reporter, request_id: req.id });
  return req;
}
function recordCheckOk(kit, reporter) {
  db.prepare('UPDATE kits SET last_check_at = ? WHERE id = ?').run(today(), kit.id);
  logEvent(kit.customer_id, kit.id, 'check_ok', { reporter });
}
function recordProblem(kit, note, reporter) {
  const req = { id: id(), kit_id: kit.id, kind: 'problem', items: '[]', note, reporter: reporter || null, status: 'open', created_at: now() };
  db.prepare('INSERT INTO refill_requests (id,kit_id,kind,items,note,reporter,status,created_at) VALUES (@id,@kit_id,@kind,@items,@note,@reporter,@status,@created_at)').run(req);
  logEvent(kit.customer_id, kit.id, 'problem_reported', { note, reporter, request_id: req.id });
  return req;
}
function shipRequest(reqId, tracking) {
  const req = db.prepare('SELECT * FROM refill_requests WHERE id = ?').get(reqId);
  if (!req) return null;
  db.prepare("UPDATE refill_requests SET status='shipped', tracking=?, shipped_at=? WHERE id = ?").run(tracking || null, now(), reqId);
  const kit = getKit(req.kit_id);
  // restore quantities for the items that were used
  const items = JSON.parse(req.items || '[]');
  const upd = db.prepare('UPDATE kit_items SET qty_present = qty_required WHERE kit_id = ? AND name = ?');
  for (const it of items) upd.run(kit.id, it.name);
  logEvent(kit.customer_id, kit.id, 'refill_shipped', { kind: req.kind, items, tracking, request_id: reqId });
  return req;
}
function scheduledRefillShipped(kit, tracking) {
  // a scheduled refill pack replaces everything with a shelf life and tops up quantities
  const t = today();
  const items = listItems(kit.id);
  const upd = db.prepare('UPDATE kit_items SET qty_present = qty_required, expires_at = ? WHERE id = ?');
  const fresh = itemsFor(kit.type, kit.modules ? kit.modules.split(',') : []);
  const shelf = new Map(fresh.map((f) => [f.name, f.shelf]));
  for (const it of items) upd.run(shelf.get(it.name) ? addMonths(t, shelf.get(it.name)) : null, it.id);
  db.prepare('UPDATE kits SET last_refill_at = ?, next_refill_at = ?, last_check_at = ? WHERE id = ?')
    .run(t, addMonths(t, REFILL_MONTHS), t, kit.id);
  logEvent(kit.customer_id, kit.id, 'scheduled_refill_shipped', { tracking });
}
const listOpenRequests = () => db.prepare(`SELECT r.*, k.code, k.type, k.location, c.name AS customer_name, c.id AS customer_id
  FROM refill_requests r JOIN kits k ON k.id = r.kit_id JOIN customers c ON c.id = k.customer_id
  WHERE r.status = 'open' ORDER BY r.created_at`).all();
const listRequestsForKit = (kid) => db.prepare('SELECT * FROM refill_requests WHERE kit_id = ? ORDER BY created_at DESC').all(kid);

// ---------- AEDs ----------
function createAed(a) {
  const rec = { id: id(), customer_id: a.customer_id, location: a.location || null, make_model: a.make_model || null,
    serial: a.serial || null, pads_expiry: a.pads_expiry || null, battery_expiry: a.battery_expiry || null, created_at: now() };
  db.prepare('INSERT INTO aeds (id,customer_id,location,make_model,serial,pads_expiry,battery_expiry,created_at) VALUES (@id,@customer_id,@location,@make_model,@serial,@pads_expiry,@battery_expiry,@created_at)').run(rec);
  logEvent(rec.customer_id, null, 'aed_registered', { location: rec.location, make_model: rec.make_model });
  return rec;
}
const listAeds = (cid) => db.prepare('SELECT * FROM aeds WHERE customer_id = ? ORDER BY location').all(cid);
const listAllAeds = () => db.prepare('SELECT a.*, c.name AS customer_name FROM aeds a JOIN customers c ON c.id = a.customer_id').all();
function updateAed(aid, fields) {
  const allowed = ['location', 'make_model', 'serial', 'pads_expiry', 'battery_expiry'];
  const sets = []; const params = { id: aid };
  for (const k of allowed) if (k in fields) { sets.push(`${k} = @${k}`); params[k] = fields[k] || null; }
  if (sets.length) db.prepare(`UPDATE aeds SET ${sets.join(', ')} WHERE id = @id`).run(params);
  const a = db.prepare('SELECT * FROM aeds WHERE id = ?').get(aid);
  if (a) logEvent(a.customer_id, null, 'aed_updated', fields);
}

// ---------- events ----------
function logEvent(customerId, kitId, type, payload) {
  db.prepare('INSERT INTO events (customer_id,kit_id,type,payload,created_at) VALUES (?,?,?,?,?)')
    .run(customerId, kitId, type, JSON.stringify(payload || {}), now());
}
const listEvents = (cid, limit = 200) => db.prepare('SELECT * FROM events WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?').all(cid, limit);
const listKitEvents = (kid) => db.prepare('SELECT * FROM events WHERE kit_id = ? ORDER BY created_at DESC LIMIT 100').all(kid);

module.exports = {
  db, today, now, addMonths, addDays, REFILL_MONTHS,
  createCustomer, getCustomer, getCustomerByToken, listCustomers, updateCustomer,
  createKit, getKit, getKitByCode, listKits, listAllKits, listItems, updateKit, setItem, seedItems,
  recordUse, recordCheckOk, recordProblem, shipRequest, scheduledRefillShipped, listOpenRequests, listRequestsForKit,
  createAed, listAeds, listAllAeds, updateAed,
  logEvent, listEvents, listKitEvents,
  recordPartnerPayout, cancelCustomer, setBillingStatus, getCustomerByStripe, getCustomerByEmail,
  createPartner, getPartner, getPartnerByToken, listPartners, listPartnerCustomers, listPartnerPayouts, markPayoutPaid,
  createLead, listLeads, setLeadStatus, SITE_PLAN_PY, VEHICLE_PLAN_PY,
};
