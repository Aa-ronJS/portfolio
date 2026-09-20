# Claude Code one-click setup for Windows.
#
# What this does, in order:
#   1. Checks Windows version and that it is NOT running as administrator.
#   2. Downloads and runs Anthropic's official installer
#      (https://claude.ai/install.ps1) into your own user folder.
#   3. Optionally installs Git for Windows (recommended by Anthropic).
#   4. Creates Documents\Claude Projects\My Business from the template.
#   5. Puts a "Claude Code" shortcut on your Desktop.
#   6. Offers to open Claude Code so you can sign in.
#
# It never needs administrator rights, never stores passwords, and only
# downloads from anthropic-controlled or Microsoft-controlled addresses.

. (Join-Path $PSScriptRoot 'common.ps1')

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir 'setup-log.txt'
Start-Transcript -Path $LogFile -Append | Out-Null

try {
    Write-Host ""
    Write-Host "  Claude Code Setup" -ForegroundColor White
    Write-Host "  -----------------"
    Say "  This will:"
    Say "    - Install Claude Code from Anthropic's official address"
    Say "    - Create a project folder: $ProjectDir"
    Say "    - Put a 'Claude Code' shortcut on your Desktop"
    Say ""
    Say "  It does not need administrator rights and does not store any passwords."
    Say "  A log is written to: $LogFile"
    Write-Host ""
    Read-Host "  Press Enter to begin, or close this window to cancel" | Out-Null

    Step "Checking this computer"
    Assert-NotAdmin
    $os = [Environment]::OSVersion.Version
    if ($os.Major -lt 10 -or ($os.Major -eq 10 -and $os.Build -lt 17763)) {
        Fail "Claude Code needs Windows 10 version 1809 or newer. This PC reports $($os.ToString())."
    }
    if (-not [Environment]::Is64BitOperatingSystem) {
        Fail "Claude Code needs 64-bit Windows."
    }
    Good "Windows $($os.Major) build $($os.Build), 64-bit"

    # Older Windows PowerShell defaults to old TLS. Force modern TLS for downloads.
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12


    Step "Installing Claude Code"
    $existing = Find-Claude
    if ($existing) {
        Good "Already installed at $existing"
        Say "    Checking for updates..."
        try { & $existing update | ForEach-Object { Say "    $_" } } catch { Warn "Update check skipped: $_" }
    } else {
        Say "    Downloading Anthropic's installer from https://claude.ai/install.ps1 ..."
        Say "    (the same installer Anthropic's documentation tells you to run)"
        try {
            $installer = Invoke-RestMethod -Uri 'https://claude.ai/install.ps1' -UseBasicParsing -TimeoutSec 60
        } catch {
            Fail "Could not download from https://claude.ai. Check your internet connection and try again. ($($_.Exception.Message))"
        }
        if (-not $installer -or $installer.Length -lt 500) {
            Fail "The download from https://claude.ai/install.ps1 looked wrong (too short). Try again in a few minutes."
        }
        Good "Downloaded"
        Invoke-Expression $installer
        Refresh-Path
        $installed = Find-Claude
        if (-not $installed) {
            Fail "The installer finished but claude.exe was not found. Scroll up for an error from the installer, then run setup again."
        }
        Good "Installed at $installed"
    }
    $claude = Find-Claude
    $version = (& $claude --version | Select-Object -First 1)
    Good "Version: $version"

    Step "Git for Windows (recommended, optional)"
    Say "    Anthropic recommends Git for Windows. It lets Claude use its full set of"
    Say "    tools and makes the safety rules in your project apply to every command."
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Good "Git is already installed"
    } elseif (Get-Command winget -ErrorAction SilentlyContinue) {
        $answer = Read-Host "    Install Git for Windows now from Microsoft's app store (winget)? [Y/n]"
        if ($answer -eq '' -or $answer -match '^[Yy]') {
            Say "    Installing... this can take a minute or two."
            try {
                & winget install --id Git.Git -e --source winget --scope user --accept-source-agreements --accept-package-agreements --silent | ForEach-Object { Say "    $_" }
            } catch { Warn "winget reported a problem: $_" }
            Refresh-Path
            if (Get-Command git -ErrorAction SilentlyContinue) { Good "Git installed" } else { Warn "Git did not install. Claude Code still works; you can install Git later from https://git-scm.com" }
        } else {
            Warn "Skipped. You can install it later from https://git-scm.com"
        }
    } else {
        Warn "winget is not available on this PC. Claude Code still works. You can install Git later from https://git-scm.com"
    }

    Step "Creating your project folder"
    if (-not (Test-Path $TemplateDir)) {
        Fail "The 'project-template' folder is missing. Please extract the whole zip file, not just this one file, and run setup again."
    }
    New-Item -ItemType Directory -Force -Path $ProjectDir | Out-Null
    # Copy template files, but never overwrite something the user already has.
    Get-ChildItem -Path $TemplateDir -Recurse -Force -File | ForEach-Object {
        $rel  = $_.FullName.Substring($TemplateDir.Length).TrimStart('\')
        $dest = Join-Path $ProjectDir $rel
        if (-not (Test-Path $dest)) {
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
            Copy-Item $_.FullName $dest
            Good "Added $rel"
        } else {
            Say "    kept  $rel (already there)"
        }
    }
    Good "Project folder: $ProjectDir"

    Step "Creating the Desktop shortcut"
    # The launcher lives inside the project folder so it keeps working even if
    # this setup folder is deleted later.
    $launcherBat = Join-Path $ProjectDir 'Start Claude Code.bat'
    $launcherLines = @(
        '@echo off',
        'title Claude Code',
        'cd /d "%~dp0"',
        'set "PATH=%USERPROFILE%\.local\bin;%PATH%"',
        'where claude >nul 2>&1',
        'if errorlevel 1 (',
        '  echo Claude Code is not installed. Please run "1 - Setup Claude Code.bat" from the setup folder.',
        '  pause',
        '  exit /b 1',
        ')',
        'claude'
    )
    # Batch files want Windows line endings.
    [IO.File]::WriteAllText($launcherBat, ($launcherLines -join "`r`n") + "`r`n", [Text.Encoding]::ASCII)
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut((Join-Path $Desktop "$LauncherName.lnk"))
    $lnk.TargetPath       = $launcherBat
    $lnk.WorkingDirectory = $ProjectDir
    $lnk.Description      = 'Open Claude Code in your business project'
    $lnk.IconLocation     = "$env:SystemRoot\System32\cmd.exe,0"
    $lnk.Save()
    Good "Shortcut: $Desktop\$LauncherName.lnk"

    Write-Host ""
    Write-Host "  Setup complete." -ForegroundColor Green
    Say "  Next: open the file 'START HERE.txt' in $ProjectDir"
    Write-Host ""
    $open = Read-Host "  Open Claude Code now so you can sign in? [Y/n]"
    if ($open -eq '' -or $open -match '^[Yy]') {
        Start-Process -FilePath $launcherBat -WorkingDirectory $ProjectDir
    }
}
finally {
    Stop-Transcript | Out-Null
}
