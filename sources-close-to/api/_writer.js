/* The editor. Turns a pile of anonymous tips into a full tabloid issue.
   Structured output so the layout engine can trust every field. */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

export const MagazineSchema = z.object({
  masthead_tagline: z.string().describe('Under the masthead. Six to ten words. A joke about the paper itself.'),
  issue_line: z.string().describe('e.g. "Special Birthday Edition. Est. the year they were born."'),
  cover: z.object({
    kicker: z.string().describe('Two to four words above the headline, all caps energy: EXCLUSIVE, WORLD FIRST, SHOCK'),
    headline: z.string().describe('The front page splash. Three to seven words. The single funniest tip, made huge.'),
    standfirst: z.string().describe('One sentence under the headline, 15 to 25 words.'),
    teasers: z.array(z.string()).min(3).max(4).describe('Cover teasers for inside stories, each under 8 words.'),
    caption: z.string().describe('Caption for the cover photo, or for where one would be. Under 12 words.'),
  }),
  lead: z.object({
    headline: z.string(),
    byline: z.string().describe('A parody byline, e.g. "By our Chief Investigations Correspondent"'),
    paragraphs: z.array(z.string()).min(5).max(7).describe('The main story. Tabloid register: short paragraphs, quotes from "a source", "insiders", "a close friend who asked not to be named". Use at least four different tips.'),
    pull_quote: z.string().describe('One quote lifted from the story, under 15 words.'),
  }),
  interview: z.object({
    headline: z.string(),
    intro: z.string().describe('One paragraph setting up a sit-down with "a source close to" the subject.'),
    qa: z.array(z.object({ q: z.string(), a: z.string() })).min(5).max(6),
  }),
  spotted: z.object({
    headline: z.string().describe('e.g. "SPOTTED" or "SEEN AND HEARD"'),
    items: z.array(z.string()).min(5).max(7).describe('Gossip-column one-liners. Each begins with a place or time, like a real Spotted column.'),
  }),
  listicle: z.object({
    headline: z.string().describe('A ranked list, e.g. "The 5 Worst Decisions of a Legendary Career"'),
    items: z.array(z.object({ title: z.string(), blurb: z.string() })).min(5).max(5),
  }),
  agony: z.object({
    headline: z.string(),
    letter: z.string().describe('A letter to the agony aunt, written as if by the subject, about a habit the tips describe. 60 to 100 words.'),
    signoff: z.string().describe('e.g. "Sleepless in Semaphore"'),
    reply: z.string().describe('The columnist\'s reply. 60 to 100 words. Affectionate but unhelpful.'),
  }),
  horoscope: z.object({
    sign: z.string().describe('Their star sign if the occasion gives a date, else invent a sign for them, e.g. "Bunnings Rising"'),
    reading: z.string().describe('40 to 70 words.'),
    lucky: z.string().describe('"Lucky number: ..., lucky item: ..." drawn from the tips.'),
  }),
  classifieds: z.array(z.object({ heading: z.string(), body: z.string() })).min(6).max(6).describe('Small ads that only make sense if you know them: FOR SALE, WANTED, LOST, MISSED CONNECTIONS, PUBLIC NOTICE, SERVICES.'),
  ad: z.object({
    brand: z.string().describe('A parody product only they would need.'),
    slogan: z.string(),
    fine_print: z.string().describe('Two sentences of terms and conditions, deadpan.'),
  }),
  numbers: z.array(z.object({ figure: z.string(), label: z.string() })).min(4).max(4).describe('"By the numbers" box. figure is a short number or stat like "19°" or "4x weekly", label under 8 words. Invented from the tips.'),
  poll: z.object({
    question: z.string().describe('A readers\' poll question about the subject, under 14 words.'),
    results: z.array(z.object({ option: z.string(), pct: z.number().int().min(0).max(100) })).min(3).max(4).describe('Percentages sum to 100. Last option is the joke.'),
  }),
  next_issue: z.array(z.string()).min(3).max(3).describe('"Coming next issue" teasers, each under 10 words, about the same person.'),
  photo_captions: z.array(z.string()).describe('One caption per photo supplied, in the same order, each under 14 words, written as a tabloid caption. Empty array if no photos.'),
  editors_note: z.string().describe('The one sincere thing in the issue. 60 to 90 words, from the contributors to the subject, no jokes, says why they are loved. Signed "The Newsroom".'),
});

export function buildPrompt(doc) {
  const s = doc.subject;
  const tips = doc.tips.map((t, i) => `${i + 1}. ${t.text}  [from ${t.by}]`).join('\n');
  const photos = doc.photos.length
    ? doc.photos.map((p, i) => `${i + 1}. ${p.caption || '(no caption)'}  [from ${p.by}]`).join('\n')
    : '(none)';
  return `Write a complete issue of the tabloid for this person.

SUBJECT: ${s.name} (${s.pronoun}/${s.pronoun === 'he' ? 'him' : s.pronoun === 'she' ? 'her' : 'them'})${s.city ? `, of ${s.city}` : ''}
OCCASION: ${doc.occasion}
COMMISSIONED BY: ${doc.buyer.name || 'a friend'}${doc.buyer.relationship ? ` (${doc.buyer.relationship})` : ''}

THE TIPS, as submitted anonymously by friends and family:
${tips}

PHOTOS SUPPLIED (describe nothing you cannot see; you only have these captions):
${photos}

Use every tip at least once somewhere in the issue. The funniest tip is the cover. Return only the structured issue.`;
}

export const SYSTEM = `You are the editor of "Sources Close To", a one-issue tabloid newspaper written about one ordinary person, commissioned by their friends as a gift. You write in the register of a British red-top or an Australian Sunday paper: short punchy paragraphs, breathless kickers, quotes attributed to "a source", "insiders" and "a close friend who asked not to be named", puns in headlines, mock outrage over trivial habits.

Rules that are not negotiable:
- Everything is affectionate. The reader is the subject, reading it aloud at their own party. Roast the habits, never the person. Nothing about weight, appearance, health, sexuality, relationships ending, money troubles, or anything a tip hints is genuinely painful. If a tip is cruel, leave it out.
- Use only what the tips give you. Do not invent facts about real third parties. You may invent sources, correspondents, experts, polls and fake products freely.
- Australian English spelling. No em dashes or en dashes anywhere; use commas, full stops or colons.
- Names exactly as given. Do not use surnames unless a tip does.
- Every tip appears at least once. Spread them across sections; do not repeat the same tip in three places.
- The editor's note at the end is sincere and warm, no jokes. It is the reason the whole thing exists.
- Keep each field within its described length. The layout has fixed slots.`;

export async function writeIssue(doc) {
  if (process.env.MOCK_GENERATE === '1') {
    const { fixture } = await import('./_fixture.js');
    return fixture(doc);
  }
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { format: zodOutputFormat(MagazineSchema), effort: 'high' },
    messages: [{ role: 'user', content: buildPrompt(doc) }],
  });
  if (response.stop_reason === 'refusal') {
    throw Object.assign(new Error('The editor declined this one. Check the tips for anything unkind and try again.'), { code: 'refusal' });
  }
  if (!response.parsed_output) throw new Error('The issue came back unreadable. Try again.');
  return response.parsed_output;
}
