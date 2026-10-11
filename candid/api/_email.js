// Email through Resend. Without RESEND_API_KEY nothing is sent: the dev server prints the message and the tests
// capture it through globalThis.__candidFetch. A failed send is reported, not thrown, so a mail outage cannot block
// a payout or a close.
export const f = (...a) => (globalThis.__candidFetch || fetch)(...a);
export const emailOn = () => !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM) || !!globalThis.__candidFetch;

export async function sendEmail(msg) {
  const to = Array.isArray(msg.to) ? msg.to : [msg.to];
  if (!emailOn()) { console.log("[email not sent]", to.join(","), "|", msg.subject, "\n", msg.text); return { ok: false, skipped: true }; }
  try {
    const r = await f("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + (process.env.RESEND_API_KEY || "test"), "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM || "Candid <test@example.com>", to, subject: msg.subject, text: msg.text, ...(msg.reply_to ? { reply_to: msg.reply_to } : {}) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error("email:", j.message || r.status); return { ok: false }; }
    return { ok: true, id: j.id };
  } catch (e) { console.error("email:", e.message); return { ok: false }; }
}

const APP = () => String(process.env.APP_URL || "").replace(/\/?$/, "/");
export const templates = {
  code: (code) => ({ subject: `${code} is your Candid code`, text: `Your code is ${code}\n\nType it into the sign-in page. It works for 10 minutes.\n\nIf you did not ask for it, ignore this email.\n\nCandid` }),
  ratingOpen: (business, link) => ({ subject: `${business}: three reviews to rate`, text: `Your review for ${business} is in. Three other reviews are waiting for your rating.\n\nOpen your link: ${link}\n\nYour $20 is released once you have rated them. Peer rating closes in 7 days.\n\nCandid` }),
  feeReleased: (business, amount, link) => ({ subject: `${business}: $${amount} on its way`, text: `Your $${amount} from the ${business} review period has been released and will be paid to your PayID.\n\nYour link: ${link}\n\nCandid` }),
  flagRaised: (business, reason, link) => ({ subject: `${business}: a flag on your review`, text: `Your review for ${business} was flagged as "${reason}". A person will decide within 7 days. You can reply once on your page:\n\n${link}\n\nIf no decision is made in 7 days, your fee is released.\n\nCandid` }),
  settled: (business, n) => ({ subject: `${business}: reviews are in`, text: `Period ${n} for ${business} has settled. Scores are final and the issues are priced.\n\n${APP()}app\n\nCandid` }),
  paid: (business, amount) => ({ subject: `Candid: $${amount} of credit added`, text: `$${amount} of credit was added to ${business}.\n\n${APP()}app\n\nCandid` }),
};
