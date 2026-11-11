# voice-agent — phone calls in my voice, toward a goal

Give it a phone number and a goal. It rings, has the conversation in a
clone of my voice, and saves the transcript, a summary, the extracted
answer and the recording.

    node call.mjs +61299990000 "Find out the fee and lead time for a boundary survey" \
      --who "Smith Surveying" --context "600sqm residential block, Newcastle NSW"

Results land in `calls/<date>_<number>/` (`call.md`, `audio.mp3`,
`raw.json`). `calls/` and `.env` are gitignored: this repo is public.

## How it works

ElevenLabs does the whole live loop (speech recognition, the language
model, the cloned voice, turn-taking) and talks to Twilio directly, so
there is no server of ours in the audio path. That is what keeps the
reply gap short. The two scripts here only configure the agent and
start/collect calls. No dependencies; Node 22+.

## One-time setup

1. **ElevenLabs account** on a plan that includes voice cloning.
   Create an API key (Developers > API keys).
2. **Clone the voice.** Voices > Add voice.
   - *Instant clone*: 1 to 2 minutes of clean audio. Good enough to test today.
   - *Professional clone*: about 30 minutes or more of audio, takes a few hours to train,
     noticeably closer. Do this one before relying on it.
   Record the way you talk on the phone, not the way you read aloud. Copy the voice ID.
3. **Twilio number.** Buy a voice-capable number. An Australian number
   needs a regulatory bundle (ID and an Australian address), which can take
   a day or more to approve. Then in ElevenLabs: Agents > Phone numbers >
   Import from Twilio (paste the number, Account SID and Auth Token).
   A Twilio trial account can only ring numbers you have verified, which
   is fine for testing on your own mobile.
4. `cp .env.example .env`, fill in `ELEVENLABS_API_KEY` and `VOICE_ID`.
5. `node setup-agent.mjs`, then paste the printed `AGENT_ID` into `.env`.
6. Ring your own mobile first:
   `node call.mjs +614XXXXXXXX "Find out what time the office opens on Saturday"`

To change how it talks, edit the prompt in `setup-agent.mjs` and run it
again (with `AGENT_ID` set it updates in place).

## Tuning speed

- `AGENT_LLM` (default `claude-haiku-5-5`): the model choice is most of the reply gap.
- `TTS_MODEL`: left unset it uses the platform default. The `flash` models are the quickest.
- `TURN_EAGERNESS=eager` makes it jump in sooner. It will also talk over
  people who pause mid-sentence while reading out a number, so try it on
  yourself first.

## What it says about itself

It opens by saying it is my AI assistant and that the call is recorded,
and it will not claim to be a person. That is deliberate:

- Recording a call without telling the other side is an offence in several
  Australian states. The opening line is what makes the recording usable.
- A surveyor or planner who works out halfway through that they were not
  told is one who stops taking the calls.

It also will not agree to pay for or commit to anything; it says I'll
confirm myself.

## Not yet tested

The scripts have been run against a mock of the ElevenLabs API, not the
real thing: no account existed when they were written. If
`setup-agent.mjs` is rejected the error prints the field at fault; the
likeliest candidate is the `voicemail_detection` tool shape.
