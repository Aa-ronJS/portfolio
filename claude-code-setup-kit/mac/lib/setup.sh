#!/bin/bash
# Claude Code one-click setup for macOS.
#
# What this does, in order:
#   1. Checks the macOS version and that it is NOT running as root.
#   2. Downloads and runs Anthropic's official installer
#      (https://claude.ai/install.sh) into your own user folder.
#   3. Optionally installs Apple's command line tools (gives Claude "git").
#   4. Creates ~/Documents/Claude Projects/My Business from the template.
#   5. Puts a "Claude Code" launcher on your Desktop.
#   6. Offers to open Claude Code so you can sign in.
#
# It never asks for your administrator password, never stores passwords,
# and only downloads from Anthropic's or Apple's addresses.

. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/setup-log.txt"
exec > >(tee -a "$LOG_FILE") 2>&1
say ""
say "----- $(date) -----" >> "$LOG_FILE"

say ""
say "  Claude Code Setup"
say "  -----------------"
say "  This will:"
say "    - Install Claude Code from Anthropic's official address"
say "    - Create a project folder: $PROJECT_DIR"
say "    - Put a 'Claude Code' launcher on your Desktop"
say ""
say "  It does not ask for your administrator password and does not store any passwords."
say "  A log is written to: $LOG_FILE"
say ""
read -r -p "  Press Return to begin, or close this window to cancel. " _

step "Checking this Mac"
assert_not_root
if [ "$(uname -s)" != "Darwin" ]; then
  fail "This setup is for macOS. For Windows use the 'windows' folder."
fi
os_version="$(sw_vers -productVersion)"
os_major="${os_version%%.*}"
if [ "$os_major" -lt 13 ]; then
  fail "Claude Code needs macOS 13 (Ventura) or newer. This Mac has macOS $os_version."
fi
good "macOS $os_version"

step "Installing Claude Code"
if existing="$(find_claude)"; then
  good "Already installed at $existing"
  say "    Checking for updates..."
  "$existing" update 2>&1 | sed 's/^/    /' || warn "Update check skipped"
else
  say "    Downloading Anthropic's installer from https://claude.ai/install.sh ..."
  say "    (the same installer Anthropic's documentation tells you to run)"
  installer="$(mktemp -t claude-install.XXXXXX)"
  if ! curl -fsSL --max-time 60 -o "$installer" https://claude.ai/install.sh; then
    rm -f "$installer"
    fail "Could not download from https://claude.ai. Check your internet connection and try again."
  fi
  if [ "$(wc -c < "$installer")" -lt 500 ]; then
    rm -f "$installer"
    fail "The download from https://claude.ai/install.sh looked wrong (too short). Try again in a few minutes."
  fi
  good "Downloaded"
  bash "$installer"
  rm -f "$installer"
  hash -r
  if ! claude_path="$(find_claude)"; then
    fail "The installer finished but 'claude' was not found. Scroll up for an error from the installer, then run setup again."
  fi
  good "Installed at $claude_path"
fi
claude_path="$(find_claude)"
good "Version: $("$claude_path" --version 2>&1 | head -n 1)"

step "Apple command line tools (recommended, optional)"
say "    These give Claude the 'git' tool, which many projects use. Apple installs"
say "    them through a normal popup window; no password is needed."
if xcode-select -p >/dev/null 2>&1; then
  good "Already installed"
else
  read -r -p "    Install them now? A popup will appear; click Install. [Y/n] " answer
  case "${answer:-Y}" in
    [Yy]*)
      xcode-select --install >/dev/null 2>&1 || true
      warn "Finish the Apple popup, then continue here. Claude Code works without it too."
      ;;
    *) warn "Skipped. You can run this setup again later to install them." ;;
  esac
fi

step "Creating your project folder"
if [ ! -d "$TEMPLATE_DIR" ]; then
  fail "The 'project-template' folder is missing. Please unzip the whole download, not just this one file, and run setup again."
fi
mkdir -p "$PROJECT_DIR"
# Copy template files, but never overwrite something the user already has.
( cd "$TEMPLATE_DIR" && find . -type f -print0 ) | while IFS= read -r -d '' rel; do
  rel="${rel#./}"
  dest="$PROJECT_DIR/$rel"
  if [ ! -e "$dest" ]; then
    mkdir -p "$(dirname "$dest")"
    cp "$TEMPLATE_DIR/$rel" "$dest"
    good "Added $rel"
  else
    say "    kept  $rel (already there)"
  fi
done
good "Project folder: $PROJECT_DIR"

step "Creating the Desktop launcher"
# The launcher is self-contained so it keeps working even if this setup
# folder is deleted later. Files created here are not quarantined by
# Gatekeeper, so double-clicking it just works.
cat > "$LAUNCHER" <<LAUNCH
#!/bin/bash
# Opens Claude Code in your business project folder.
export PATH="\$HOME/.local/bin:\$PATH"
cd "$PROJECT_DIR" || { echo "Project folder is missing: $PROJECT_DIR"; read -r -p "Press Return to close. " _; exit 1; }
if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code is not installed. Please run '1 - Setup Claude Code.command' from the setup folder."
  read -r -p "Press Return to close. " _
  exit 1
fi
exec claude
LAUNCH
chmod +x "$LAUNCHER"
xattr -d com.apple.quarantine "$LAUNCHER" 2>/dev/null || true
good "Launcher: $LAUNCHER"

say ""
printf '  \033[32mSetup complete.\033[0m\n'
say "  Next: open the file 'START HERE.txt' in $PROJECT_DIR"
say ""
read -r -p "  Open Claude Code now so you can sign in? [Y/n] " open_now
case "${open_now:-Y}" in
  [Yy]*) open "$LAUNCHER" ;;
esac
