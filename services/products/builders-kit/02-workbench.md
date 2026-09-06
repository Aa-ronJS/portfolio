# 3. The workbench

One honest afternoon. At the end of it you have a terminal you are
not afraid of, Claude Code installed and answering, and git
underneath everything so that no mistake you ever make is permanent.

A currency note for the whole document: tool names, commands and
prices here were correct at this edition's date. Installation
mechanics are the fastest-drifting content in the kit, which is
exactly what your licence year's re-issues track. When in doubt, the
official docs at code.claude.com/docs are the source of truth, and
the kit tells you what you are looking for there.

## 3.1 The terminal, demystified in ten moves

The terminal is a text box that runs programs. It is not fragile,
and with git underneath (3.3) it is not even dangerous. On macOS
open Terminal; on Windows install "Windows Terminal" from the store
and use PowerShell inside it; on Linux you know already.

The ten moves that cover this entire kit: `pwd` (where am I), `ls`
(what is here), `cd foldername` and `cd ..` (move around), `mkdir
name` (new folder), pressing Tab to autocomplete names, pressing the
up arrow for the previous command, Ctrl+C to stop a running program,
`code .` (open this folder in VS Code), and copy-paste, which works
like everywhere else. That is genuinely the list. Everything more
exotic in this kit arrives as a command you paste, with a sentence
saying what it does; and your standing helper for "what does this
error mean" is the AI itself, which is superb at exactly that
question.

Two supporting installs while you are here: **VS Code** (the free
standard editor; you will mostly read in it, not write) and
**Node.js** (the LTS version from nodejs.org; several tools in this
kit run on it).

## 3.2 Claude Code

Claude Code is Anthropic's terminal agent: the same assistant you
know from the chat window, but sitting inside your project folder,
able to read your files, write them, run programs and show you the
results, taking instructions in plain English. It is the centre of
this kit's workflow because it closes the loop the chat window
leaves open: no more copy-pasting code you cannot evaluate between
a browser tab and your files. It does the mechanics; you do the
directing; the scaffolding files in document 4 are how you direct
it durably.

Install: the current instructions live at code.claude.com/docs (look
for "quickstart"). At this edition, that is either the native
installer one-liner for your platform or, with Node installed,
`npm install -g @anthropic-ai/claude-code`. Then, in your terminal,
`cd` into any folder and run `claude`. First run signs you in.

Subscription honesty: Claude Code needs a paid Claude plan, and
serious building burns meaningful usage; budget for the mid tier and
treat it as the project's main cost. It replaces a great deal more
labour than it costs, but "the AI subscription is the budget line"
is a sentence this kit says out loud rather than hiding.

Working habits that matter from day one:

- **Run it in the project folder,** always. Its context is the
  folder it starts in; starting it in your home directory gives it
  your whole disk as a workspace, which helps nobody.
- **Let it ask.** When it proposes a plan or asks permission to run
  something, read the proposal. Approving without reading is how
  the crew model breaks down.
- **Use plain English and outcome terms,** exactly as document 2
  taught. "The contact form should reject empty messages and tell
  the user why" outperforms any attempt to talk like a programmer.
- **One session per work block,** started fresh; the scaffolding
  files carry the memory between sessions, not the chat history.

Other terminal agents exist and more will; the method transfers.
This kit standardises on Claude Code because the method was
developed with it and the scaffolding conventions in document 4 are
native to it.

## 3.3 Git: the reason nothing is ever ruined

Git records snapshots of your project. Every commit is a save point
you can return to, which converts every future mistake, yours or the
AI's, from a catastrophe into an undo. It is also how document 7's
hosting deploys your site. Non-negotiable, and much less to learn
than its reputation suggests.

Install from git-scm.com (or it is already present on macOS/Linux).
Create a free GitHub account; it is the off-site copy of your save
points and the thing your hosting will watch.

Your entire git vocabulary for this kit, and you can ask Claude Code
to run all of it for you by saying so in English:

- Once per project: `git init`, then connect it to a GitHub
  repository (ask the AI: "create a private GitHub repo for this
  project and connect it", or follow GitHub's three-line
  instructions).
- Every increment, per the loop: commit. Literally tell Claude Code
  "commit that" and it writes a sensible message and does it. Or
  yourself: `git add -A` then `git commit -m "what changed"`.
- To put it on GitHub: `git push`.
- The safety net you hope never to need: "show me what changed since
  the last commit" and "take the project back to the last commit",
  both of which the AI translates for you on request.

Rule from the method: **commit at every green moment**, meaning each
time the thing works and you have verified it. Small commits are the
cheap insurance the whole workflow rests on.

## 3.4 The workbench check

Before moving on: `claude` starts and responds inside a test folder;
`git --version` and `node --version` both answer; VS Code opens your
test folder with `code .`; and you have made one commit in a
throwaway project and pushed it to a private GitHub repo. Twenty
minutes, and every later document assumes it.
