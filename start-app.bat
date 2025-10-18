@echo off
REM Launches the NFC Artwork Designer dev server

cd /d "%~dp0"

if not exist node_modules (
  echo Installing npm dependencies...
  call npm install
  if errorlevel 1 goto :error
) else (
  echo Dependencies already installed. Skipping npm install.
)

echo.
echo Starting Vite dev server (close with Ctrl+C)...
echo.
call npm run dev
if errorlevel 1 goto :error
goto :eof

:error
echo.
echo The script encountered an error. Review the messages above.
pause
