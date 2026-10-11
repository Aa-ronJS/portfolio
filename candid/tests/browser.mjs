// The two pages, driven in a real browser against the dev server: an owner runs a period and three reviewers
// take part on their links. Needs Chromium (PLAYWRIGHT_CHROMIUM or Playwright's default install); skips cleanly without it.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const exe = process.env.PLAYWRIGHT_CHROMIUM || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
let chromium; try { ({ chromium } = await import("playwright")); } catch { console.log("SKIP browser test: playwright not installed"); process.exit(0); }
if (!exe && !process.env.PLAYWRIGHT_BROWSERS_PATH) { console.log("SKIP browser test: no Chromium"); process.exit(0); }

const PORT = 3177;
const server = spawn(process.execPath, ["tools/dev.mjs"], { env: { ...process.env, PORT: String(PORT), OWNER_PASSCODE: "browser-passcode", ANTHROPIC_API_KEY: "" }, stdio: ["ignore", "pipe", "inherit"] });
await new Promise((r) => server.stdout.on("data", (d) => { if (/Candid on/.test(String(d))) r(); }));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const base = `http://localhost:${PORT}`;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const errors = [];
const page = async (w = 1280) => { const p = await browser.newPage({ viewport: { width: w, height: 900 } }); p.on("pageerror", (e) => errors.push(e.message)); return p; };
const click = async (p, sel) => { await p.click(sel); await p.waitForTimeout(150); };
const settle = (p) => p.waitForFunction(() => !document.querySelector(".spin"));
try {
  const owner = await page();
  await owner.goto(base + "/app"); await owner.waitForSelector("#pass");
  await owner.fill("#pass", "wrong"); await click(owner, '[data-act="login"]'); await owner.waitForSelector("#loginerr:not(:empty)");
  ok(true, "a wrong passcode shows an error on the sign-in card");
  await owner.fill("#pass", "browser-passcode"); await click(owner, '[data-act="login"]'); await owner.waitForSelector("#newname");
  await owner.fill("#newname", "Loop Laundry"); await click(owner, '[data-act="create"]'); await owner.waitForSelector('[data-act="wz-start"]');
  ok(await owner.locator("#wsel option").count() >= 1, "the business is created and selected");
  await click(owner, '[data-act="wz-start"]');
  const answers = ["Loop Laundry picks up your washing, washes and folds it, and brings it back in 48 hours.", "Inner north, no washing machine.", "Book one pickup, hand over a bag of up to 8 kg, get it back within 48 hours. The first load is free.", "Booking: was it clear when we would arrive?\nHandover: did the bag or label confuse you?\nReturn and payment: on time, and was paying clear?", "Pickup window is 4 hours", "No dry cleaning.", "Lives in the inner north and has no washing machine."];
  for (const a of answers) { await owner.fill("#wz", a); await click(owner, '[data-act="wz-next"]'); await settle(owner); }
  await owner.waitForSelector(".kv");
  ok((await owner.locator(".kv").textContent()).includes("Handover"), "the brief wizard saves all seven answers");
  await click(owner, '[data-act="page"][data-v="credits"]'); await owner.fill("#camt", "300"); await click(owner, '[data-act="credits"]'); await settle(owner);
  ok((await owner.locator(".tile .v").first().textContent()).trim() === "$300", "credits are added");
  await click(owner, '[data-act="page"][data-v="period"]'); await click(owner, '[data-act="newPeriod"]'); await settle(owner);
  await owner.fill("#seats", "3"); await click(owner, '[data-act="fund"]'); await settle(owner);
  await click(owner, '[data-act="recruit"]'); await settle(owner);
  const links = await owner.locator("td .code").allTextContents();
  ok(links.length === 3 && links.every((l) => l.startsWith(base + "/r/")), "three invite links are shown with copy buttons");
  ok(await owner.locator("#post").count() === 1, "and the recruitment kit");
  await owner.screenshot({ path: "/tmp/candid-owner-period.png" });

  // reviewers on their phones
  const people = [["Dana", "dana@example.com", "0400000001", "no"], ["Friend", "friend@example.com", "0400000002", "yes"], ["Otto", "otto@example.com", "0400000003", "no"]];
  const texts = [["The booking page said we would get a text the night before and it came at 9:40pm with a 1pm to 5pm window, but there was no field for a gate code so the driver rang from the street.", "The bag was the stripey one from the welcome email. The label had my name but not a date, so with two bags I could not tell which was which.", "Returned in 46 hours. Paying was a link in the return email and it worked first go."],
    ["Everything was perfect, really easy to book, nothing to add here at all.", "Loved the bag, no confusion at all, it was perfect.", "Came back fast and paying was simple. 10 out of 10 would recommend."],
    ["Booking took two minutes but the confirmation email said 2 business days while the website says 48 hours, and on a Friday those are different days.", "The bag arrived flat-packed in my letterbox with no note, so I did not know it was from you until the email landed an hour later.", "Return was Tuesday 11am. The payment link asked for a card even though the amount was $0 for the free first load."]];
  const phones = [];
  const acceptOn = async (i) => {
    const ph = await page(400); phones[i] = ph;
    await ph.goto(links[i]); await ph.waitForSelector('[data-act="step"]');
    await click(ph, '[data-act="step"]'); await click(ph, '[data-act="step"]');
    await ph.fill("#name", people[i][0]); await ph.fill("#email", people[i][1]); await ph.fill("#payid", people[i][2]); await ph.selectOption("#knew", people[i][3]);
    await click(ph, '[data-act="accept"]'); await settle(ph); await ph.waitForSelector("#sec0");
  };
  const submitOn = async (i) => {
    const ph = phones[i];
    for (let k = 0; k < 3; k++) await ph.fill("#sec" + k, texts[i][k]);
    await ph.fill("#clo0", "Book a pickup"); await ph.fill("#clo1", "Nowhere"); await ph.fill("#clo2", "$25");
    await click(ph, '[data-act="submit"]'); await settle(ph); await ph.waitForSelector(".chip.good");
  };
  await acceptOn(0);
  await phones[0].fill("#sec0", "half a thought"); await phones[0].waitForFunction(() => /Saved/.test(document.querySelector("#savestate").textContent), null, { timeout: 5000 });
  await phones[0].reload(); await phones[0].waitForSelector("#sec0");
  ok((await phones[0].inputValue("#sec0")) === "half a thought", "a reviewer's draft survives a reload");
  await submitOn(0); await acceptOn(1); await submitOn(1); await acceptOn(2);
  ok(await phones[0].locator(".chip.good").first().textContent().then((t) => /Submitted/.test(t)), "a submitted review shows as submitted");
  const wide = await phones[0].evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  ok(!wide, "the reviewer page has no horizontal scroll at phone width");
  // an issue, with the duplicate check
  await click(phones[0], '[data-act="bugform"]'); await phones[0].fill("#bt", "No field for a gate code at booking"); await phones[0].fill("#bh", "Booking asks for a flat number but there is nowhere to put a gate code, so the driver had to call me from the street."); await phones[0].fill("#bi", "An optional access line."); await phones[0].fill("#bw", "Booking");
  await click(phones[0], '[data-act="bug-submit"]'); await settle(phones[0]); await phones[0].waitForSelector(".list");
  ok((await phones[0].locator(".list").first().textContent()).includes("gate code"), "an issue is reported from the phone");
  await click(phones[2], '[data-act="bugform"]'); await phones[2].fill("#bt", "Gate code has nowhere to go on the booking form"); await phones[2].fill("#bh", "There is a flat number field but no way to tell the driver the gate code."); await phones[2].fill("#bw", "Booking");
  await click(phones[2], '[data-act="bug-submit"]'); await phones[2].waitForSelector('[data-act="dup-confirm"]', { timeout: 8000 });
  ok(true, "the second reviewer is told it looks like an existing issue");
  await click(phones[2], '[data-act="dup-confirm"]'); await settle(phones[2]);
  ok((await phones[2].locator(".list").first().textContent()).includes("Confirmation"), "and attaches a confirmation");
  await phones[0].screenshot({ path: "/tmp/candid-phone-home.png", fullPage: true });
  await submitOn(2);

  // the owner ends the open stage; rating; settlement
  await owner.reload(); await owner.waitForSelector('[data-act="page"][data-v="period"]'); await click(owner, '[data-act="page"][data-v="period"]');
  await owner.waitForSelector(".topbar .chip");
  ok((await owner.locator(".topbar .chip").textContent()).includes("Peer rating"), "the last submission starts peer rating by itself");
  for (const ph of phones) {
    await ph.reload(); await ph.waitForSelector('[data-act="ratings"]');
    const ids = await ph.$$eval('select[id$="-useful"]', (els) => els.map((e) => e.id.replace(/^rt-|-useful$/g, "")));
    for (const id of ids) { const txt = await ph.$eval(`#rt-${id}-useful`, (e) => e.closest(".stack").querySelector(".a").textContent); await ph.selectOption(`#rt-${id}-useful`, /perfect/.test(txt) ? "1" : "5"); if (/perfect/.test(txt) && ph === phones[0]) await ph.selectOption(`#rt-${id}-flag`, "unfairly positive"); }
    await click(ph, '[data-act="ratings"]'); await settle(ph);
  }
  await owner.reload(); await owner.waitForSelector('[data-act="page"][data-v="queue"]'); await click(owner, '[data-act="page"][data-v="queue"]');
  await owner.waitForSelector('[data-act="decide"]');
  ok(await owner.locator('[data-act="decide"][data-v="breach"]').count() === 1, "the flag on the friend's review waits in the queue with the AI verdict");
  await owner.screenshot({ path: "/tmp/candid-owner-queue.png" });
  await click(owner, '[data-act="decide"][data-v="low quality"]'); await settle(owner);
  await click(owner, '[data-act="page"][data-v="issues"]'); await owner.waitForSelector('[data-act="unlock"]');
  await click(owner, '[data-act="unlock"]'); await settle(owner); await owner.waitForSelector(".drawer .qa");
  ok((await owner.locator(".drawer .qa").textContent()).includes("gate code"), "unlocking opens the full issue in the drawer");
  await click(owner, '[data-act="status"][data-v="will use"]'); await settle(owner);
  await click(owner, '[data-act="close"].x');
  await click(owner, '[data-act="page"][data-v="payouts"]'); await owner.waitForSelector('[data-act="markPaid"]');
  const n = await owner.locator('[data-act="markPaid"]').count();
  ok(n === 4, "four payouts are released: three review fees and one issue share (" + n + ")");
  await click(owner, '[data-act="markPaid"]'); await settle(owner);
  ok(await owner.locator(".chip.good").filter({ hasText: "Paid" }).count() >= 1, "marking one paid shows it paid");
  await click(owner, '[data-act="page"][data-v="overview"]'); await owner.waitForSelector(".tiles");
  ok((await owner.locator(".topbar .chip").textContent()).includes("Closed"), "the period is closed");
  await owner.screenshot({ path: "/tmp/candid-owner-overview.png" });
  await phones[1].reload(); await phones[1].waitForSelector(".tile");
  const feeTile = await phones[1].locator(".tile").filter({ hasText: "Review fee" }).textContent();
  ok(/released|paid/.test(feeTile), "the flagged-then-cleared reviewer sees their fee released (" + feeTile.trim().replace(/\s+/g, " ") + ")");
  const mobileOwner = await page(400); await mobileOwner.goto(base + "/app"); await mobileOwner.waitForSelector("#pass");
  await mobileOwner.fill("#pass", "browser-passcode"); await click(mobileOwner, '[data-act="login"]'); await mobileOwner.waitForSelector(".tiles");
  await mobileOwner.screenshot({ path: "/tmp/candid-owner-mobile.png" });
  ok(!(await mobileOwner.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), "the owner app has no horizontal scroll at phone width");
} catch (e) { ok(false, "browser run threw: " + e.message); }
ok(errors.length === 0, "no page errors (" + errors.join(" | ") + ")");
await browser.close(); server.kill();
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
