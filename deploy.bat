@echo off
echo DataLake Sync Deployment Script
echo =============================
echo.

echo Step 1: Installing dependencies...
call npm install --verbose

echo.
echo Step 2: Running tests...
call node --trace-warnings test-query-filters.js

echo.
echo Step 3: Deploying to Netlify...
call netlify deploy --prod --functions=functions --verbose

echo.
echo Deployment complete!
echo.

pause
