@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  py -3.12 -m venv .venv
  if errorlevel 1 python -m venv .venv
)
if not exist ".venv\Scripts\python.exe" (
  echo Install Python 3.12 and add it to PATH.
  exit /b 1
)
.venv\Scripts\python.exe -c "import sys;sys.exit(0 if sys.version_info >= (3,12) else 1)"
if errorlevel 1 (
  echo Python 3.12 or newer is required. Recreate .venv using Python 3.12.
  exit /b 1
)
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 exit /b 1
if not exist .env copy .env.example .env >nul
.venv\Scripts\python.exe -m alembic upgrade head
if errorlevel 1 exit /b 1
.venv\Scripts\python.exe -m app.seed
if errorlevel 1 exit /b 1
echo Backend setup complete.
exit /b 0
