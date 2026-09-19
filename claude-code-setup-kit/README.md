# Claude Code Setup Kit

Double-click installers that get a non-technical small-business owner
from "nothing" to "Claude Code open in a project folder, signed in,
with safety rules applied" in about three minutes. This is the
deliverable for the core module of the video course; the vertical
add-ons drop their own files into the project folder this creates.

## What is in here

```
windows/
  1 - Setup Claude Code.bat      double-click installer (runs lib/setup.ps1)
  2 - Start Claude Code.bat      opens Claude Code in the project folder
  Update Claude Code.bat         claude update + claude doctor
  READ ME FIRST.txt              customer-facing instructions
  lib/common.ps1, setup.ps1, start.ps1, update.ps1
mac/
  1 - Setup Claude Code.command  same, for macOS (runs lib/setup.sh)
  2 - Start Claude Code.command
  Update Claude Code.command
  READ ME FIRST.txt
  lib/common.sh, setup.sh, start.sh, update.sh
project-template/
  CLAUDE.md                      plain-English business brief + house rules
  START HERE.txt                 the customer's first five minutes
  .claude/settings.json          acceptEdits mode + deny list for destructive commands
package.sh                       builds the two customer zips into dist/
VERSION
```

## What setup does

1. Refuses to run as Administrator / root, checks OS version and internet.
2. Runs Anthropic's official native installer, exactly as documented:
   `irm https://claude.ai/install.ps1 | iex` on Windows,
   `curl -fsSL https://claude.ai/install.sh | bash` on Mac. Installs to
   the user's own `~/.local/bin`. No Node, no npm, no admin rights. If
   Claude Code is already present it runs `claude update` instead.
3. Offers (default yes) the one optional extra Anthropic recommends:
   Git for Windows via winget, or Apple's command line tools on Mac.
   Both are skippable and the kit works without them.
4. Creates `Documents/Claude Projects/My Business` from
   `project-template/`, never overwriting files that already exist, so
   re-running setup is always safe.
5. Writes a self-contained launcher into that folder and a Desktop
   shortcut / `.command` pointing at it. The launcher does not depend on
   the setup folder still existing.
6. Logs everything to `%LOCALAPPDATA%\ClaudeCodeSetupKit\setup-log.txt`
   or `~/Library/Logs/ClaudeCodeSetupKit/setup-log.txt`.
7. Offers to open Claude Code, which triggers the browser sign-in.

Nothing is downloaded from anywhere except claude.ai and, if the
customer says yes, Microsoft's winget source or Apple. No API keys or
passwords are ever written to disk by these scripts.

## The safety rules in the template

`project-template/.claude/settings.json` sets `defaultMode` to
`acceptEdits`, so Claude can write files inside the project without a
prompt but still asks before running commands. It denies recursive
deletes, sudo, disk tools, force pushes, piping downloads into a shell,
and reading `.env`, SSH, AWS and keychain files. Project settings cannot
select `auto` or `bypassPermissions` by design, which is what we want.

The deny list covers both the Bash tool and the Windows PowerShell tool
(rules of the form `PowerShell(...)`, which Claude Code uses on Windows
when Git Bash is not installed). Git for Windows is still offered by
default because it gives Claude its full tool set.

## Build the customer zips

```
./package.sh
```

Run it on a Mac or Linux machine, not Windows, so the Mac `.command`
files keep their executable bit. Output: `dist/claude-code-setup-windows-<ver>.zip`
and `dist/claude-code-setup-mac-<ver>.zip`. Each zip contains its own
copy of `project-template/`.

## Test before every release

On clean machines or fresh user accounts, not your own:

- Windows 11 and Windows 10, standard (non-admin) user, with Documents
  redirected to OneDrive. Run setup twice; the second run must say
  "kept" for every template file and not create a second shortcut.
- macOS Sonoma and Sequoia. Confirm the Gatekeeper path in READ ME
  FIRST matches what the OS actually shows; Apple changes this.
- Unplug the network and run setup: it must stop at the internet check
  with a readable message and nothing half-installed.
- Run `Update Claude Code` and confirm `claude doctor` reports healthy.
- Open the Desktop launcher, sign in, type the first prompt from
  START HERE.txt, confirm Claude reads CLAUDE.md and asks before running
  a command.

## What is deliberately not solved yet

- **Code signing.** A `.bat` cannot be signed and an unsigned `.command`
  trips Gatekeeper. Version 1 ships zips and the course shows the two
  clicks past the warnings, which is honest and cheap. For a smoother
  product later: wrap the Windows side in a signed Inno Setup installer
  (Azure Trusted Signing is the cheapest certificate route) and wrap the
  Mac side in a minimal `.app` signed with a Developer ID and notarized.
  Do not use PS2EXE-style converters; antivirus flags them.
- **Windows PowerShell 5.1 quirks.** The scripts are ASCII-only and avoid
  PowerShell 7 syntax on purpose. Keep it that way.
- **Onboarding prompts inside Claude Code** (theme, login method, trust
  this folder) change between versions. Record them in the video rather
  than trying to script past them.
- **Linux.** Not a target audience for this product.

## Testing done in the sandbox that produced this kit

The Mac flow was run end to end with a throwaway home directory:
version gate, already-installed branch (real `claude update`), template
copy, launcher creation, second-run idempotency, and the update script.
The root-refusal path was also exercised. The Windows PowerShell scripts
were written for PowerShell 5.1 but could not be executed in that
sandbox; run them on a real Windows machine before shipping.
