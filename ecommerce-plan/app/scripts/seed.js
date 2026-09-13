'use strict';
// Seeds a demo customer so the admin, scan page, record and certificate all
// have something to show. Safe to run on an empty database; skips if the
// demo customer already exists. Use `DB_PATH=./data/demo.db npm run seed` to
// keep it out of production data.
const db = require('../lib/db');

const existing = db.listCustomers().find((c) => c.name === 'Demo Plumbing Pty Ltd');
if (existing) { console.log('Demo customer already exists:', existing.id); process.exit(0); }

const c = db.createCustomer({
  name: 'Demo Plumbing Pty Ltd', abn: '12 345 678 901', contact_name: 'Sam Demo', phone: '0400 111 222',
  email: 'sam@example.com', address: '12 Example Road, Lonsdale SA 5160', industry: 'Trades (plumbing, electrical, building)',
  plan_billing: 'annual', notes: 'Seeded demo account.',
});
const site = db.createKit({ customer_id: c.id, type: 'site', location: 'Workshop, near roller door', modules: ['burns'] });
const ute1 = db.createKit({ customer_id: c.id, type: 'vehicle', location: 'Ute S123 ABC' });
const ute2 = db.createKit({ customer_id: c.id, type: 'vehicle', location: 'Ute S456 DEF' });
db.createAed({ customer_id: c.id, location: 'Office wall', make_model: 'HeartSine 350P', serial: 'HS-DEMO-001',
  pads_expiry: db.addMonths(db.today(), 1), battery_expiry: db.addMonths(db.today(), 30) });

// simulate some history: a use on ute 1, a check on the site kit
const items = db.listItems(ute1.id);
const gloves = items.find((i) => i.name.startsWith('Nitrile'));
const strips = items.find((i) => i.name.startsWith('Adhesive'));
db.recordUse(ute1, [{ id: gloves.id, name: gloves.name, qty: 1 }, { id: strips.id, name: strips.name, qty: 1 }], 'Cut hand on a fitting', 'Sam');
db.recordCheckOk(site, 'Sam');
// make ute 2 look overdue for its scheduled refill
db.updateKit(ute2.id, { next_refill_at: db.addDays(db.today(), -10) });

console.log('Seeded demo customer');
console.log('  admin:       /admin/customers/' + c.id);
console.log('  record:      /c/' + c.token);
console.log('  certificate: /c/' + c.token + '/certificate');
console.log('  scan (ute1): /k/' + ute1.code);
