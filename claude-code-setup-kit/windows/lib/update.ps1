# Updates Claude Code to the latest version. Safe to run any time.
. (Join-Path $PSScriptRoot 'common.ps1')

$claude = Find-Claude
if (-not $claude) {
    Fail "Claude Code is not installed yet. Run '1 - Setup Claude Code.bat' first."
}
Step "Current version"
& $claude --version
Step "Updating"
& $claude update
Step "Checking health"
& $claude doctor
