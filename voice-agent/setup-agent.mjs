#!/usr/bin/env node
// Creates (or, with AGENT_ID set, updates) the phone agent on ElevenLabs.
// Run once after cloning your voice:  node setup-agent.mjs
import { api, need } from './lib.mjs';

const PROMPT = `You are making a phone call on behalf of {{owner_name}}. You are his AI assistant and you speak in his voice.

# Why you are calling
Goal: {{goal}}
Who you are calling: {{callee}}
Background you can use: {{context}}
Number they can call {{owner_name}} back on: {{callback_number}}

# How to talk
- This is a phone call. Talk like a relaxed, polite Australian on the phone: short sentences, one question at a time, plain words.
- Keep every turn to one or two sentences unless you are reading back details.
- Never use lists, headings, emoji or anything that only makes sense written down.
- Small acknowledgements are good ("yep", "right", "no worries"). Don't over-thank or over-apologise.
- If they are busy, ask when is better and note it.
- If you reach a receptionist or the wrong person, say who you are after and why, and ask to be put through or for the right number.

# Getting the goal done
- Work out what information or outcome the goal needs, and steer the call toward it. You have no script; follow the conversation.
- Read back anything exact: names, numbers, emails, dates, prices, addresses. Spell emails letter by letter.
- If they ask something you don't know from the background above, say you don't have that in front of you and that {{owner_name}} will follow up. Never make up facts about him, his property or his plans.
- Do not agree to pay for anything, sign up to anything, or commit {{owner_name}} to anything beyond what the goal says. Say he'll confirm himself.
- When the goal is met, or clearly can't be met on this call, recap what was agreed in one sentence, thank them, and end the call.

# Honesty
- You opened by saying you are an AI assistant and that the call is recorded. If asked, confirm both plainly. Never claim to be a human or to be {{owner_name}} himself.
- If they object to the recording or to talking to an AI, apologise, say {{owner_name}} will ring them himself, and end the call.

# Voicemail
If you hit voicemail, leave one short message: who you are calling for, why in one line, and the callback number if you have one. Then end the call.`;

const FIRST_MESSAGE =
  "Hi, this is {{owner_name}}'s AI assistant, calling on his behalf. Just so you know, the call's recorded so I can pass the details on to him. Have you got a quick minute?";

const sys = (name) => ({ type: 'system', name, description: '', params: { system_tool_type: name } });

const config = {
  name: 'Phone calls on my behalf',
  conversation_config: {
    agent: {
      first_message: FIRST_MESSAGE,
      language: 'en',
      prompt: {
        prompt: PROMPT,
        // A small fast model keeps the gap before each reply short.
        llm: process.env.AGENT_LLM || 'claude-haiku-5-5',
        temperature: 0.3,
        built_in_tools: {
          end_call: sys('end_call'),
          voicemail_detection: sys('voicemail_detection'),
        },
      },
    },
    tts: {
      voice_id: need('VOICE_ID'),
      ...(process.env.TTS_MODEL ? { model_id: process.env.TTS_MODEL } : {}),
      stability: 0.45,
      similarity_boost: 0.85,
      speed: 1.0,
    },
    turn: { turn_timeout: 7, turn_eagerness: process.env.TURN_EAGERNESS || 'normal' },
    conversation: { max_duration_seconds: 600 },
  },
  platform_settings: {
    data_collection: {
      goal_achieved: { type: 'boolean', description: 'Was the goal of the call achieved?' },
      answer: { type: 'string', description: 'The information obtained that answers the goal of the call, with every exact figure, date, name, price and contact detail given. Empty if none.' },
      spoke_to: { type: 'string', description: 'Name and role of the person spoken to, if given.' },
      follow_up: { type: 'string', description: 'Anything the caller\'s principal now needs to do, or that the other party promised to do, including when.' },
    },
  },
};

const existing = process.env.AGENT_ID;
try {
  if (existing) {
    await api('PATCH', `/v1/convai/agents/${existing}`, config);
    console.log(`Updated agent ${existing}`);
  } else {
    const { agent_id } = await api('POST', '/v1/convai/agents/create', config);
    console.log(`Created agent. Add this line to voice-agent/.env:\n\nAGENT_ID=${agent_id}\n`);
  }
} catch (e) {
  console.error(String(e.message));
  process.exit(1);
}
