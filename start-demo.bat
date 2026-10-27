@echo off
setlocal
cd /d "%~dp0frontend"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 LTS or newer, then run this file again.
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)"
if errorlevel 1 (
  echo Node.js 22.12 or newer is required.
  pause
  exit /b 1
)
call npm ci
if errorlevel 1 (
  echo Dependency installation failed. Check your internet connection and see README.md.
  pause
  exit /b 1
)
set "VITE_APP_MODE=demo"
echo Opening Proerply demo at http://localhost:5173
call npm run dev -- --open
pause
