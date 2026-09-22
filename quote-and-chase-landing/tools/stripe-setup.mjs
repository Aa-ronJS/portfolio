#!/usr/bin/env node
// Creates everything Quote & Chase needs inside YOUR Stripe account, in one go, and prints the config to paste.
//
//   node tools/stripe-setup.mjs --key sk_test_... --site https://chasem.app --relay https://chasem.app
//
// It makes: one product, three prices (solo monthly, two-phone monthly, a top-up pack), three Payment Links with the right
// metadata and success URL, and a webhook endpoint pointed at your relay. It is safe to run twice: everything is
// looked up by a lookup key or metadata first, so a second run reports what already exists instead of making duplicates.
//
// The key needs write access to Products, Prices, Payment Links and Webhook Endpoints. A test key (sk_test_) is the sensible
// first run: it builds the whole thing in test mode so you can pay yourself with 4242 4242 4242 4242 before touching live.
// Nothing here charges anybody, and it never writes to your files: it prints what to paste.

const args = Object.fromEntries(process.argv.slice(2).join(" ").split(/\s+--/).filter(Boolean).map((s) => { const t = s.replace(/^--/, ""); const i = t.indexOf(" "); return i < 0 ? [t, true] : [t.slice(0, i), t.slice(i + 1).trim()]; }));
const KEY = args.key || process.env.STRIPE_SECRET_KEY || "";
const SITE = String(args.site || "https://chasem.app").replace(/\/+$/, "");
const RELAY = String(args.relay || "").replace(/\/+$/, "");
const PLAN = Number(args.plan || 99), PLAN2 = Number(args.plan2 || 149), TOPUP = Number(args.topup || 35);
const CURRENCY = String(args.currency || "aud").toLowerCase();
const DRY = !!args["dry-run"];

if (!KEY) die("Give me a key: --key sk_test_... (or set STRIPE_SECRET_KEY)");
if (!/^(sk|rk)_(test|live)_/.test(KEY)) die("That does not look like a Stripe secret key.");
if (!RELAY) die("Give me where the relay lives: --relay https://your-site.vercel.app");
const LIVE = /_live_/.test(KEY);

function die(m) { console.error("\n" + m + "\n"); process.exit(1); }
async function stripe(path, form, method) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: method || (form ? "POST" : "GET"),
    headers: { Authorization: "Bearer " + KEY, ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || "Stripe " + r.status + " on " + path);
  return j;
}
const money = (n) => String(Math.round(n * 100));
const log = (...a) => console.log(...a);

async function findPrice(lookup) {
  const r = await stripe("prices?limit=1&lookup_keys[]=" + encodeURIComponent(lookup));
  return (r.data || [])[0] || null;
}
async function findLink(tag) {
  let starting = "", n = 0;
  while (n < 5) {
    const r = await stripe("payment_links?limit=100" + (starting ? "&starting_after=" + starting : ""));
    const hit = (r.data || []).find((l) => String((l.metadata || {}).qc_tag || "") === tag);
    if (hit) return hit;
    if (!r.has_more || !(r.data || []).length) return null;
    starting = r.data[r.data.length - 1].id; n++;
  }
  return null;
}
async function findHook(url) {
  const r = await stripe("webhook_endpoints?limit=100");
  return (r.data || []).find((h) => h.url === url) || null;
}

(async () => {
  log("\nQuote & Chase, Stripe set-up");
  log("  mode:    " + (LIVE ? "LIVE. This creates things that can take real money." : "test mode"));
  log("  site:    " + SITE);
  log("  relay:   " + RELAY);
  log("  prices:  $" + PLAN + " solo, $" + PLAN2 + " two phones, $" + TOPUP + " a top-up pack, in " + CURRENCY.toUpperCase());
  if (DRY) { log("\n  --dry-run: nothing will be created.\n"); }
  try { const me = await stripe("account"); log("  account: " + (me.settings && me.settings.dashboard && me.settings.dashboard.display_name || me.id)); }
  catch (e) { die("That key did not work: " + e.message); }

  const out = {};
  // ---- one product, three prices
  let product = null;
  const existing = await stripe("products?limit=100");
  product = (existing.data || []).find((p) => String((p.metadata || {}).qc_product || "") === "main") || null;
  // Managed Payments is on by default on new accounts and refuses a Payment Link whose product has no tax code.
  // This is cloud software sold to painting businesses, so: SaaS, business use.
  const TAX_CODE = "txcd_10103001";
  if (!product && !DRY) product = await stripe("products", { name: "Quote & Chase", description: "Quoting, invoicing and follow-ups for Australian painters.", tax_code: TAX_CODE, "metadata[qc_product]": "main" });
  else if (product && !DRY && product.tax_code !== TAX_CODE) { product = await stripe("products/" + product.id, { tax_code: TAX_CODE }); log("  tax code set to " + TAX_CODE + " (Managed Payments needs one)"); }
  log("\nproduct: " + (product ? product.id + (product.created > Date.now() / 1000 - 10 ? " (new)" : " (already there)") : "would create"));

  const priceSpecs = [
    { lookup: "qc_solo_monthly", amount: PLAN, recurring: true, plan: "solo", label: "Solo, one phone" },
    { lookup: "qc_two_monthly", amount: PLAN2, recurring: true, plan: "two", label: "Two phones" },
    { lookup: "qc_topup_pack", amount: TOPUP, recurring: false, plan: "", label: "Top-up pack of messages" },
  ];
  const prices = {};
  for (const spec of priceSpecs) {
    let p = await findPrice(spec.lookup);
    if (p && p.unit_amount !== Math.round(spec.amount * 100)) {
      log("  ! " + spec.lookup + " exists at $" + (p.unit_amount / 100) + ", not $" + spec.amount + ". Stripe prices cannot be edited.");
      log("    Either keep that price, or archive it in the dashboard and run this again.");
    }
    if (!p && !DRY) {
      const form = { product: product.id, unit_amount: money(spec.amount), currency: CURRENCY, lookup_key: spec.lookup, nickname: spec.label, "metadata[qc_plan]": spec.plan || "" };
      if (spec.recurring) { form["recurring[interval]"] = "month"; }
      p = await stripe("prices", form);
    }
    prices[spec.lookup] = p;
    log("  price " + spec.lookup + ": " + (p ? p.id : "would create") + "  $" + spec.amount + (spec.recurring ? "/month" : " once"));
  }
  if (DRY) { log("\n(dry run: stopping before Payment Links and the webhook)\n"); return; }

  // ---- three Payment Links
  const welcome = SITE + "/welcome?session={CHECKOUT_SESSION_ID}";
  const linkSpecs = [
    { tag: "solo", price: "qc_solo_monthly", plan: "solo", redirect: welcome, key: "SUBSCRIBE_URL" },
    { tag: "two", price: "qc_two_monthly", plan: "two", redirect: welcome, key: "SUBSCRIBE2_URL" },
    { tag: "topup", price: "qc_topup_pack", plan: "", redirect: SITE + "/app/", key: "TOPUP_URL" },
  ];
  for (const spec of linkSpecs) {
    let l = await findLink(spec.tag);
    if (!l) {
      const form = {
        "line_items[0][price]": prices[spec.price].id, "line_items[0][quantity]": "1",
        "after_completion[type]": "redirect", "after_completion[redirect][url]": spec.redirect,
        billing_address_collection: "required", "phone_number_collection[enabled]": "true",
        "metadata[qc_tag]": spec.tag,
      };
      if (spec.plan) { form["metadata[qc_plan]"] = spec.plan; form["subscription_data[metadata][qc_plan]"] = spec.plan; }
      if (spec.tag === "topup") { form["metadata[qc]"] = "topup"; form["payment_intent_data[metadata][qc]"] = "topup"; }
      l = await stripe("payment_links", form);
      log("  link " + spec.tag + ": created");
    } else log("  link " + spec.tag + ": already there");
    out[spec.key] = l.url;
  }

  // ---- the webhook
  const hookUrl = RELAY + "/api/stripe-webhook";
  let hook = await findHook(hookUrl), secret = "";
  if (!hook) {
    hook = await stripe("webhook_endpoints", {
      url: hookUrl, "enabled_events[0]": "checkout.session.completed",
      "enabled_events[1]": "checkout.session.async_payment_succeeded",
      description: "Quote & Chase: sign-ups and top-ups",
    });
    secret = hook.secret || "";
    log("  webhook: created");
  } else log("  webhook: already there (its signing secret is only shown once, so keep the one you saved)");

  // ---- what to paste
  log("\n================ paste into quote-and-chase-landing/public/config.js ================\n");
  log('  SUBSCRIBE_URL: "' + (out.SUBSCRIBE_URL || "") + '",');
  log('  SUBSCRIBE2_URL: "' + (out.SUBSCRIBE2_URL || "") + '",');
  log('  TOPUP_URL: "' + (out.TOPUP_URL || "") + '",');
  log('  SETUP_LINK_API: "' + RELAY + '/api/setup-link",');
  log('  PLAN_PRICE: ' + PLAN + ',  PLAN2_PRICE: ' + PLAN2 + ',  TOPUP_PRICE: ' + TOPUP + ',');
  log("\n================ paste into quote-and-chase-app/config.js ================\n");
  log("  window.QC_APP = { maps_key: '', signup_url: '" + RELAY + "/api/signup' };");
  log("\n================ set on Vercel (project quote-and-chase-landing) ================\n");
  log("  STRIPE_SECRET_KEY=" + (LIVE ? "sk_live_…  (the same account as this run)" : "sk_test_…  (the key you just used)"));
  log("  STRIPE_WEBHOOK_SECRET=" + (secret || "whsec_…  (from the webhook you already had)"));
  log("  RELAY_SIGNING_SECRET=" + randomSecret());
  log("  RELAY_URL=" + RELAY + "/api/msg");
  log("  APP_URL=" + SITE + "/app/");
  log("  FREE_MESSAGES=12  INCLUDED_MESSAGES=150  INCLUDED_MESSAGES_TWO=250  TOPUP_MESSAGES=100  TOPUP_PRICE=" + TOPUP + "  AUTO_TOPUP_CAP=3");
  log("  SUPPORT_EMAIL=…  RESEND_API_KEY=…  RESEND_FROM=…  TWILIO_ACCOUNT_SID=…  TWILIO_AUTH_TOKEN=…  TWILIO_MESSAGING_SERVICE_SID=…");
  log("\nRELAY_SIGNING_SECRET is freshly made above and is not stored anywhere. Every painter's sending token is signed with it,");
  log("so if you change it later everyone's sending stops until they open the app again. Save it somewhere safe now.\n");
  if (!LIVE) log("This was test mode. Pay yourself with 4242 4242 4242 4242, any future date, any CVC. When it all works, run it again with your live key.\n");
})().catch((e) => die("Stopped: " + e.message));

function randomSecret() { const b = new Uint8Array(32); (globalThis.crypto || require("node:crypto").webcrypto).getRandomValues(b); return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join(""); }
