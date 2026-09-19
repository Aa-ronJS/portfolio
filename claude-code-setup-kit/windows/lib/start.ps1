# Opens Claude Code in the business project folder.
. (Join-Path $PSScriptRoot 'common.ps1')

$claude = Find-Claude
if (-not $claude) {
    Fail "Claude Code is not installed yet. Run '1 - Setup Claude Code.bat' first."
}
if (-not (Test-Path $ProjectDir)) {
    Fail "The project folder is missing ($ProjectDir). Run '1 - Setup Claude Code.bat' to recreate it."
}
Set-Location $ProjectDir
& $claude
exit $LASTEXITCODE
