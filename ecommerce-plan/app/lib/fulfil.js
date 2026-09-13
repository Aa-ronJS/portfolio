'use strict';
// Fulfilment and stock. A shipment is created for every kit order, after-use
// refill, scheduled refill pack and AED consumable, then handed to whoever
// packs it:
//
//   FULFIL_WEBHOOK=https://...     a 3PL's order endpoint, or an n8n flow that
//                                  turns the JSON into the 3PL's CSV or portal
//   FULFIL_WEBHOOK_KEY=...         sent as Authorization: Bearer
//   FULFIL_WEBHOOK_SECRET=...      what the 3PL must send back on /webhooks/fulfilment
//
// Without FULFIL_WEBHOOK the shipment stays "pending" and appears on the
// admin due list for you to pack; the register behaves identically either way.
// Stock is decremented when a shipment ships and topped up when a purchase
// order is received; the autopilot raises purchase orders at the reorder point.
const db = require('./db');

const SKU = {
  site: { sku: 'KIT-SITE', name: 'Site first-aid kit (Code of Practice)', unit_cost: 58, reorder_point: 5, reorder_qty: 20 },
  vehicle: { sku: 'KIT-VEH', name: 'Vehicle first-aid kit', unit_cost: 32, reorder_point: 8, reorder_qty: 30 },
  pack_site: { sku: 'PACK-SITE', name: 'Scheduled refill pack, site kit', unit_cost: 11, reorder_point: 10, reorder_qty: 40 },
  pack_vehicle: { sku: 'PACK-VEH', name: 'Scheduled refill pack, vehicle kit', unit_cost: 7, reorder_point: 15, reorder_qty: 60 },
  aed_pads: { sku: 'AED-PADS', name: 'AED electrode pads (model-specific, see line)', unit_cost: 90, reorder_point: 1, reorder_qty: 2 },
  aed_battery: { sku: 'AED-BATT', name: 'AED battery (model-specific, see line)', unit_cost: 250, reorder_point: 0, reorder_qty: 1 },
};
const itemSku = (name) => 'ITEM-' + name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function seedStock(opening = {}) {
  for (const k of Object.keys(SKU)) if (!db.getStock(SKU[k].sku)) db.upsertStock({ ...SKU[k], on_hand: opening[SKU[k].sku] || 0 });
}

const cfg = () => ({ url: process.env.FULFIL_WEBHOOK || '', key: process.env.FULFIL_WEBHOOK_KEY || '', secret: process.env.FULFIL_WEBHOOK_SECRET || '' });

// Hand a pending shipment to the 3PL. Returns the updated row.
async function dispatch(shipment, baseUrl) {
  const c = cfg();
  if (!c.url) return shipment; // you pack it
  const customer = db.getCustomer(shipment.customer_id);
  const payload = {
    order_ref: shipment.id, kind: shipment.kind,
    recipient: { name: shipment.recipient || customer.contact_name || customer.name, company: customer.name, email: customer.email, phone: customer.phone, address: shipment.address || customer.address },
    lines: JSON.parse(shipment.lines),
    note: shipment.kind === 'kits' ? 'Apply the pre-printed QR label for each kit code listed in the lines.' : '',
    callback: `${baseUrl}/webhooks/fulfilment`,
  };
  try {
    const res = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(c.key ? { Authorization: `Bearer ${c.key}` } : {}) }, body: JSON.stringify(payload) });
    const body = await res.text();
    if (!res.ok) return db.setShipmentStatus(shipment.id, 'failed', { error: `${res.status} ${body.slice(0, 200)}` });
    let ext = null; try { ext = JSON.parse(body).id || JSON.parse(body).order_id || null; } catch { /* no id returned; we key on order_ref */ }
    return db.setShipmentStatus(shipment.id, 'sent_to_3pl', { external_id: ext });
  } catch (e) {
    return db.setShipmentStatus(shipment.id, 'failed', { error: e.message });
  }
}

// The 3PL (or you) says it shipped. Updates the register the same way the
// admin "Shipped" buttons do, and decrements stock. Idempotent.
function markShipped(shipmentId, { tracking, carrier } = {}) {
  const s = db.getShipment(shipmentId);
  if (!s) return null;
  if (s.status === 'shipped') return s;
  const kit = s.kit_id ? db.getKit(s.kit_id) : null;
  if (s.kind === 'after_use' && s.request_id) db.shipRequest(s.request_id, tracking);
  else if (s.kind === 'scheduled' && kit) db.scheduledRefillShipped(kit, tracking);
  else if (s.kind === 'aed' && s.aed_id) {
    const a = db.db.prepare('SELECT * FROM aeds WHERE id = ?').get(s.aed_id);
    const lines = JSON.parse(s.lines);
    const fields = {};
    if (lines.some((l) => l.sku === SKU.aed_pads.sku)) fields.pads_expiry = db.addMonths(db.today(), 24);
    if (lines.some((l) => l.sku === SKU.aed_battery.sku)) fields.battery_expiry = db.addMonths(db.today(), 48);
    if (a && Object.keys(fields).length) db.updateAed(a.id, fields);
  } else if (s.kind === 'kits') db.logEvent(s.customer_id, null, 'kits_shipped', { tracking, lines: JSON.parse(s.lines).length });
  for (const l of JSON.parse(s.lines)) db.adjustStock(l.sku, -l.qty, { name: l.name, reorder_point: l.sku.startsWith('ITEM-') ? 10 : 0, reorder_qty: l.sku.startsWith('ITEM-') ? 50 : 0, unit_cost: l.unit_cost || 0 });
  return db.setShipmentStatus(shipmentId, 'shipped', { tracking, carrier });
}

// Build shipments for everything that should leave today. Idempotent: one
// shipment per request, one scheduled pack per kit per refill cycle, one AED
// line per consumable per expiry.
function planShipments(on = db.today()) {
  const sched = require('./schedule');
  const created = [];
  // 1. kit orders that have not shipped (new accounts from checkout)
  for (const c of db.listCustomers()) {
    if (c.status === 'cancelled') continue;
    const kits = db.listKits(c.id).filter((k) => k.status === 'active');
    const unshipped = kits.filter((k) => !db.shipmentExistsFor('kit_id', k.id));
    if (!unshipped.length || !db.eventsOfType(c.id, 'checkout_completed').length) continue;
    const lines = unshipped.map((k) => ({ sku: SKU[k.type].sku, name: SKU[k.type].name, qty: 1, kit_code: k.code, unit_cost: SKU[k.type].unit_cost }));
    const first = unshipped[0];
    const s = db.createShipment({ customer_id: c.id, kit_id: first.id, kind: 'kits', lines, recipient: c.contact_name, address: c.address });
    // record every kit as covered by this shipment
    for (const k of unshipped.slice(1)) db.createShipment({ customer_id: c.id, kit_id: k.id, kind: 'kits', lines: [], recipient: c.contact_name, address: c.address });
    for (const k of unshipped.slice(1)) db.setShipmentStatus(db.db.prepare('SELECT id FROM shipments WHERE kit_id = ? ORDER BY created_at DESC').get(k.id).id, 'shipped', { tracking: 'with ' + s.id });
    created.push(s);
  }
  const report = sched.dueReport(on);
  // 2. after-use and problem requests
  for (const q of report.open) {
    if (db.shipmentExistsFor('request_id', q.id)) continue;
    const c = db.getCustomer(q.customer_id);
    const items = JSON.parse(q.items || '[]');
    const lines = items.length ? items.map((i) => ({ sku: itemSku(i.name), name: i.name, qty: i.qty })) : [{ sku: q.type === 'vehicle' ? SKU.pack_vehicle.sku : SKU.pack_site.sku, name: 'Replacement pack (problem reported)', qty: 1 }];
    created.push(db.createShipment({ customer_id: c.id, kit_id: q.kit_id, request_id: q.id, kind: 'after_use', lines, recipient: c.contact_name, address: c.address }));
  }
  // 3. scheduled packs due (inside the window), once per cycle
  for (const k of report.scheduled) {
    if (k.last_refill_at && db.shipmentForKitSince(k.id, 'scheduled', k.last_refill_at + 'T00:00:00')) continue;
    const c = db.getCustomer(k.customer_id);
    const p = k.type === 'vehicle' ? SKU.pack_vehicle : SKU.pack_site;
    created.push(db.createShipment({ customer_id: c.id, kit_id: k.id, kind: 'scheduled', lines: [{ sku: p.sku, name: p.name, qty: 1, unit_cost: p.unit_cost }], recipient: c.contact_name, address: c.address }));
  }
  // 4. AED consumables due
  for (const a of report.aeds) {
    const lines = [];
    if (a.reasons.some((r) => /^Pads/.test(r))) lines.push({ sku: SKU.aed_pads.sku, name: `${SKU.aed_pads.name}: ${a.make_model || 'model unknown'}`, qty: 1, unit_cost: SKU.aed_pads.unit_cost });
    if (a.reasons.some((r) => /^Battery/.test(r))) lines.push({ sku: SKU.aed_battery.sku, name: `${SKU.aed_battery.name}: ${a.make_model || 'model unknown'}`, qty: 1, unit_cost: SKU.aed_battery.unit_cost });
    if (!lines.length) continue;
    if (db.db.prepare("SELECT 1 FROM shipments WHERE aed_id = ? AND status != 'failed' AND created_at >= ?").get(a.id, db.addMonths(on, -1) + 'T00:00:00')) continue;
    const c = db.getCustomer(a.customer_id);
    created.push(db.createShipment({ customer_id: c.id, aed_id: a.id, kind: 'aed', lines, recipient: c.contact_name, address: c.address }));
  }
  return created;
}

// Raise purchase orders for anything at or under its reorder point.
function planPurchaseOrders() {
  const lines = [];
  for (const s of db.stockBelowReorder()) {
    if (db.openPurchaseOrderFor(s.sku)) continue;
    lines.push({ sku: s.sku, name: s.name, qty: s.reorder_qty, unit_cost: s.unit_cost });
  }
  if (!lines.length) return null;
  const total = Math.round(lines.reduce((a, l) => a + l.qty * (l.unit_cost || 0), 0) * 100) / 100;
  return { supplier: process.env.SUPPLIER_NAME || 'Aero Healthcare (reseller account)', supplier_email: process.env.SUPPLIER_EMAIL || '', lines, total };
}

module.exports = { SKU, itemSku, seedStock, dispatch, markShipped, planShipments, planPurchaseOrders, cfg };
