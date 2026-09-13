'use strict';
// Drafts one personalised first email per row of a prospect or partner CSV.
// You edit and send; the script never sends anything.
//
//   node scripts/outreach.js prospects.csv prospect > drafts.csv
//   node scripts/outreach.js partners.csv partner  > drafts.csv
//
// Input columns (header row required): name, business, type, suburb, notes,
// email. Extra columns are passed to the model as context. Output: the same
// rows plus subject and body columns.
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.OUTREACH_MODEL || 'claude-opus-5';
const BRAND = process.env.BRAND || 'Kit Register';
const FOUNDER = process.env.LEGAL_NAME || 'Aaron';
const PHONE = process.env.CONTACT_PHONE || '';

const SYSTEM = {
  prospect: `You draft short first emails from ${FOUNDER}, who runs ${BRAND} in Adelaide: workplace first-aid kits kept compliant on a replenishment plan (QR label on the kit, refill ships the same day something is used, scheduled packs twice a year, a compliance certificate on demand). Site kit A$119, vehicle kit A$59, plan A$144 a year per site kit and A$84 per vehicle kit.
Rules: under 120 words. One specific observation about the recipient's business from the row (their trade, suburb, vehicles, sites) in the first sentence. No hype, no exclamation marks, no "I hope this finds you well". Never "TGA approved"; never "guarantees compliance". One ask: a ten-minute visit this week to drop a kit in and register it. Sign off with ${FOUNDER} and ${PHONE}. Australian English. Return JSON only: {"subject": "...", "body": "..."}.`,
  partner: `You draft short partner proposals from ${FOUNDER}, who runs ${BRAND} in Adelaide (workplace first-aid kits kept compliant on a replenishment plan with a compliance certificate). The recipient already visits small businesses (WHS consultant, safety trainer, bookkeeper, association) and sees out-of-date kits. Offer: 15 percent of first-year plan revenue per referred client, paid once, plus a partner view showing every referred client's compliance state before their next visit.
Rules: under 130 words. One sentence showing you understand what they do, from the row. No hype. One ask: a ten-minute call this week. Sign off with ${FOUNDER} and ${PHONE}. Australian English. Return JSON only: {"subject": "...", "body": "..."}.`,
};

function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') q = false; else field += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c !== ''));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function main() {
  const [file, kind = 'prospect'] = process.argv.slice(2);
  if (!file || !SYSTEM[kind]) { console.error('usage: node scripts/outreach.js file.csv prospect|partner'); process.exit(1); }
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const client = new Anthropic();
  const cols = Object.keys(rows[0] || {});
  console.log([...cols, 'subject', 'body'].map(csvCell).join(','));
  for (const r of rows) {
    try {
      const msg = await client.beta.messages.create({
        model: MODEL, max_tokens: 1200, thinking: { type: 'adaptive' },
        betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
        system: [{ type: 'text', text: SYSTEM[kind], cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `Recipient row: ${JSON.stringify(r)}` }],
      });
      if (msg.stop_reason === 'refusal') throw new Error('refused');
      const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      const m = text.match(/\{[\s\S]*\}/);
      const out = m ? JSON.parse(m[0]) : { subject: '', body: text };
      console.log([...cols.map((c) => r[c]), out.subject, out.body].map(csvCell).join(','));
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) { console.error('No credentials: set ANTHROPIC_API_KEY or run `ant auth login`.'); process.exit(1); }
      console.error('row failed:', r.business || r.name, e.message);
    }
  }
}

main();
