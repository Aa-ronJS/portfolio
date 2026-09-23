// POST /api/connect  —  getting the painter paid, without him ever typing a BSB.
//
// Stripe Connect Express: he taps once, Stripe's own pages ask for his bank account and his ID, and he comes
// back. The money lands in his account, not ours; we only read whether he can take a card yet, and get told
// when an invoice is paid. That is the difference between an invoice he has to chase into his bank statement
// and one the app can tick off by itself.
//
//   start   make (or reuse) his account and hand back the link to Stripe's onboarding
//   status  can he take a card yet, and if not, what is Stripe waiting on
//   manage  a link into his own Stripe, for changing the bank account later
//
// Off until Connect is signed up for on the platform account, which is a dashboard thing, not a code thing.
// Until then this answers { off: true } and the app offers bank transfer instead of pretending.
import { cors, send, readJson, readToken, stripe } from "./_setup.js";
import { q, dbConfigured } from "./_db.js";
import { ensurePainter } from "./_store.js";

const SITE = (process.env.SITE_URL || "https://chasem.app").replace(/\/+$/, "");
const BACK = SITE + "/app/#/settings?paid=";
const NOT_SIGNED_UP = /signed up for Connect/i;

export function connectConfigured() { return !!process.env.STRIPE_SECRET_KEY; }

async function row(painter) {
  return (await q("select stripe_account, pay_ready, pay_note from painter where id=$1", [painter])).rows[0] || null;
}

// What Stripe says about him, in words a painter can act on.
function readAccount(a) {
  const req = (a && a.requirements) || {};
  const due = [].concat(req.currently_due || [], req.past_due || []);
  const ready = !!(a && a.charges_enabled);
  let note = "";
  if (!ready) {
    if (req.disabled_reason && /rejected/.test(String(req.disabled_reason))) note = "Stripe has turned this account down. Their email says why.";
    else if (due.length) note = "Stripe still needs a few details from you.";
    else note = "Stripe is checking your details. This usually takes a few minutes.";
  }
  return { ready, payouts: !!(a && a.payouts_enabled), note, due: due.slice(0, 8) };
}

export default async function handler(req, res) {
  if (!cors(req, res, "POST, OPTIONS")) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!connectConfigured() || !dbConfigured()) return send(res, 200, { ok: true, off: true });

  let body; try { body = await readJson(req, 10_000); } catch { return send(res, 400, { ok: false, error: "Bad JSON" }); }
  const p = readToken(body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });
  await ensurePainter(p, body.me || {});

  try {
    let r = await row(p.cus);

    if (body.action === "start") {
      let acct = r && r.stripe_account;
      if (!acct) {
        const made = await stripe("accounts", {
          type: "express", country: "AU", email: p.reply_to || "",
          "capabilities[card_payments][requested]": "true",
          "capabilities[transfers][requested]": "true",
          "business_profile[product_description]": "Painting and decorating",
          "metadata[painter]": p.cus,
        });
        acct = made.id;
        await q("update painter set stripe_account=$2, updated_at=now() where id=$1", [p.cus, acct]);
      }
      const link = await stripe("account_links", {
        account: acct, type: "account_onboarding",
        refresh_url: BACK + "again", return_url: BACK + "back",
      });
      return send(res, 200, { ok: true, url: link.url });
    }

    if (body.action === "status") {
      if (!r || !r.stripe_account) return send(res, 200, { ok: true, started: false, ready: false });
      const a = await stripe("accounts/" + encodeURIComponent(r.stripe_account));
      const st = readAccount(a);
      await q("update painter set pay_ready=$2, pay_note=$3, updated_at=now() where id=$1", [p.cus, st.ready, st.note]);
      return send(res, 200, { ok: true, started: true, ready: st.ready, payouts: st.payouts, note: st.note, due: st.due });
    }

    if (body.action === "manage") {
      if (!r || !r.stripe_account) return send(res, 400, { ok: false, error: "Nothing to manage yet" });
      const l = await stripe("accounts/" + encodeURIComponent(r.stripe_account) + "/login_links", {});
      return send(res, 200, { ok: true, url: l.url });
    }

    return send(res, 400, { ok: false, error: "No such action" });
  } catch (e) {
    const msg = (e && e.message) || "That did not work";
    // Connect not turned on for the platform is a set-up job, not a fault of his: say so plainly and let the
    // app fall back to bank transfer.
    if (NOT_SIGNED_UP.test(msg)) return send(res, 200, { ok: true, off: true });
    return send(res, 502, { ok: false, error: msg });
  }
}
