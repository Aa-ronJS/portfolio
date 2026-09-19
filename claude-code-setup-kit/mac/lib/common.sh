#!/bin/bash
# Shared helpers for the Claude Code setup kit (macOS).
# Sourced by setup.sh, start.sh and update.sh.

set -u

KIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# The template ships inside the zip next to the .command files; when running
# from the source repo it sits one level up instead.
TEMPLATE_DIR="$KIT_ROOT/project-template"
[ -d "$TEMPLATE_DIR" ] || TEMPLATE_DIR="$(dirname "$KIT_ROOT")/project-template"
PROJECTS_DIR="$HOME/Documents/Claude Projects"
PROJECT_DIR="$PROJECTS_DIR/My Business"
CLAUDE_BIN="$HOME/.local/bin/claude"
LOG_DIR="$HOME/Library/Logs/ClaudeCodeSetupKit"
LAUNCHER="$HOME/Desktop/Claude Code.command"

say()  { printf '%s\n' "$*"; }
step() { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
good() { printf '    \033[32mOK\033[0m  %s\n' "$*"; }
warn() { printf '    \033[33m!\033[0m   %s\n' "$*"; }
fail() {
  printf '\n\033[31mSTOPPED: %s\033[0m\n' "$*"
  say "Nothing harmful happened. You can run this again after fixing the problem above."
  exit 1
}

find_claude() {
  if [ -x "$CLAUDE_BIN" ]; then printf '%s' "$CLAUDE_BIN"; return 0; fi
  command -v claude 2>/dev/null && return 0
  return 1
}

assert_not_root() {
  if [ "$(id -u)" -eq 0 ]; then
    fail "This is running as the administrator (root). That is not needed and not safe for this. Run it normally, without sudo."
  fi
}

# Make sure ~/.local/bin is on PATH for this window.
export PATH="$HOME/.local/bin:$PATH"
