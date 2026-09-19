# Turns an HTML quote or invoice into a PDF next to it, using a browser
# that is already on this PC (Edge is on every Windows 10/11 machine).
# Installs nothing.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-pdf.ps1 "quotes\sent\Q-1001 - Smith - Wattle St\quote.html"
param([Parameter(Mandatory=$true)][string]$In)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $In)) { Write-Host "make-pdf: file not found: $In"; exit 2 }
$inAbs = (Resolve-Path $In).Path
$out = [IO.Path]::ChangeExtension($inAbs, '.pdf')
$candidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe"
)
foreach ($exe in $candidates) {
  if (Test-Path $exe) {
    $uri = ([Uri]$inAbs).AbsoluteUri
    & $exe --headless=new --disable-gpu --no-pdf-header-footer "--print-to-pdf=$out" $uri 2>$null | Out-Null
    Start-Sleep -Milliseconds 500
    if ((Test-Path $out) -and ((Get-Item $out).Length -gt 0)) { Write-Host "make-pdf: wrote $out"; exit 0 }
  }
}
Write-Host "make-pdf: no Edge or Chrome found. Open the HTML file in your browser, press Ctrl+P and choose Save as PDF."
exit 3
