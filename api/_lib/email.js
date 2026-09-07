'use strict';
/* The one email the system sends. Plain text, from Aaron, with reply-to set to
   a real inbox, because the reply is the whole point. Stripe sends the receipt
   separately; this one carries the access link and the ask. */

const { cfg } = require('./config');
const { accessUrl } = require('./token');

function deliveryText(email) {
  return `Thanks for buying Brief the Machine.

Your link, which works forever and is fine to forward to your team:

${accessUrl(email)}

There are three videos and two one-page checklists. Start with video one and
have a real project open beside it; each video ends with you doing the thing,
not watching me do it.

One ask. When you have run your first brief, reply to this email and tell me
what it built. I read every one.

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
      subject: 'Brief the Machine: your link',
      text: deliveryText(email),
    }),
  });
  if (!r.ok) throw new Error(`Resend: ${r.status} ${await r.text()}`);
  return r.json();
}

module.exports = { sendDelivery, deliveryText };
