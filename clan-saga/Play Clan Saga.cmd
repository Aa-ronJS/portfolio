@echo off
rem Starts Clan Saga and opens it in Edge. Close this window to stop the game.
cd /d "%~dp0"
start "" msedge "http://localhost:4180"
node server.js
pause
