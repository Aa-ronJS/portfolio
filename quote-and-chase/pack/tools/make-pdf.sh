#!/bin/bash
# Turns an HTML quote or invoice into a PDF next to it, using a browser
# that is already on this Mac. Installs nothing.
# Usage: bash tools/make-pdf.sh "quotes/sent/Q-1001 - Smith - Wattle St/quote.html"
set -u
in="${1:-}"
[ -f "$in" ] || { echo "make-pdf: file not found: $in"; exit 2; }
in_abs="$(cd "$(dirname "$in")" && pwd)/$(basename "$in")"
out="${in_abs%.html}.pdf"
for app in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
  if [ -x "$app" ]; then
    "$app" --headless=new --disable-gpu --no-pdf-header-footer \
      --print-to-pdf="$out" "file://$in_abs" >/dev/null 2>&1
    if [ -s "$out" ]; then echo "make-pdf: wrote $out"; exit 0; fi
  fi
done
echo "make-pdf: no Chrome, Edge or Brave found. Open the HTML file in Safari, press Cmd+P and choose Save as PDF."
exit 3
