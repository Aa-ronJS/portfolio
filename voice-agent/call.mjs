#!/usr/bin/env node
// Make one call toward a goal, wait for it to finish, save what was said.
//
//   node call.mjs +61299990000 "Find out the fee and lead time for a boundary survey" \
//        --who "Smith Surveying" --context "Property is a 600sqm residential block in Newcastle"
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { api, need, HERE } from './lib.mjs';

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    who: { type: 'string', default: 'not known; ask who you are speaking with' },
    context: { type: 'string', default: 'none' },
    'max-minutes': { type: 'string', default: '10' },
  },
});
const [to, goal] = positionals;

if (!to || !goal) {
  console.error('Usage: node call.mjs <+E164 number> "<goal>" [--who "..."] [--context "..."] [--max-minutes 10]');
  process.exit(1);
}
if (!/^\+[1-9]\d{7,14}$/.test(to)) {
  console.error(`"${to}" is not a full international number. Use the form +61412345678.`);
  process.exit(1);
}

const agentId = need('AGENT_ID');
let phoneId = process.env.AGENT_PHONE_NUMBER_ID;
if (!phoneId) {
  const numbers = await api('GET', '/v1/convai/phone-numbers');
  if (!numbers.length) {
    console.error('No phone number is imported into ElevenLabs yet. See README step 3.');
    process.exit(1);
  }
  phoneId = numbers[0].phone_number_id;
  console.log(`Calling from ${numbers[0].phone_number}`);
}

const started = await api('POST', '/v1/convai/twilio/outbound-call', {
  agent_id: agentId,
  agent_phone_number_id: phoneId,
  to_number: to,
  conversation_initiation_client_data: {
    dynamic_variables: {
      owner_name: process.env.OWNER_NAME || 'Aaron',
      callback_number: process.env.CALLBACK_NUMBER || 'not available; say he will call back',
      goal,
      callee: opt.who,
      context: opt.context,
    },
  },
});
if (!started.success || !started.conversation_id) {
  console.error(`Call did not start: ${started.message || JSON.stringify(started)}`);
  process.exit(1);
}
const id = started.conversation_id;
console.log(`Ringing ${to} ... (conversation ${id})`);

// Wait for the call to end and the post-call analysis to land.
const deadline = Date.now() + (Number(opt['max-minutes']) + 3) * 60_000;
let convo, last = '';
for (;;) {
  await new Promise((r) => setTimeout(r, 4000));
  try {
    convo = await api('GET', `/v1/convai/conversations/${id}`);
  } catch (e) {
    if (e.status === 404 && Date.now() < deadline) continue; // not registered yet
    throw e;
  }
  if (convo.status !== last) { last = convo.status; console.log(`  ${last}`); }
  if (convo.status === 'done' || convo.status === 'failed') break;
  if (Date.now() > deadline) {
    console.error(`Still "${convo.status}" after the time limit. Check conversation ${id} in the ElevenLabs dashboard.`);
    break;
  }
}

// Save everything locally (calls/ is gitignored).
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const dir = path.join(HERE, 'calls', `${stamp}_${to.replace('+', '')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'raw.json'), JSON.stringify(convo, null, 2));

const a = convo.analysis || {};
const collected = Object.fromEntries(
  Object.entries(a.data_collection_results || {}).map(([k, v]) => [k, v && v.value]),
);
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const lines = (convo.transcript || [])
  .filter((t) => t.message)
  .map((t) => `**${mmss(t.time_in_call_secs || 0)} ${t.role === 'agent' ? 'Agent' : 'Them'}:** ${t.message}`);

const md = [
  `# Call to ${to}`,
  '',
  `- **Goal:** ${goal}`,
  `- **Who:** ${opt.who}`,
  `- **Status:** ${convo.status}${convo.metadata?.termination_reason ? ` (${convo.metadata.termination_reason})` : ''}`,
  `- **Length:** ${mmss(convo.metadata?.call_duration_secs || 0)}`,
  `- **Goal achieved:** ${collected.goal_achieved ?? 'unknown'}`,
  '',
  '## Answer', '', collected.answer || '_nothing captured_', '',
  '## Spoke to', '', collected.spoke_to || '_not given_', '',
  '## Follow-up', '', collected.follow_up || '_none_', '',
  '## Summary', '', a.transcript_summary || '_no summary_', '',
  '## Transcript', '', ...(lines.length ? lines : ['_no speech recorded_']), '',
].join('\n');
fs.writeFileSync(path.join(dir, 'call.md'), md);

if (convo.has_audio) {
  try {
    fs.writeFileSync(path.join(dir, 'audio.mp3'), await api('GET', `/v1/convai/conversations/${id}/audio`, null, { raw: true }));
  } catch (e) {
    console.error(`Could not download the recording: ${e.message.split('\n')[0]}`);
  }
}

console.log(`\n${md.split('## Transcript')[0].trim()}\n\nSaved to ${dir}`);
process.exit(convo.status === 'done' ? 0 : 2);
