@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 LTS or newer first.
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)"
if errorlevel 1 (
  echo Node.js 22.12 or newer is required.
  pause
  exit /b 1
)
call backend\setup.bat
if errorlevel 1 (
  echo Backend setup failed. Read the error above and docs\TROUBLESHOOTING.md.
  pause
  exit /b 1
)
cd /d "%~dp0"
call npm ci --prefix frontend
if errorlevel 1 (
  echo Frontend dependency installation failed.
  pause
  exit /b 1
)
start "Proerply API" cmd /k call "%~dp0scripts\run-backend.bat"
start "Proerply Frontend" cmd /k call "%~dp0scripts\run-api-frontend.bat"
echo Proerply runs at http://localhost:5173 and API docs at http://localhost:8000/docs
pause
