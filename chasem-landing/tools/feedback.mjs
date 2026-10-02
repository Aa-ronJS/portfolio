// Read the feedback left in the app's feedback mode (chasem-app/review.js), and draw each screen as it was seen.
//
//   node tools/feedback.mjs            new notes (not yet marked done), each with a picture in .local/feedback/
//   node tools/feedback.mjs --all      every note, done or not
//   node tools/feedback.mjs --watch    keep checking every 30 seconds and print each new note as it arrives
//   node tools/feedback.mjs --done <id> [<id>...]   mark notes dealt with, so they stop showing as new
//
// The key is FEEDBACK_READ_KEY, read from the environment or from .local/feedback-key (never printed). The picture is
// the copy of the screen the phone sent, drawn with the live app's stylesheet at the phone's own size, with the thing
// that was picked outlined in orange.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOCAL = join(HERE, "..", ".local");
const BASE = (process.env.CHASEM_URL || "https://go.chasem.app").replace(/\/$/, "");
const keyFile = join(LOCAL, "feedback-key");
const KEY = process.env.FEEDBACK_READ_KEY || (existsSync(keyFile) ? readFileSync(keyFile, "utf8").trim() : "");
if (!KEY) { console.error("No FEEDBACK_READ_KEY, and nothing in .local/feedback-key."); process.exit(2); }
const args = process.argv.slice(2);

async function api(body) {
  const r = await fetch(BASE + "/api/feedback", { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE }, body: JSON.stringify({ key: KEY, ...body }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error("Feedback read failed: " + r.status + " " + (j.error || ""));
  return j;
}

let browser = null;
async function draw(item) {
  if (!item.page) return "";
  const require = createRequire(join(HERE, "..", "..", "chasem-app", "package.json"));
  const { chromium } = require("playwright-core");
  if (!browser) browser = await chromium.launch({ executablePath: process.env.QC_CHROME || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const vp = item.viewport || {};
  const ctx = await browser.newContext({ viewport: { width: Math.max(320, vp.w || 390), height: Math.max(480, vp.h || 844) }, deviceScaleFactor: Math.min(2, vp.dpr || 1), colorScheme: vp.dark ? "dark" : "light" });
  const p = await ctx.newPage();
  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><base href="${BASE}/"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"></head><body>${item.page}</body></html>`;
  await p.setContent(html, { waitUntil: "load", timeout: 20000 }).catch(() => {});
  await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await p.waitForTimeout(400);
  const found = await p.evaluate(({ sel, scroll }) => {
    let el = null; try { el = sel ? document.querySelector(sel) : null; } catch (e) {}
    if (!el) { window.scrollTo(0, scroll || 0); return false; }
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect(), o = document.createElement("div");
    Object.assign(o.style, { position: "fixed", left: r.left - 4 + "px", top: r.top - 4 + "px", width: r.width + 8 + "px", height: r.height + 8 + "px", border: "3px solid #E8590C", borderRadius: "8px", zIndex: 99999, pointerEvents: "none" });
    document.body.appendChild(o); return true;
  }, { sel: item.target, scroll: vp.scroll });
  mkdirSync(join(LOCAL, "feedback"), { recursive: true });
  const out = join(LOCAL, "feedback", item.id + ".png");
  await p.screenshot({ path: out });
  await ctx.close();
  return out + (found ? "" : "  (the picked element could not be found again; showing where the screen was)");
}

function show(i, pic) {
  const when = new Date(i.created_at).toLocaleString("en-AU", { timeZone: "Australia/Adelaide" });
  console.log([
    `FEEDBACK ${i.id}  ${when}  ${String(i.verdict || "note").toUpperCase()}${i.done_at ? "  (done)" : ""}`,
    `  note:    ${i.note}`,
    `  on:      ${i.target_text || "(whole screen)"}   screen ${i.screen || "#/"}   app ${i.app || "?"}`,
    i.target ? `  element: ${i.target}` : "",
    i.viewport && i.viewport.w ? `  size:    ${i.viewport.w}x${i.viewport.h}${i.viewport.dark ? " dark" : ""}   ${/iPhone|Android/.test(i.ua) ? (i.ua.match(/iPhone|Android[^;)]*/) || [""])[0] : "computer"}` : "",
    pic ? `  picture: ${pic}` : "",
  ].filter(Boolean).join("\n"));
}

async function fetchAndShow(since, all) {
  const { items } = await api({ action: "list", since, all, full: true, limit: 100 });
  for (const i of items) {
    let pic = ""; try { pic = await draw(i); } catch (e) { pic = "(could not draw: " + e.message + ")"; }
    // the copy of the screen is kept beside the picture, for a closer look than a picture gives
    if (i.page) { mkdirSync(join(LOCAL, "feedback"), { recursive: true }); writeFileSync(join(LOCAL, "feedback", i.id + ".json"), JSON.stringify(i, null, 1)); }
    show(i, pic);
  }
  return items;
}

if (args[0] === "--done") {
  const r = await api({ action: "done", ids: args.slice(1) });
  console.log("Marked done: " + r.done);
} else if (args[0] === "--watch") {
  let since = new Date().toISOString();
  console.log("Watching " + BASE + " for feedback. New notes print here as they arrive.");
  for (;;) {
    try { const items = await fetchAndShow(since, false); if (items.length) since = items[items.length - 1].created_at; }
    catch (e) { console.log("(check failed: " + e.message + "; trying again)"); }
    await new Promise((r) => setTimeout(r, 30000));
  }
} else {
  const items = await fetchAndShow(null, args.includes("--all"));
  if (!items.length) console.log("No new feedback.");
}
if (browser) await browser.close();
