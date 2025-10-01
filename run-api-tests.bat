@echo off
echo Running API endpoint tests...
echo.

REM Start the Netlify dev server if it's not already running
echo Checking if Netlify dev server is running...
netstat -ano | findstr "8888" > nul
if %errorlevel% neq 0 (
  echo Starting Netlify dev server...
  start "Netlify Dev" /B cmd /c "netlify dev"
  echo Waiting for server to start...
  timeout /t 10 /nobreak > nul
) else (
  echo Netlify dev server is already running.
)

echo.
echo Running tests...
node test-api-endpoints.js

echo.
echo Test results saved to api-test-results.log and api-test-summary.json
echo.
