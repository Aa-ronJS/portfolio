#!/usr/bin/env bash
# Usage: ./push-to-github.sh https://github.com/<you>/lineage.git
# Or, with the GitHub CLI installed and logged in: ./push-to-github.sh
set -e
if [ -n "$1" ]; then
  git remote remove origin 2>/dev/null || true
  git remote add origin "$1"
  git push -u origin main
elif command -v gh >/dev/null 2>&1; then
  gh repo create lineage --private --source=. --remote=origin --push
else
  echo "Create an empty repo on github.com, then run: ./push-to-github.sh <repo-url>"; exit 1
fi
