# Character animation pipeline

Turns the 16 hand-drawn pose frames in `frames/` into `shakespeare.mp4`:
a ~28 second clip of the character reading the opening of Jaques' "All the
world's a stage" speech (As You Like It, Act II Scene VII) against a pastel
yellow background.

## How it works

1. **Frames** — one base drawing redrawn in six postures (arms crossed,
   shrug, open palm, pointing, hands in pockets, T-pose rig reference),
   each in eyes open/closed x mouth open/closed variants. File names encode
   the state: `shrug_eo_mc.jpg` = shrug, eyes open, mouth closed.
2. **Voice** — Piper TTS (`en_GB-alan-medium`) reads `script.txt` into
   `speech.wav`.
3. **Compositing** (`build.py`) — the near-white paper background is keyed
   out (flood-labelled from the border so the whites inside the drawing
   survive), then frames are composited at 24 fps: the mouth is driven by
   the speech RMS envelope, blinks and posture changes run on a schedule,
   and the character drifts, bobs, and casts a soft grounding shadow.
4. **Encode** — ffmpeg muxes the frames with the audio into H.264/AAC.

## Rebuilding

```sh
pip install pillow numpy scipy piper-tts
apt-get install ffmpeg
cd animation
# fetch the voice model (63 MB, not committed):
curl -sSL -o voice/en_GB-alan-medium.onnx \
  "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_GB/alan/medium/en_GB-alan-medium.onnx"
curl -sSL -o voice/en_GB-alan-medium.onnx.json \
  "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_GB/alan/medium/en_GB-alan-medium.onnx.json"
python3 -m piper -m voice/en_GB-alan-medium.onnx -i script.txt -f speech.wav \
  --length-scale 1.05 --sentence-silence 0.35
python3 build.py
```

`speech.wav` is committed, so `python3 build.py` alone reproduces the video
without the voice model.
