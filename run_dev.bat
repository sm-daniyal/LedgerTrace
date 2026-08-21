@echo off
echo Starting LedgerTrace Development Environment...

start "LedgerTrace Backend" cmd /k "cd /d %~dp0backend && "%~dp0backend\venv\Scripts\python.exe" run.py"
start "LedgerTrace Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Backend URL:  http://127.0.0.1:8000
echo Swagger Docs: http://127.0.0.1:8000/docs
echo Frontend URL: http://localhost:5173
