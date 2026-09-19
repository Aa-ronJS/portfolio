// POST /api/demo
// Body: { image: <base64 jpeg/png, no data: prefix>, media_type: "image/jpeg", notes: "optional text" }
// Returns a sample painting quote worked out from the photo, using the demo price list below.
//
// Guardrails: 3 MB image cap, per-IP and per-instance daily caps, no storage of images,
// and a canned example when ANTHROPIC_API_KEY is not configured so the page still works.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const MODEL = "claude-opus-5";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const PER_IP_LIMIT = Number(process.env.DEMO_PER_IP_LIMIT || 6);      // per 10 minutes, per instance
const DAILY_CAP = Number(process.env.DEMO_DAILY_CAP || 400);          // per instance per day

// Demo rates only. The real pack uses the painter's own price-list.md.
const PRICE_LIST = `
Interior (ex GST, labour and mid-range trade paint included):
- Walls, 2 coats, light prep: $22 per m2
- Ceilings, 2 coats: $25 per m2
- Skirting boards and architraves: $9 per lineal m
- Door, both sides incl. frame: $95 each
- Window frame, interior: $65 each
- Feature wall colour change: $28 per m2
- Moderate prep (patching, sanding): $65 per hour
- Heavy prep (water damage, peeling): $80 per hour
- Stain block / sealer over patched areas: $8 per m2
Exterior: weatherboards $38/m2, render or brick $30/m2, eaves and fascia $16/lm,
gutters and downpipes $12/lm, exterior door $140, exterior window $95, deck oil $24/m2, fence $18/m2.
Rules: minimum job $450. GST 10% is added to the subtotal.
Measuring: assume 2.4 m ceilings unless the photo clearly shows higher. Wall area = perimeter x height
minus 1.7 m2 per door and 1.5 m2 per window. Condition: good = included; fair = +1 hr moderate prep per 20 m2;
poor = +1 hr heavy prep per 10 m2 plus sealer coat.
`;

const SYSTEM = `You are the estimator for a small Australian house-painting business. You produce a fast,
honest sample quote from one phone photo of a room, wall, or exterior, plus optional notes.

Use ONLY the price list below. If the photo is not of a paintable surface (a person, a pet, a screenshot,
a car), set not_paintable to true, explain kindly in one sentence in notes, and return no line items.

Estimate sizes from what is visible: furniture, doors (about 2.04 m tall), standard bricks (76 mm high),
power points (about 300 mm off the floor). Notes from the person always win over your visual estimate.
Quote only what is visible or described; do not invent extra rooms. Write for a homeowner: plain words,
no jargon. Quantities to one decimal place, prices to whole dollars. The server recalculates totals, so
concentrate on getting quantities, rates and assumptions right.

${PRICE_LIST}`;

const LineItem = z.object({
  description: z.string(),
  qty: z.number(),
  unit: z.string(),
  rate: z.number(),
});
const Quote = z.object({
  not_paintable: z.boolean(),
  job_title: z.string(),
  what_i_can_see: z.string(),
  condition: z.enum(["good", "fair", "poor", "unknown"]),
  line_items: z.array(LineItem),
  assumptions: z.array(z.string()),
  questions_for_client: z.array(z.string()),
  notes: z.string(),
});

const ipHits = new Map();
let dailyCount = 0;
let dailyStamp = new Date().toISOString().slice(0, 10);

function rateLimited(ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyStamp) { dailyStamp = today; dailyCount = 0; ipHits.clear(); }
  if (dailyCount >= DAILY_CAP) return "The demo has hit its daily limit. Try again tomorrow, or watch the video above.";
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= PER_IP_LIMIT) return "That is a few tries in a row. Give it ten minutes and try again.";
  hits.push(now);
  ipHits.set(ip, hits);
  dailyCount += 1;
  return null;
}

function finish(items) {
  const line_items = items.map((li) => ({ ...li, amount: Math.round(li.qty * li.rate) }));
  let subtotal = line_items.reduce((s, li) => s + li.amount, 0);
  let minimum_applied = false;
  if (line_items.length && subtotal < 450) { subtotal = 450; minimum_applied = true; }
  const gst = Math.round(subtotal * 0.1);
  return { line_items, subtotal, gst, total: subtotal + gst, minimum_applied };
}

const SAMPLE = {
  sample: true,
  not_paintable: false,
  job_title: "Lounge room, walls and ceiling",
  what_i_can_see: "A lounge about 5 m by 4 m with a standard ceiling, two windows, one door and skirting boards. Walls look sound with one patched area near the TV.",
  condition: "good",
  assumptions: ["Ceiling height 2.4 m", "Two coats of low-sheen acrylic in a similar colour", "Furniture moved to the centre of the room by the client"],
  questions_for_client: ["Are you changing colour, or refreshing the same one?", "Do you want the door and window frames done in gloss?"],
  notes: "This is an example result. Connect the demo server to quote your own photo.",
  ...finish([
    { description: "Walls, 2 coats, light prep", qty: 39.8, unit: "m2", rate: 22 },
    { description: "Ceiling, 2 coats", qty: 20, unit: "m2", rate: 25 },
    { description: "Skirting boards", qty: 17.1, unit: "lm", rate: 9 },
    { description: "Door, both sides incl. frame", qty: 1, unit: "each", rate: 95 },
    { description: "Window frames", qty: 2, unit: "each", rate: 65 },
    { description: "Patch and sealer where TV bracket was", qty: 0.5, unit: "hour", rate: 65 },
  ]),
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  if (process.env.DEMO_DISABLED === "1") return json(res, 503, { error: "The live demo is switched off right now. Watch the video above." });

  let body;
  try { body = await readBody(req); } catch { return json(res, 400, { error: "Could not read that request." }); }

  const image = typeof body.image === "string" ? body.image.replace(/^data:[^,]+,/, "") : "";
  const media_type = ["image/jpeg", "image/png", "image/webp"].includes(body.media_type) ? body.media_type : "image/jpeg";
  const notes = String(body.notes || "").slice(0, 600);
  if (!image) return json(res, 400, { error: "Add a photo first." });
  if (Buffer.byteLength(image, "base64") > MAX_IMAGE_BYTES) return json(res, 413, { error: "That photo is too large. Try again; the page should shrink it automatically." });

  const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const limited = rateLimited(ip);
  if (limited) return json(res, 429, { error: limited });

  if (!process.env.ANTHROPIC_API_KEY) return json(res, 200, SAMPLE);

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "medium", format: zodOutputFormat(Quote) },
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type, data: image } },
          { type: "text", text: notes ? `Notes from the person: ${notes}` : "No notes given. Quote what you can see." },
        ],
      }],
    });

    if (response.stop_reason === "refusal") return json(res, 200, { not_paintable: true, notes: "That photo could not be quoted. Try a photo of a room or a wall." });
    if (response.stop_reason === "max_tokens" || !response.parsed_output) return json(res, 502, { error: "The estimator ran out of room. Try again." });

    const q = response.parsed_output;
    if (q.not_paintable) return json(res, 200, { not_paintable: true, job_title: q.job_title, notes: q.notes });
    return json(res, 200, { sample: false, ...q, ...finish(q.line_items) });
  } catch (err) {
    console.error("demo error:", err && err.constructor && err.constructor.name, err && err.message);
    if (err instanceof Anthropic.RateLimitError) return json(res, 429, { error: "The demo is busy right now. Try again in a minute." });
    if (err instanceof Anthropic.AuthenticationError) return json(res, 500, { error: "The demo server is not set up yet." });
    if (err instanceof Anthropic.APIError) return json(res, 502, { error: "The estimator had a problem. Try again." });
    return json(res, 500, { error: "Something went wrong. Try again." });
  }
}
