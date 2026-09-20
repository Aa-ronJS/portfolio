#!/usr/bin/env bash
# One-shot environment setup for the animation pipeline.
# Safe to re-run; each step is skipped when already satisfied.
#
#   ./setup.sh            core pipeline (render, ingest, split, scaffold)
#   ./setup.sh --whisper  also install faster-whisper, needed for
#                         'puppet.py direct' and auto-captions
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v ffmpeg >/dev/null; then
    echo "== installing ffmpeg"
    if command -v apt-get >/dev/null; then
        apt-get update -qq && apt-get install -y -qq ffmpeg \
            || sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg
    elif command -v brew >/dev/null; then
        brew install ffmpeg
    else
        echo "install ffmpeg manually, then re-run" >&2
        exit 1
    fi
fi

echo "== installing python deps"
pip install -q pillow numpy pyyaml scipy

if [ "${1:-}" = "--whisper" ]; then
    echo "== installing faster-whisper (voice-directed mode + auto-captions)"
    pip install -q faster-whisper
fi

echo "== smoke test: regenerating demo assets and rendering one frame"
python3 demo/make_demo_assets.py >/dev/null
python3 pipeline/render.py demo/episode.yaml --still 1.0 /tmp/pipeline-smoke.png
rm -f /tmp/pipeline-smoke.png
echo "== ready. try: python3 pipeline/render.py demo/episode.yaml --draft"
