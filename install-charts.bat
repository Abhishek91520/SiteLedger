@echo off
echo.
echo Installing Charts and Animation Libraries...
echo.

cd /d "%~dp0"

call npm install recharts framer-motion

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Success! Libraries installed.
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo Error: Installation failed
    echo ========================================
    echo.
)

pause
