'use strict';
// Outbound email. Every message the system sends is written to the outbox
// first (audit trail, idempotency), then delivered through a transactional
// provider if one is configured. Postmark's JSON shape is used because it is
// the simplest; Resend, SendGrid and Mailgun differ only in the field names,
// so a second adapter is a ten-line change here.
//
//   MAIL_API_URL=https://api.postmarkapp.com/email  MAIL_API_KEY=...  MAIL_FROM=hello@yourdomain.com.au
//
// Without MAIL_API_URL every message stays in the outbox as "queued" and is
// visible on /admin/autopilot, so nothing is lost while the account is set up.
const db = require('./db');

const cfg = {
  url: process.env.MAIL_API_URL || '',
  key: process.env.MAIL_API_KEY || '',
  from: process.env.MAIL_FROM || process.env.CONTACT_EMAIL || 'hello@example.com',
  replyTo: process.env.MAIL_REPLY_TO || process.env.CONTACT_EMAIL || '',
};

function textToHtml(text) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;max-width:600px">' +
    esc(text).split(/\n{2,}/).map((p) => '<p>' + p.replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>') + '</p>').join('') + '</div>';
}

// Deliver one outbox row. Returns the row's final status.
async function deliver(rec) {
  if (!cfg.url) return 'queued';
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Postmark-Server-Token': cfg.key, Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ From: cfg.from, To: rec.to_email, ReplyTo: cfg.replyTo || undefined, Subject: rec.subject, TextBody: rec.text, HtmlBody: rec.html, MessageStream: 'outbound', Tag: rec.kind }),
    });
    const body = await res.text();
    if (!res.ok) { db.markMail(rec.id, 'failed', { error: `${res.status} ${body.slice(0, 200)}` }); return 'failed'; }
    let pid = null; try { pid = JSON.parse(body).MessageID || JSON.parse(body).id || null; } catch { /* provider returned non-JSON; fine */ }
    db.markMail(rec.id, 'sent', { provider_id: pid });
    return 'sent';
  } catch (e) {
    db.markMail(rec.id, 'failed', { error: e.message });
    return 'failed';
  }
}

// send({to, subject, text, kind, customer_id?, partner_id?, lead_id?}) -> outbox row (with .status)
async function send(m) {
  if (!m.to) return null;
  const rec = db.queueMail({ ...m, html: m.html || textToHtml(m.text || '') });
  rec.status = await deliver(rec);
  return rec;
}

// Retry anything still queued or failed (e.g. after the provider is configured).
async function flush(limit = 200) {
  const rows = db.db.prepare("SELECT * FROM outbox WHERE status IN ('queued','failed') ORDER BY created_at LIMIT ?").all(limit);
  let sent = 0;
  for (const r of rows) if ((await deliver(r)) === 'sent') sent++;
  return { tried: rows.length, sent };
}

module.exports = { send, flush, deliver, textToHtml, cfg };
