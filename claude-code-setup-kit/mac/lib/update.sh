#!/bin/bash
# Updates Claude Code to the latest version. Safe to run any time.
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

claude_path="$(find_claude)" || fail "Claude Code is not installed yet. Run '1 - Setup Claude Code.command' first."
step "Current version"
"$claude_path" --version
step "Updating"
"$claude_path" update
step "Checking health"
"$claude_path" doctor
