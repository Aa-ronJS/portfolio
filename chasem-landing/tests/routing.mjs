// The app on go.chasem.app, the site on chasem.app: middleware.js decides which, and vercel.json sends the old
// chasem.app/app/ address across.
import mw from "../middleware.js";
import { readFileSync } from "node:fs";
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const hdr = (host, pth) => { const r = mw(new Request("https://" + host + pth, { headers: { host } })); return r.headers.get("x-middleware-rewrite") || (r.headers.get("x-middleware-next") ? "next" : "?"); };
ok(hdr("go.chasem.app", "/") === "https://go.chasem.app/app/", "go.chasem.app/ is the app");
ok(hdr("go.chasem.app", "/app.js") === "https://go.chasem.app/app/app.js" && hdr("go.chasem.app", "/config.js") === "https://go.chasem.app/app/config.js", "its files are the app's, not the site's");
ok(hdr("go.chasem.app", "/index.html") === "https://go.chasem.app/app/" && hdr("go.chasem.app", "/sw.js") === "https://go.chasem.app/app/sw.js", "index.html and the service worker land where they are served");
ok(hdr("go.chasem.app", "/api/signup") === "next" && hdr("go.chasem.app", "/y/abc") === "next", "the relay and booking pages answer on go.chasem.app too");
ok(hdr("chasem.app", "/") === "next" && hdr("chasem.app", "/app/") === "next" && hdr("www.chasem.app", "/config.js") === "next", "the site is untouched");
const v = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url)));
const r = (v.redirects || []).filter((x) => /^\/app/.test(x.source));
ok(["chasem.app", "www.chasem.app"].every((h) => r.some((x) => x.source === "/app/:path*" && x.has[0].value === h && x.destination === "https://go.chasem.app/:path*")), "chasem.app/app/... redirects to go.chasem.app/...");
ok(r.every((x) => x.has && x.has[0].value !== "go.chasem.app"), "go.chasem.app itself is never redirected");
console.log(fails ? "FAILURES: " + fails : "ALL PASSED"); process.exit(fails ? 1 : 0);
