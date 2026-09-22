#!/bin/bash
# Installs the Chasem pack into the "My Business" project folder
# that the Claude Code setup kit created. Safe to run again.
set -u
KIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACK="$KIT_ROOT/pack"
PROJECT="$HOME/Documents/Claude Projects/My Business"
say()  { printf '%s\n' "$*"; }
good() { printf '    \033[32mOK\033[0m  %s\n' "$*"; }
fail() { printf '\n\033[31mSTOPPED: %s\033[0m\n' "$*"; exit 1; }

say ""
say "  Chasem - install"
say "  This copies the pack into: $PROJECT"
say "  Your existing CLAUDE.md is kept as CLAUDE.core-backup.md."
say "  Files you have already edited (business details, price list, jobs.csv) are never overwritten."
say ""
read -r -p "  Press Return to continue, or close this window to cancel. " _

[ -d "$PACK" ] || fail "The 'pack' folder is missing. Unzip the whole download, then run this again."
[ -d "$PROJECT" ] || fail "The project folder was not found. Run the Claude Code setup first, then run this again."

if [ -f "$PROJECT/CLAUDE.md" ] && ! cmp -s "$PROJECT/CLAUDE.md" "$PACK/CLAUDE.md"; then
  if [ ! -f "$PROJECT/CLAUDE.core-backup.md" ]; then
    cp "$PROJECT/CLAUDE.md" "$PROJECT/CLAUDE.core-backup.md"
    good "Backed up your old CLAUDE.md to CLAUDE.core-backup.md"
  fi
fi

keep=" business/details.md business/price-list.md business/quote-wording.md jobs.csv "
( cd "$PACK" && find . -type f -print0 ) | while IFS= read -r -d '' rel; do
  rel="${rel#./}"
  dest="$PROJECT/$rel"
  mkdir -p "$(dirname "$dest")"
  case "$keep" in
    *" $rel "*) if [ -e "$dest" ]; then say "    kept  $rel"; continue; fi ;;
  esac
  cp "$PACK/$rel" "$dest"
  good "Added $rel"
done
for d in quotes/incoming quotes/sent invoices chase; do mkdir -p "$PROJECT/$d"; done
chmod +x "$PROJECT/tools/make-pdf.sh"

say ""
printf '  \033[32mInstalled.\033[0m\n'
say "  Next: open '$PROJECT/START HERE - Chasem.txt'"
read -r -p "  Open the project folder now? [Y/n] " o
case "${o:-Y}" in [Yy]*) open "$PROJECT" ;; esac
