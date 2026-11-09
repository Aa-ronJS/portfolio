#!/bin/bash
# Chasem's two copies of the app must not drift, and a changed app must ship
# with a new sw.js VERSION or phones keep serving the old cached files.
#   1. chasem-landing/public/app/ is byte-for-byte chasem-app/ (minus tests and npm files)
#   2. if any app file differs from BASE (default origin/master), sw.js VERSION differs too
# Exit 0 = fine. Exit 1 = says what is wrong and the one command that fixes it.
# Used by CI (.github/workflows/chasem.yml) and the Stop hook in .claude/settings.json.
cd "$(git rev-parse --show-toplevel)" || exit 1
BASE="${BASE:-origin/master}"
bad=0

drift=$(diff -rq chasem-app chasem-landing/public/app \
  -x tests -x node_modules -x package.json -x package-lock.json 2>&1)
if [ -n "$drift" ]; then
  echo "chasem-app/ and chasem-landing/public/app/ have drifted:"
  echo "$drift" | sed 's/^/  /' | head -20
  echo "fix: tools/sync-chasem.sh"
  bad=1
fi

if git rev-parse -q --verify "$BASE" >/dev/null; then
  changed=$( { git diff --name-only "$BASE" -- chasem-app; git diff --name-only -- chasem-app; git ls-files -o --exclude-standard chasem-app; } \
    | grep -vE '^chasem-app/(tests/|package(-lock)?\.json$|node_modules/)' | sort -u)
  old=$(git show "$BASE:chasem-app/sw.js" 2>/dev/null | grep -m1 "var VERSION")
  new=$(grep -m1 "var VERSION" chasem-app/sw.js)
  if [ -n "$changed" ] && [ "$old" = "$new" ]; then
    echo "app files changed since $BASE but sw.js VERSION is still: $new"
    echo "$changed" | sed 's/^/  /' | head -10
    echo "fix: tools/sync-chasem.sh --bump"
    bad=1
  fi
fi
[ $bad -eq 0 ] && echo "chasem sync: ok"
exit $bad
