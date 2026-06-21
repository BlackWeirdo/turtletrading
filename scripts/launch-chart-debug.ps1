# Launch Chrome with the DevTools debugging port so the MCP chart_* tools can
# read the live price chart you are viewing.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\launch-chart-debug.ps1
#
# Uses a SEPARATE user-data-dir so it never touches your main Chrome profile.
# Add your indicators on the opened chart; chart_* tools then read that state.

param(
  [int]$Port = 9222,
  [string]$Url = "https://app.turtletrading.vn/chart",
  [string]$UserDataDir = "$env:LOCALAPPDATA\turtle-chart-debug"
)

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
  Write-Error "Chrome not found. Install Chrome or edit this script with its path."
  exit 1
}

Write-Host "Launching Chrome (debug :$Port) -> $Url"
& $chrome `
  "--remote-debugging-port=$Port" `
  "--user-data-dir=$UserDataDir" `
  $Url
