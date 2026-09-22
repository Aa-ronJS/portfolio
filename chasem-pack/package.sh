#!/bin/bash
# Builds the customer zip for the painters' pack into ./dist.
# Run on macOS or Linux so the .command installer keeps its executable bit.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist build && mkdir -p dist "build/Chasem for Painters"
d="build/Chasem for Painters"
cp "READ ME FIRST.txt" "Install Chasem (Windows).bat" "Install Chasem (Mac).command" "$d/"
cp -R windows mac pack "$d/"
cp -R course "$d/lessons"
chmod +x "$d"/*.command "$d"/mac/*.sh "$d"/pack/tools/*.sh
( cd build && zip -qr "../dist/chasem-painters.zip" "Chasem for Painters" -x '*/.gitkeep' )
rm -rf build
ls -la dist
