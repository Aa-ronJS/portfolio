#!/bin/bash
# Builds the customer zip for the painters' pack into ./dist.
# Run on macOS or Linux so the .command installer keeps its executable bit.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist build && mkdir -p dist "build/Quote and Chase for Painters"
d="build/Quote and Chase for Painters"
cp "READ ME FIRST.txt" "Install Quote and Chase (Windows).bat" "Install Quote and Chase (Mac).command" "$d/"
cp -R windows mac pack "$d/"
cp -R course "$d/lessons"
chmod +x "$d"/*.command "$d"/mac/*.sh "$d"/pack/tools/*.sh
( cd build && zip -qr "../dist/quote-and-chase-painters.zip" "Quote and Chase for Painters" -x '*/.gitkeep' )
rm -rf build
ls -la dist
