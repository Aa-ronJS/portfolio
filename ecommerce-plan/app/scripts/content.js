'use strict';
// Drafts answer pages for the questions buyers type into Google and ChatGPT.
// Every draft carries the compliance constraints in the system prompt and a
// verify-before-publishing checklist at the top. You read, you fix, you publish.
//
//   node scripts/content.js topics.txt            # one topic per line
//   node scripts/content.js "vehicle first aid kit requirements for tradies in SA"
//
// Credentials: ANTHROPIC_API_KEY, or `ant auth login`. Output: content/<slug>.md
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.CONTENT_MODEL || 'claude-opus-5';
const BRAND = process.env.BRAND || 'Kit Register';
const OUT = path.join(__dirname, '..', 'content');

const SYSTEM = `You write short, accurate answer pages for an Australian small-business audience (tradies, practice managers, childcare directors) about workplace first-aid compliance, for ${BRAND}, an Adelaide business that keeps first-aid kits stocked on a replenishment plan and issues a compliance record.

Hard rules, never break them:
- Never say "TGA approved". Say "supplied by a TGA-listed Australian manufacturer" where relevant.
- Never say the product "guarantees compliance". The duty to assess first-aid needs, provide trained first aiders and keep kits accessible stays with the person conducting the business or undertaking under the Work Health and Safety Act 2012 (SA) and the model WHS Regulations.
- Cite the Safe Work Australia model Code of Practice: First aid in the workplace as the source for kit contents and check frequency (audit at least every 12 months, more often for higher-risk workplaces; contents in its example list; a work vehicle is a workplace).
- Mark any figure or requirement you are not certain of with [VERIFY] so a human checks it before publishing. Do not invent statistics, prices, penalties or dates.
- Australian English. Plain words. No hype.

Format: a Markdown page with YAML front matter (title, description under 155 characters, slug, questions_answered as a list, sources as a list of URLs you are confident exist). Then: the direct answer in two to four sentences first; then the detail under short headings; then a short "How ${BRAND} handles this" section of at most 80 words; then a FAQ of three questions with two-sentence answers. 500 to 800 words. Write so that a search engine or an AI assistant could quote the first paragraph as the answer.`;

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }

async function draft(client, topic) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Write the answer page for: ${topic}` }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error(`refused: ${msg.stop_details && msg.stop_details.category}`);
  return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

async function main() {
  const arg = process.argv[2];
  if (!arg) { console.error('usage: node scripts/content.js topics.txt | "topic"'); process.exit(1); }
  const topics = fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8').split('\n').map((t) => t.trim()).filter(Boolean) : [arg];
  fs.mkdirSync(OUT, { recursive: true });
  const client = new Anthropic();
  for (const topic of topics) {
    const file = path.join(OUT, slugify(topic) + '.md');
    if (fs.existsSync(file)) { console.log('skip (exists)', file); continue; }
    process.stdout.write(`drafting: ${topic} ... `);
    try {
      const text = await draft(client, topic);
      const header = `<!-- DRAFT. Before publishing: (1) check every [VERIFY]; (2) confirm each source URL opens and says what is claimed; (3) confirm no "TGA approved" and no "guarantees compliance"; (4) add Product/FAQ structured data; (5) read it aloud once. Model: ${MODEL}, ${new Date().toISOString()} -->\n\n`;
      fs.writeFileSync(file, header + text);
      console.log('ok ->', path.relative(process.cwd(), file));
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) { console.error('\nNo credentials: set ANTHROPIC_API_KEY or run `ant auth login`.'); process.exit(1); }
      if (e instanceof Anthropic.RateLimitError) { console.error('\nrate limited; wait and rerun'); process.exit(1); }
      console.error('\nfailed:', e.message);
    }
  }
}

main();
