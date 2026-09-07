'use strict';
/* The one email the system sends. Plain text, from Aaron, with reply-to set to
   a real inbox, because the reply is the whole point. Stripe sends the receipt
   separately; this one carries the access link and the ask. */

const { cfg } = require('./config');
const { accessUrl } = require('./token');

function deliveryText(email) {
  return `Thanks for buying Draw It Badly.

Your link, which works forever and is fine to forward to your team:

${accessUrl(email)}

Three videos, the prompt cards, two one-page checklists. Start with video
one with the template open in a drawing app on your phone; each video ends
with you drawing, recording or sending something, not watching me do it.

One ask. When your first episode renders, reply to this email with the file
or the link. I watch every one and I answer with the one thing I would change.

Aaron`;
}

async function sendDelivery(email) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: cfg.fromEmail,
      to: [email],
      reply_to: cfg.replyTo || undefined,
      subject: 'Draw It Badly: your link',
      text: deliveryText(email),
    }),
  });
  if (!r.ok) throw new Error(`Resend: ${r.status} ${await r.text()}`);
  return r.json();
}

module.exports = { sendDelivery, deliveryText };
