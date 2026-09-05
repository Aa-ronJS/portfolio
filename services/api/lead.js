// Vercel serverless function: receives pricing-calculator leads and forwards
// them to LEAD_WEBHOOK_URL (set in the Vercel project's environment; point it
// at a Make/Zapier/n8n webhook that lands the lead in your CRM and inbox).
// The calculator never blocks on this: it reveals the estimate regardless,
// so this endpoint is best-effort by design.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST only' });
    return;
  }

  const { name = '', email = '', phone = '', service = '', answers = [], estimate = '', page = '' } = req.body || {};

  if (!email || !phone) {
    res.status(400).json({ ok: false, error: 'email and phone are required' });
    return;
  }

  const lead = {
    receivedAtUtc: new Date().toISOString(),
    name: String(name).slice(0, 200),
    email: String(email).slice(0, 200),
    phone: String(phone).slice(0, 50),
    service: String(service).slice(0, 100),
    answers: (Array.isArray(answers) ? answers : []).slice(0, 12).map((a) => String(a).slice(0, 300)),
    estimate: String(estimate).slice(0, 100),
    page: String(page).slice(0, 300),
    source: 'pricing-calculator',
  };

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      // Log and still return ok: the lead's estimate must never depend on us.
      console.error('lead webhook failed', err);
    }
  } else {
    // Visible in Vercel function logs until the webhook is configured.
    console.log('lead (no LEAD_WEBHOOK_URL configured)', JSON.stringify(lead));
  }

  res.status(200).json({ ok: true });
}
