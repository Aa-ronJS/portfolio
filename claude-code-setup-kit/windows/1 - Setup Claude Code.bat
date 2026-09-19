@echo off
title Claude Code Setup
rem Double-click this file. It runs the setup script in the "lib" folder
rem next to it. Nothing here needs administrator rights.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0lib\setup.ps1"
echo.
pause
