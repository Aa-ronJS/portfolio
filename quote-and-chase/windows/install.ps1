# Installs the Quote and Chase pack into the "My Business" project folder
# that the Claude Code setup kit created. Safe to run again.
$ErrorActionPreference = 'Stop'
$KitRoot    = Split-Path -Parent $PSScriptRoot
$Pack       = Join-Path $KitRoot 'pack'
$Documents  = [Environment]::GetFolderPath('MyDocuments')
$Project    = Join-Path $Documents 'Claude Projects\My Business'

function Say($t) { Write-Host $t }
function Good($t) { Write-Host "    OK  $t" -ForegroundColor Green }
function Fail($t) { Write-Host ""; Write-Host "STOPPED: $t" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  Quote and Chase - install" -ForegroundColor White
Say "  This copies the pack into: $Project"
Say "  Your existing CLAUDE.md is kept as CLAUDE.core-backup.md."
Say "  Files you have already edited (business details, price list, jobs.csv) are never overwritten."
Write-Host ""
Read-Host "  Press Enter to continue, or close this window to cancel" | Out-Null

if (-not (Test-Path $Pack)) { Fail "The 'pack' folder is missing. Extract the whole zip, then run this again." }
if (-not (Test-Path $Project)) { Fail "The project folder was not found. Run the Claude Code setup first, then run this again." }

$coreClaude = Join-Path $Project 'CLAUDE.md'
$packClaude = Join-Path $Pack 'CLAUDE.md'
if ((Test-Path $coreClaude) -and ((Get-FileHash $coreClaude).Hash -ne (Get-FileHash $packClaude).Hash)) {
    $backup = Join-Path $Project 'CLAUDE.core-backup.md'
    if (-not (Test-Path $backup)) { Copy-Item $coreClaude $backup; Good "Backed up your old CLAUDE.md to CLAUDE.core-backup.md" }
}

# Files the owner edits: copy only if missing. Everything else: always refresh.
$keep = @('business\details.md','business\price-list.md','business\quote-wording.md','jobs.csv')
Get-ChildItem -Path $Pack -Recurse -Force -File | ForEach-Object {
    $rel  = $_.FullName.Substring($Pack.Length).TrimStart('\')
    $dest = Join-Path $Project $rel
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
    if (($keep -contains $rel) -and (Test-Path $dest)) { Say "    kept  $rel" }
    else { Copy-Item $_.FullName $dest -Force; Good "Added $rel" }
}
foreach ($d in 'quotes\incoming','quotes\sent','invoices','chase') { New-Item -ItemType Directory -Force -Path (Join-Path $Project $d) | Out-Null }

Write-Host ""
Write-Host "  Installed." -ForegroundColor Green
Say "  Next: open '$Project\START HERE - Quote and Chase.txt'"
$open = Read-Host "  Open the project folder now? [Y/n]"
if ($open -eq '' -or $open -match '^[Yy]') { Start-Process explorer.exe $Project }
