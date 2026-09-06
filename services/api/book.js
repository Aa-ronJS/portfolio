// Native booking endpoint for the weekly Wednesday slot.
//
// GET  -> { ok, booked: ["2026-09-09", ...] }  (dates already taken)
// POST -> body { date, slotUtc, slotLocal, name, email, phone, topic }
//
// Wiring, all optional and all best-effort by design:
//   BOOKING_NOTIFY_EMAIL  where confirmations go (default below)
//   RESEND_API_KEY        sends the confirmation email via Resend; the free
//                         tier sends from onboarding@resend.dev to the
//                         account owner's own address, which is exactly the
//                         self-notification this needs
//   KV_REST_API_URL /     Vercel KV (Upstash) REST pair; when present, taken
//   KV_REST_API_TOKEN     slots are recorded and double-bookings get a 409
//   LEAD_WEBHOOK_URL      every booking also forwards here (CRM/inbox hook)
//
// With nothing configured the endpoint still accepts bookings and logs them
// to the function log, because a booker must never be punished for plumbing.

const NOTIFY = process.env.BOOKING_NOTIFY_EMAIL || 'steele.aaron@outlook.com';

async function kv(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!resp.ok) throw new Error(`kv ${resp.status}`);
  return (await resp.json()).result;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    let booked = [];
    try {
      const keys = await kv(['KEYS', 'booking:*']);
      if (keys) booked = keys.map((k) => k.replace('booking:', ''));
    } catch (err) {
      console.error('kv read failed', err);
    }
    res.status(200).json({ ok: true, booked });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'GET or POST' });
    return;
  }

  const { date = '', slotUtc = '', slotLocal = '', name = '', email = '', phone = '', topic = '' } = req.body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !email) {
    res.status(400).json({ ok: false, error: 'date and email are required' });
    return;
  }

  const booking = {
    date,
    slotUtc: String(slotUtc).slice(0, 40),
    slotLocal: String(slotLocal).slice(0, 120),
    name: String(name).slice(0, 200),
    email: String(email).slice(0, 200),
    phone: String(phone).slice(0, 50),
    topic: String(topic).slice(0, 500),
    receivedAtUtc: new Date().toISOString(),
    source: 'booking-page',
  };

  // Double-booking guard, when KV is configured. SET NX is atomic: the first
  // writer wins, a racing second booking gets the polite 409.
  try {
    const stored = await kv(['SET', `booking:${date}`, JSON.stringify(booking), 'NX']);
    if (stored === null && process.env.KV_REST_API_URL) {
      res.status(409).json({ ok: false, taken: true });
      return;
    }
  } catch (err) {
    console.error('kv write failed', err);
  }

  const summary =
    `New booking: Wednesday ${date}, 11:30am Adelaide time (30 minutes)\n\n` +
    `Their local time: ${booking.slotLocal}\n` +
    `Name:  ${booking.name || '(not given)'}\n` +
    `Email: ${booking.email}\n` +
    `Phone: ${booking.phone || '(not given)'}\n` +
    `About: ${booking.topic || '(not given)'}\n`;

  if (process.env.RESEND_API_KEY) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Bookings <onboarding@resend.dev>',
          to: [NOTIFY],
          subject: `Booking: Wed ${date} 11:30 ACST, ${booking.name || booking.email}`,
          text: summary,
        }),
      });
      if (!resp.ok) console.error('resend failed', resp.status, await resp.text());
    } catch (err) {
      console.error('resend failed', err);
    }
  } else {
    console.log('booking (no RESEND_API_KEY configured)', summary);
  }

  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });
    } catch (err) {
      console.error('lead webhook failed', err);
    }
  }

  res.status(200).json({ ok: true });
}
