#!/bin/bash
# Opens Claude Code in your business project folder.
# Setup also puts a copy of this on your Desktop called "Claude Code".
cd "$(dirname "$0")" || exit 1
bash "lib/start.sh" || read -r -p "Press Return to close this window. " _
