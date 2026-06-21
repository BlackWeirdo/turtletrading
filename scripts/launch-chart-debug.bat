@echo off
REM Launch Chrome with CDP debug port + open the Turtle chart so the MCP
REM chart_* tools can read the live chart you are viewing.
REM Uses a SEPARATE Chrome profile so it never touches your normal browser.

REM Port 9333 (NOT 9222) so it never clashes with TradingView Desktop / its MCP.
set PORT=9333
if not "%~1"=="" set PORT=%~1
set URL=https://app.turtletrading.vn/chart
set PROFILE=%LOCALAPPDATA%\turtle-chart-debug

set "CHROME="
if exist "%PROGRAMFILES%\Google\Chrome\Application\chrome.exe" set "CHROME=%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"
if exist "%PROGRAMFILES(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%PROGRAMFILES(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if "%CHROME%"=="" (
    echo [LOI] Khong tim thay Chrome. Cai Chrome hoac sua duong dan trong file .bat nay.
    pause
    exit /b 1
)

echo Mo Chrome (debug :%PORT%) -^> %URL%
start "" "%CHROME%" --remote-debugging-port=%PORT% --user-data-dir="%PROFILE%" "%URL%"

echo.
echo Xong! Trong Claude Desktop, hay them indicator len chart roi hoi:
echo   "Indicator toi dang de tren chart la gi?"
echo.
echo (Cua so nay tu dong dong sau 4 giay)
timeout /t 4 /nobreak >nul
