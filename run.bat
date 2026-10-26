@echo off
setlocal
title Heuristic Lab
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed or not on PATH.
  echo  Install the LTS version from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies - first run only, this can take a minute...
  call npm install
  if errorlevel 1 (
    echo.
    echo  npm install failed. See the messages above.
    pause
    exit /b 1
  )
)

echo.
echo  Starting Heuristic Lab. Your browser will open automatically.
echo  Keep this window open while you use the app; close it to stop the server.
echo.
call npm run dev -- --open
if errorlevel 1 pause
endlocal
