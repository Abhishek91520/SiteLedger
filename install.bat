@echo off
setlocal enabledelayedexpansion

echo.
echo ================================================
echo   SiteLedger - Installation Script
echo ================================================
echo.

REM Check if running in correct directory
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Please run this script from the SiteLedger directory.
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org
    echo.
    echo After installation, restart this script.
    pause
    exit /b 1
)
node --version
echo Node.js found!
echo.

echo [2/4] Checking npm installation...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed!
    echo npm should come with Node.js.
    echo Please reinstall Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)
call npm --version
echo npm found!
echo.

echo [3/4] Installing dependencies...
echo This may take 2-3 minutes...
echo Please wait...
echo.

REM Use call to ensure npm runs correctly in batch
call npm install
set INSTALL_ERROR=%errorlevel%

echo.
if %INSTALL_ERROR% neq 0 (
    echo ================================================
    echo   Installation Failed!
    echo ================================================
    echo.
    echo Possible solutions:
    echo 1. Close any programs using node_modules folder
    echo 2. Delete node_modules folder and try again
    echo 3. Run as Administrator
    echo 4. Check your internet connection
    echo.
    echo If problems persist, run manually:
    echo   cd "c:\Users\abhis\Desktop\SiteLedger"
    echo   npm install
    echo.
    pause
    exit /b 1
)

echo ================================================
echo   Installation Complete!
echo ================================================
echo.

echo [4/4] Next steps:
echo.
echo 1. Setup Supabase (see SETUP.md or START_HERE.md)
echo 2. Create .env file with your Supabase credentials
echo 3. Double-click start.bat (or run: npm run dev)
echo.
echo For detailed step-by-step instructions:
echo   - Open START_HERE.md
echo   - Follow the checklist
echo.
echo Ready to start? Double-click start.bat
echo.
pause
