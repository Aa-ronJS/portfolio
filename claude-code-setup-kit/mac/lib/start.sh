#!/bin/bash
# Opens Claude Code in the business project folder.
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

claude_path="$(find_claude)" || fail "Claude Code is not installed yet. Run '1 - Setup Claude Code.command' first."
[ -d "$PROJECT_DIR" ] || fail "The project folder is missing ($PROJECT_DIR). Run '1 - Setup Claude Code.command' to recreate it."
cd "$PROJECT_DIR"
exec "$claude_path"
