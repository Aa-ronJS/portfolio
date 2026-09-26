// POST /api/read  { token, media_type: "image/jpeg" | "image/png" | "image/webp" | "application/pdf", data: <base64>, own: {...} }
// Reads a photo of a quote or invoice, or a PDF of one that has no text in it (a scan), and says who it is for,
// how much, the number and the dates. The phone reads text PDFs itself; this is for what it cannot read.
//
// Nothing is kept: the picture goes to the model once and the answer comes back. Each tradie gets a number of
// reads an hour and so does everyone together, because every read costs money. Without ANTHROPIC_API_KEY it says
// it is off, and the app lets him type it instead.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { cors, send, readJson, readToken } from "./_setup.js";
import { q, dbConfigured, ensureSchema } from "./_db.js";

const MODEL = "claude-opus-5";
const MAX_BYTES = 3 * 1024 * 1024;   // decoded; the request itself has to stay under the platform's body limit
const PER_HOUR = Number(process.env.READ_PER_HOUR || 30), ALL_PER_HOUR = Number(process.env.READ_ALL_PER_HOUR || 600);
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const Found = z.object({
  is_quote_or_invoice: z.boolean(),
  kind: z.enum(["quote", "invoice"]),
  customer_name: z.string(),
  customer_business: z.string(),
  customer_phone: z.string(),
  customer_email: z.string(),
  total_inc_gst: z.number(),
  amount_still_owing: z.number(),
  number: z.string(),
  date: z.string(),
  due_date: z.string(),
  what_for: z.string(),
});

const SYSTEM = `You read quotes and invoices that an Australian tradie has sent to a customer, from a photo or a scanned PDF,
so the tradie can follow them up. The tradie's own business details are given to you; they appear on the document as the
sender and must never be returned as the customer. The customer is who the quote or invoice is addressed to.

Return:
- is_quote_or_invoice: false if this is not a quote, estimate or invoice at all (then leave the rest empty or 0).
- kind: "invoice" for an invoice or tax invoice, otherwise "quote" (an estimate or proposal is a quote).
- customer_name: the person it is for, as written. If only a business is named, put the business name here too.
- customer_business: the customer's business if one is named, else "".
- customer_phone, customer_email: the customer's, as written, or "".
- total_inc_gst: the total the customer is asked to pay, including GST, as a number without "$". 0 if you cannot read it.
- amount_still_owing: for an invoice, the balance due if it differs from the total (a deposit already paid), else 0.
- number: the quote or invoice number exactly as printed (e.g. "QU-0042", "INV-1006"), or "".
- date: the date it was issued, as YYYY-MM-DD, or "". Australian dates are day first.
- due_date: for an invoice, the due date as YYYY-MM-DD, or "".
- what_for: a few words on the job, e.g. "Switchboard upgrade", or "".
Only return what is written on the document. Never guess a phone number, email or amount.`;

// Tests swap in a stand-in for the model.
export function makeClient() { return globalThis.__readClient || new Anthropic(); }
export const readOn = () => !!(globalThis.__readClient || process.env.ANTHROPIC_API_KEY);

async function spend(bucket, max) {
  const r = await q(
    `insert into signin_bucket (bucket, window_at, n) values ($1, now(), 1)
     on conflict (bucket) do update set
       n = case when signin_bucket.window_at > now() - interval '1 hour' then signin_bucket.n + 1 else 1 end,
       window_at = case when signin_bucket.window_at > now() - interval '1 hour' then signin_bucket.window_at else now() end
     returning n`, [bucket]);
  return r.rows[0].n <= max;
}

const clean = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n || 120);
const iso = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? String(s) : "");

export default async function handler(req, res) {
  if (!cors(req, res, "POST, OPTIONS")) return send(res, 403, { ok: false, error: "Not allowed from here" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  let body; try { body = await readJson(req, 4_400_000); } catch (e) { return send(res, 413, { ok: false, error: "That file is too big to read. Type it in instead." }); }
  const p = readToken(body.token, process.env.RELAY_SIGNING_SECRET);
  if (!p || !p.cus) return send(res, 401, { ok: false, error: "That sending token is not one of ours" });
  if (!readOn()) return send(res, 200, { ok: false, off: true, error: "Reading it is not switched on yet. Type it in." });

  const media_type = TYPES.includes(body.media_type) ? body.media_type : "";
  const data = String(body.data || "").replace(/^data:[^,]+,/, "").replace(/\s+/g, "");
  if (!media_type || !data) return send(res, 400, { ok: false, error: "That is not a photo or a PDF." });
  if (Buffer.byteLength(data, "base64") > MAX_BYTES) return send(res, 413, { ok: false, error: "That file is too big to read. Type it in instead." });

  if (dbConfigured()) {
    await ensureSchema();
    if (!(await spend("read:" + p.cus, PER_HOUR))) return send(res, 429, { ok: false, error: "That is a lot of reading for one hour. Type this one in, or try again later." });
    if (!(await spend("read:all", ALL_PER_HOUR))) return send(res, 429, { ok: false, error: "Reading is busy right now. Type this one in, or try again soon." });
  }

  const own = body.own && typeof body.own === "object" ? body.own : {};
  const ownLine = ["trading_name", "owner_name", "abn", "phone", "email", "address"].map((k) => own[k] ? k.replace("_", " ") + ": " + clean(own[k], 120) : "").filter(Boolean).join("\n") || "(not given)";
  const doc = media_type === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type, data } }
    : { type: "image", source: { type: "base64", media_type, data } };

  try {
    const client = makeClient();
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Found) },
      system: SYSTEM,
      messages: [{ role: "user", content: [doc, { type: "text", text: "The tradie who sent it:\n" + ownLine }] }],
    });
    if (response.stop_reason === "refusal") return send(res, 200, { ok: false, error: "That one could not be read. Type it in." });
    const got = response.parsed_output;
    if (response.stop_reason === "max_tokens" || !got) return send(res, 200, { ok: false, error: "That one could not be read. Type it in." });
    if (!got.is_quote_or_invoice) return send(res, 200, { ok: false, not_a_quote: true, error: "That does not look like a quote or an invoice." });
    const amount = got.kind === "invoice" && got.amount_still_owing > 0 ? got.amount_still_owing : got.total_inc_gst;
    return send(res, 200, { ok: true, item: {
      kind: got.kind, name: clean(got.customer_name, 80), business: clean(got.customer_business, 80), phone: clean(got.customer_phone, 30),
      email: clean(got.customer_email, 120).toLowerCase(), amount: amount > 0 && amount < 5_000_000 ? Math.round(amount * 100) / 100 : 0,
      number: clean(got.number, 30), date: iso(got.date), due: iso(got.due_date), what: clean(got.what_for, 80),
    } });
  } catch (err) {
    console.error("read error:", err && err.constructor && err.constructor.name, err && err.message);
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { ok: false, error: "Reading is busy right now. Try again in a minute, or type it in." });
    if (err instanceof Anthropic.APIError) return send(res, 502, { ok: false, error: "That did not read. Try again, or type it in." });
    return send(res, 500, { ok: false, error: "That did not read. Try again, or type it in." });
  }
}
