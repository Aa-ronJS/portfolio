@echo off
title Claude Code
rem Opens Claude Code in your business project folder.
rem Setup also puts a copy of this on your Desktop called "Claude Code".
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0lib\start.ps1"
if errorlevel 1 pause
