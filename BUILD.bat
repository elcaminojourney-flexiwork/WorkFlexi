@echo off
cd /d "%~dp0"
echo Build elkezdese...
cmd /k "npx expo export --platform web && echo SIKERES && timeout /t 5 || echo HIBA TORRENT && pause"
