# Your voice

`voice.safetensors` lives here, in the channel's **private** repo only.
It is ~6 MB, made once from a short recording, and it is all the robot
needs to talk like you. Treat it like a password: anyone with it can make
you say anything.

## Recording the sample (5 minutes)

- 15–30 seconds of you talking, in the tone the channel uses. Read a
  paragraph of a real script aloud, don't recite the alphabet.
- Quiet room with soft furnishings (a wardrobe full of clothes is ideal).
  No music, no fan, no echo. Phone 20 cm from your mouth.
- Record 3 takes, export each as `.wav` (or `.m4a`, ffmpeg converts it),
  and keep the one that sounds most like you on a good day. The clone
  copies everything: tiredness, room echo, the fridge hum.

## Turning it into the voice file (once, on your computer)

```bash
pip install -r requirements.txt
# free account at huggingface.co, then accept the terms at
# https://huggingface.co/kyutai/pocket-tts (cloning your OWN voice is allowed)
hf auth login
python -m ac voice-export take2.wav
```

Then commit `voice/voice.safetensors` to the private repo. Re-run it any
time with a better take; nothing else changes.

To hear it before going live: set `publish.upload: false` in
`channel/config.yaml`, run `python -m ac make`, and watch the file in
`build/`.
