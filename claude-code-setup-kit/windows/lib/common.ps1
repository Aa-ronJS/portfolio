# Shared helpers for the Claude Code setup kit (Windows).
# Dot-sourced by setup.ps1, start.ps1 and update.ps1.

$ErrorActionPreference = 'Stop'

$KitRoot      = Split-Path -Parent $PSScriptRoot
# The template ships inside the zip next to the .bat files; when running from
# the source repo it sits one level up instead.
$TemplateDir  = Join-Path $KitRoot 'project-template'
if (-not (Test-Path $TemplateDir)) { $TemplateDir = Join-Path (Split-Path -Parent $KitRoot) 'project-template' }
$Documents    = [Environment]::GetFolderPath('MyDocuments')
$Desktop      = [Environment]::GetFolderPath('Desktop')
$ProjectsDir  = Join-Path $Documents 'Claude Projects'
$ProjectDir   = Join-Path $ProjectsDir 'My Business'
$ClaudeExe    = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
$LogDir       = Join-Path $env:LOCALAPPDATA 'ClaudeCodeSetupKit'
$LauncherName = 'Claude Code'

function Say($text)  { Write-Host $text }
function Step($text) { Write-Host ""; Write-Host "==> $text" -ForegroundColor Cyan }
function Good($text) { Write-Host "    OK  $text" -ForegroundColor Green }
function Warn($text) { Write-Host "    !   $text" -ForegroundColor Yellow }
function Fail($text) {
    Write-Host ""
    Write-Host "STOPPED: $text" -ForegroundColor Red
    Write-Host "Nothing harmful happened. You can run this again after fixing the problem above."
    exit 1
}

function Refresh-Path {
    # Pick up PATH changes the installer made, without reopening the window.
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $env:Path = "$user;$machine"
}

function Find-Claude {
    if (Test-Path $ClaudeExe) { return $ClaudeExe }
    $cmd = Get-Command claude -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

function Assert-NotAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    if ($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Fail "This window is running as Administrator. That is not needed and not safe for this. Close it and double-click the file normally."
    }
}
