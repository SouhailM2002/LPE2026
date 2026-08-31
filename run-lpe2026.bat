@echo off
REM ============================================================
REM  run-lpe2026.bat
REM  Starts both the backend (Node) and frontend (Vite/React)
REM  for the LPE2026 project, each in its own terminal window.
REM
REM  Place this file in the ROOT of your LPE2026 project,
REM  next to the "backend" and "frontend" folders.
REM ============================================================

set "PROJECT_DIR=%~dp0"

echo Starting backend...
start "LPE2026 - Backend" cmd /k "cd /d "%PROJECT_DIR%backend" && node index.js"

REM Small delay so the backend has a moment to start first
timeout /t 2 /nobreak >nul

echo Starting frontend...
start "LPE2026 - Frontend" cmd /k "cd /d "%PROJECT_DIR%frontend" && npm run dev"

REM Give the frontend dev server a few seconds to spin up before opening it.
REM Vite's default port is 5173 - change it below if yours runs elsewhere
REM (e.g. 3000 for Create React App).
set "FRONTEND_URL=http://localhost:5173"

echo Waiting for the frontend to be ready...
timeout /t 5 /nobreak >nul

echo Opening %FRONTEND_URL% in your default browser...
start "" "%FRONTEND_URL%"

echo.
echo Both backend and frontend have been launched in separate windows.
echo Close this window whenever you like - it is not needed anymore.
pause