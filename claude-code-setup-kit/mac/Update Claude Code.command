#!/bin/bash
# Claude Code updates itself in the background. Use this only if you
# were told to, or if something seems out of date.
cd "$(dirname "$0")" || exit 1
bash "lib/update.sh"
echo
read -r -p "Press Return to close this window. " _
