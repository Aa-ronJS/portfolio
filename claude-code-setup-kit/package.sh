#!/bin/bash
# Builds the two zip files you hand to customers.
# Run on macOS or Linux (the zip tool there keeps the "executable" flag
# that the Mac .command files need). Output goes to ./dist.
set -euo pipefail
cd "$(dirname "$0")"
VERSION="$(cat VERSION)"
rm -rf dist build && mkdir -p dist build

win="build/Claude Code Setup (Windows)"
mkdir -p "$win"
cp -R windows/. "$win/"
cp -R project-template "$win/project-template"
( cd build && zip -qr "../dist/claude-code-setup-windows-$VERSION.zip" "Claude Code Setup (Windows)" )

mac="build/Claude Code Setup (Mac)"
mkdir -p "$mac"
cp -R mac/. "$mac/"
cp -R project-template "$mac/project-template"
chmod +x "$mac"/*.command "$mac"/lib/*.sh
( cd build && zip -qr "../dist/claude-code-setup-mac-$VERSION.zip" "Claude Code Setup (Mac)" )

rm -rf build
ls -la dist
