# Your voice

Voice files live here, in the channels' **private** repo only. Each is
~6 MB, made once from a short recording, and it's all the robot needs to
talk like you. Treat them like passwords: anyone with one can make you
say anything.

The clone copies the *delivery* of the recording, not just the voice, so
one take per register gives each channel its own narrator:

| file | register | used by |
|---|---|---|
| `aaron-dry` | dry, wry, conversational | Aaron Steele, Odd Lines, Dry Fauna |
| `aaron-calm` | calm, unhurried, late-night | Slow Orbit |
| `aaron-measured` | measured, a little urgent | Restless Ground |
| `aaron-brisk` | brisk, economical | Hangar Archive |
| `aaron-warm` | warm, amused | Footnote Hour |

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
python -m ac voice-export dry-take2.wav aaron-dry
python -m ac voice-export calm-take1.wav aaron-calm   # and so on
```

Then commit the files in `voices/` to the private repo. Re-run it any
time with a better take; nothing else changes.

To hear it before going live: set `publish.upload: false` in a
channel's `channel.yaml`, run `python -m ac <channel> make`, and watch the file in
`build/`.
