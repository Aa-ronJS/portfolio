#!/usr/bin/env node
// Are you ready to take money? Reads your two config files, asks the relay what it thinks, and says what is still missing.
//   node tools/launch-check.mjs                       (checks the files only)
//   node tools/launch-check.mjs --relay https://…     (also asks the relay, live)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).join(" ").split(/\s+--/).filter(Boolean).map((s) => { const t = s.replace(/^--/, ""); const i = t.indexOf(" "); return i < 0 ? [t, true] : [t.slice(0, i), t.slice(i + 1).trim()]; }));
const read = (p) => { try { return readFileSync(p, "utf8"); } catch (e) { return ""; } };
const site = read(join(here, "../public/config.js"));
const app = read(join(here, "../../quote-and-chase-app/config.js"));
const QC = (() => { const w = {}; try { new Function("window", site)(w); } catch (e) {} return w.QC || {}; })();
const APP = (() => { const w = {}; try { new Function("window", app)(w); } catch (e) {} return w.QC_APP || {}; })();

let stop = 0, warn = 0;
const must = (ok, what, how) => { if (!ok) { stop++; console.log("  STOP  " + what + (how ? "\n          " + how : "")); } else console.log("  ok    " + what); };
const should = (ok, what, how) => { if (!ok) { warn++; console.log("  note  " + what + (how ? "\n          " + how : "")); } else console.log("  ok    " + what); };
const has = (v) => String(v == null ? "" : v).trim() !== "";

console.log("\nCan a painter pay you today?\n");
must(has(QC.SUBSCRIBE_URL), "a checkout for the solo plan", "run tools/stripe-setup.mjs, then paste SUBSCRIBE_URL into public/config.js");
must(has(APP.signup_url), "the app can sign someone up", "set signup_url in quote-and-chase-app/config.js to <relay>/api/signup");
must(has(QC.SETUP_LINK_API), "the welcome page can set the app up", "set SETUP_LINK_API to <relay>/api/setup-link");
must(has(QC.SUPPORT_EMAIL), "an inbox a customer can reach", "SUPPORT_EMAIL is the only way anyone can contact you");
must(has(QC.ABN) && has(QC.BUSINESS_NAME) && has(QC.BUSINESS_ADDRESS), "who is selling this, for the terms", "ABN, BUSINESS_NAME and BUSINESS_ADDRESS. A refund promise needs a real giver behind it.");
should(has(QC.SUBSCRIBE2_URL), "a checkout for the two-phone plan", "without it the second card sends people to the solo one");
should(has(QC.MAKER_NAME) && has(QC.MAKER_NOTE), "a person on the page", "nobody buys from an anonymous website");

console.log("\nDo the numbers agree in both places?\n");
const n = (v, d) => (Number(v) > 0 ? Number(v) : d);
console.log("  page says: $" + n(QC.PLAN_PRICE, 99) + " for " + n(QC.INCLUDED_MESSAGES, 150) + ", $" + n(QC.PLAN2_PRICE, 149) + " for " + n(QC.INCLUDED_MESSAGES_TWO, 250) + ", packs of " + n(QC.TOPUP_MESSAGES, 100) + " at $" + n(QC.TOPUP_PRICE, 35));
console.log("  the relay must be set to the same, or the page promises what the relay will not honour.");

if (args.relay) {
  const base = String(args.relay).replace(/\/+$/, "");
  console.log("\nWhat the relay says (" + base + ")\n");
  const post = async (path, body) => { try { const r = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://chasem.app" }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => ({})) }; } catch (e) { return { status: 0, json: { error: e.message } }; } };
  const ping = await post("/api/msg", { action: "ping", token: "qc1.not.real" });
  must(ping.status !== 0, "the relay answers at all", "is it deployed, and is the address right?");
  must(ping.status === 401, "a made-up token is refused", ping.status === 200 ? "IT ACCEPTED A FAKE TOKEN: RELAY_SIGNING_SECRET is probably not set. Do not launch." : "expected 401, got " + ping.status);
  const su = await post("/api/signup", { email: "" });
  must(su.status === 400, "sign-up is alive and checks the address", "expected 400 for a blank email, got " + su.status);
  for (const [path, body] of [["/api/renew", { token: "qc1.x.y" }], ["/api/topup", { token: "qc1.x.y" }], ["/api/seat", { token: "qc1.x.y" }]]) {
    const r = await post(path, body);
    must(r.status === 401, path + " is alive and refuses a bad token", "got " + r.status);
  }
  // Supabase. Both endpoints answer 503 with off:true until they are configured, and 401 once they are --
  // so the status tells us which, without needing the secrets here.
  const sy = await post("/api/sync", { token: "qc1.x.y" });
  should(sy.status === 401, "customers can accept and book",
    sy.json && sy.json.off ? "DATABASE_URL is not set, so sync is off: a reply cannot be traced to a job and nothing can be booked" : "expected 401, got " + sy.status);
  const po = await post("/api/photo", { token: "qc1.x.y", action: "url", job: "j", id: "p" });
  should(po.status === 401, "photos survive a new phone",
    po.json && po.json.off ? "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set, so photos stay on that handset only" : "expected 401, got " + po.status);
}

console.log("");
if (stop) console.log(stop + " thing" + (stop > 1 ? "s" : "") + " must be fixed before you can take money." + (warn ? "  " + warn + " worth doing too." : ""));
else if (warn) console.log("Nothing is blocking a payment. " + warn + " thing" + (warn > 1 ? "s" : "") + " worth doing first.");
else console.log("Ready. Take a test payment with 4242 4242 4242 4242 before you point ads at it.");
console.log("");
process.exit(stop ? 1 : 0);
