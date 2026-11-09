#!/bin/bash
# Make chasem-landing/public/app/ an exact copy of chasem-app/ (minus tests and npm files).
# Pass --bump to also move sw.js VERSION on by one (qc-app-v67 -> qc-app-v68).
set -e
cd "$(git rev-parse --show-toplevel)"
if [ "$1" = "--bump" ]; then
  n=$(sed -n "s/.*var VERSION = 'qc-app-v\([0-9]*\)'.*/\1/p" chasem-app/sw.js)
  sed -i.bak "s/qc-app-v$n'/qc-app-v$((n+1))'/" chasem-app/sw.js && rm -f chasem-app/sw.js.bak
  echo "sw.js VERSION: qc-app-v$n -> qc-app-v$((n+1))"
fi
src=chasem-app dst=chasem-landing/public/app
skip='^\./(tests|node_modules)(/|$)|^\./package(-lock)?\.json$'
# remove what the source no longer has
( cd "$dst" && find . -type f ) | grep -vE "$skip" | while read -r f; do
  [ -e "$src/$f" ] || { rm -f "$dst/$f"; echo "removed $dst/${f#./}"; }
done
# copy everything else across
( cd "$src" && find . -type f ) | grep -vE "$skip" | while read -r f; do
  if ! cmp -s "$src/$f" "$dst/$f"; then mkdir -p "$dst/$(dirname "$f")"; cp "$src/$f" "$dst/$f"; echo "copied ${f#./}"; fi
done
