@echo off
cd /d "%~dp0..\frontend"
set "VITE_APP_MODE=api"
set "VITE_API_BASE_URL=http://localhost:8000/api/v1"
call npm run dev -- --open
