@echo off
title Update Claude Code
rem Claude Code updates itself in the background. Use this only if you
rem were told to, or if something seems out of date.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0lib\update.ps1"
echo.
pause
