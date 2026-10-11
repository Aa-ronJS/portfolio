// The four places Claude helps, and what happens without it.
//
// Every call here is advisory: it scores, categorises, deduplicates or triages, and a rule or a person decides.
// Without ANTHROPIC_API_KEY, or when a call fails, a plain heuristic answers instead and says so in `by`, so a
// Claude outage never blocks a submission, a payout or a close. Tests swap the client through globalThis.__candidAI.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CATEGORIES, FLAG_REASONS } from "./_engine.js";

const MODEL = "claude-opus-5-5";
const client = () => globalThis.__candidAI || (process.env.ANTHROPIC_API_KEY ? new Anthropic() : null);

const ReviewScore = z.object({ onBrief: z.number(), quality: z.number(), flag: z.enum(["none", ...FLAG_REASONS]) });
const BugScore = z.object({ category: z.enum(CATEGORIES), teaser: z.string(), onBrief: z.number(), quality: z.number() });
const Dup = z.object({ duplicateOf: z.string() });
const Triage = z.object({ verdict: z.enum(["clear", "breach", "unsure"]), confidence: z.number(), reasoning: z.string() });

async function ask(system, user, schema) {
  const c = client(); if (!c) return null;
  try {
    const r = await c.beta.messages.parse({
      model: MODEL, max_tokens: 1500, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      system, messages: [{ role: "user", content: user }],
    });
    if (r.stop_reason === "max_tokens" || r.stop_reason === "refusal" || !r.parsed_output) return null;
    return r.parsed_output;
  } catch (e) { return null; }
}

// ---- heuristics: deterministic, explainable, and what the tests run against
const words = (s) => (String(s).toLowerCase().match(/[a-z]{4,}/g) || []);
export function specificity(text) {
  const t = String(text).toLowerCase(); let n = 0;
  n += /\d/.test(t) ? 2 : 0;
  n += (t.match(/\b(when|because|then|but|so|while|nearly|until|said|asked)\b/g) || []).length;
  n += Math.min(3, Math.floor(t.length / 180));
  const generic = (t.match(/\b(great|perfect|loved|recommend\w*|amazing|easy|friendly|quality|value|stars)\b/g) || []).length;
  return Math.max(0, n - generic);
}
function hOnBrief(text, b) {
  const stop = ["would", "about", "clear", "anything", "there", "what", "when", "were", "with", "that", "this", "your"];
  const want = new Set(b.wants.flatMap(words).filter((w) => !stop.includes(w)));
  const hit = new Set(words(text).filter((w) => want.has(w)));
  return Math.round(Math.min(95, 30 + (hit.size / Math.max(4, want.size)) * 160));
}
const hQuality = (text) => Math.round(Math.min(95, 20 + specificity(text) * 9));
function hCategory(bug) {
  const t = (bug.title + " " + bug.happened).toLowerCase();
  if (/no field|nowhere|no way|missing|no option/.test(t)) return "missing step";
  if (/says|promis|not the same|different/.test(t)) return "inaccuracy";
  if (/pay|price|\$|charge|cost/.test(t)) return "pricing";
  if (/email|text|sms|message|note/.test(t)) return "communication";
  if (/should|loyalty|program|offer/.test(t)) return "suggestion";
  return "wrong step";
}
function hTeaser(bug) { const cut = String(bug.happened).split(/,| but | and | so | which |\. /)[0].trim(); return (cut.length > 72 ? cut.slice(0, 70).replace(/\s+\S*$/, "") : cut).replace(/\.$/, "") + "…"; }
function jaccard(a, b) { const A = new Set(words(a)), B = new Set(words(b)); let i = 0; A.forEach((w) => { if (B.has(w)) i++; }); return i / Math.max(1, A.size + B.size - i); }
function hTriage(f) {
  const sp = specificity(f.text);
  if (f.reason === "pasted from elsewhere" && sp <= 1) return { verdict: "breach", confidence: 0.82, reasoning: "No detail that could only come from using this product. Reads as boilerplate." };
  if (f.reason === "unfairly positive" && sp <= 2) return { verdict: "unsure", confidence: 0.55, reasoning: "Positive with no specifics" + (f.knew === "yes" ? ". Reviewer declared they knew the business." : ".") };
  if (sp >= 4) return { verdict: "clear", confidence: 0.9, reasoning: "Specific, checkable details consistent with other reviews in the period." };
  return { verdict: "unsure", confidence: 0.5, reasoning: "Not enough detail to decide either way." };
}

// ---- the four calls
export const ai = {
  async scoreReview(rv, b) {
    const text = rv.sections.join("\n") + "\n" + rv.closing.join("\n");
    const got = await ask(
      "You score a private product review against a business brief for a feedback platform. onBrief (0-100) is how directly it answers the brief's questions. quality (0-100) is how specific, reproducible and actionable it is, in the reviewer's own words. Set flag only when the text is clearly boilerplate pasted from elsewhere or clearly not about this product; otherwise \"none\". Known issues are not worth repeating and should not raise the score.",
      `Brief questions: ${JSON.stringify(b.wants)}\nKnown issues: ${JSON.stringify(b.known)}\nWill not change: ${JSON.stringify(b.wontChange)}\n\nReview:\n${text}`, ReviewScore);
    if (got) return { onBrief: got.onBrief, quality: got.quality, flag: got.flag === "none" ? null : got.flag, by: "claude" };
    return { onBrief: hOnBrief(text, b), quality: hQuality(text), flag: specificity(text) === 0 && !/\d/.test(text) && /recommend|five stars|quality/.test(text.toLowerCase()) ? "pasted from elsewhere" : null, by: "heuristic" };
  },
  async scoreBug(bug, b) {
    const text = bug.title + ". " + bug.happened + " " + bug.instead;
    const got = await ask(
      "You categorise a process issue reported about a business (not a software bug) and write a teaser. The teaser is one line under 80 characters that names the affected step but gives away no fix, because the business pays to unlock the full text. onBrief (0-100) is how closely it relates to what the brief asks about; quality (0-100) is specific, reproducible, actionable.",
      `Brief questions: ${JSON.stringify(b.wants)}\nWill not change: ${JSON.stringify(b.wontChange)}\nAlready known: ${JSON.stringify(b.known)}\n\nIssue: ${text}\nWhere: ${bug.where}`, BugScore);
    if (got) return { ...got, by: "claude" };
    return { category: hCategory(bug), teaser: hTeaser(bug), onBrief: hOnBrief(text, b), quality: hQuality(bug.happened + " " + bug.instead), by: "heuristic" };
  },
  async findDuplicate(bug, cands) {
    const got = await ask(
      "You decide whether a newly reported process issue is the same issue as one already on the list. Answer with the existing id, or \"none\". Same root cause at the same step is a duplicate; a different step or a different cause is not.",
      `Existing: ${JSON.stringify(cands.map((c) => ({ id: c.id, title: c.title, happened: String(c.happened || "").slice(0, 200) })))}\n\nNew: ${JSON.stringify(bug)}`, Dup);
    if (got) return got.duplicateOf === "none" ? null : got.duplicateOf;
    const best = cands.map((c) => ({ c, s: jaccard(c.title + " " + (c.happened || ""), bug.title + " " + bug.happened) })).sort((a, b) => b.s - a.s)[0];
    return best && best.s >= 0.25 ? best.c.id : null;
  },
  async triage(f) {
    const got = await ask(
      "A submission on a paid private feedback platform was flagged. Decide whether the flag is right. breach = the terms were broken (the text is untruthful, pasted boilerplate, abusive, or not about the product). clear = the flag is wrong and the submission is honest. unsure = a person should look. Honest but harsh, or honest but brief, is never a breach. Give a confidence from 0 to 1 and one sentence of reasoning.",
      `Flag reason: ${f.reason}\nReviewer declared they knew the business before: ${f.knew}\n\nSubmission:\n${f.text}\n\nOther reviews from the same period, for comparison:\n${f.peers.join("\n---\n")}`, Triage);
    if (got) return { ...got, by: "claude" };
    return { ...hTriage(f), by: "heuristic" };
  },
};
export const aiOn = () => !!(globalThis.__candidAI || process.env.ANTHROPIC_API_KEY);
