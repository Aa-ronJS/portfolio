'use strict';
// Daily job: print (and optionally POST to the webhook) everything that needs
// shipping or attention today. Run from cron at 7am Adelaide time:
//   0 7 * * * cd /path/to/app && npm run -s due >> due.log 2>&1
// With NOTIFY_WEBHOOK set (n8n, Zapier, Make, Slack), the report is POSTed
// as JSON so it can become an email or a message.
const sched = require('../lib/schedule');

const r = sched.dueReport();
const lines = [];
lines.push(`Due report for ${r.on}`);
lines.push(`Refill requests open: ${r.open.length}`);
for (const q of r.open) lines.push(`  - ${q.customer_name} · ${q.type} ${q.location || ''} (${q.code}) · ${q.kind} · ${JSON.parse(q.items || '[]').map((i) => i.qty + ' × ' + i.name).join(', ')}${q.note ? ' · ' + q.note : ''}`);
lines.push(`Scheduled refill packs due: ${r.scheduled.length}`);
for (const k of r.scheduled) lines.push(`  - ${k.customer_name} · ${k.type} ${k.location || ''} (${k.code}) · due ${k.next_refill_at}`);
lines.push(`Kits needing attention: ${r.attention.length}`);
for (const k of r.attention) lines.push(`  - ${k.customer_name} · ${k.type} ${k.location || ''} (${k.code}) · ${k.state}: ${k.reasons.join('; ')}`);
lines.push(`AED consumables: ${r.aeds.length}`);
for (const a of r.aeds) lines.push(`  - ${a.customer_name} · ${a.location || 'AED'} ${a.make_model || ''} · ${a.reasons.join('; ')}`);
lines.push(`Plan renewals within ${sched.RENEWAL_WINDOW_DAYS} days: ${r.renewals.length}`);
for (const c of r.renewals) lines.push(`  - ${c.name} · renews ${c.plan_renewal} (${c.days} days) · ${c.plan_billing}`);
const text = lines.join('\n');
console.log(text);

const hook = process.env.NOTIFY_WEBHOOK;
if (hook) {
  fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'due_report', at: new Date().toISOString(), text, report: r }) })
    .then((res) => console.log('webhook', res.status))
    .catch((e) => console.error('webhook failed', e.message));
}
