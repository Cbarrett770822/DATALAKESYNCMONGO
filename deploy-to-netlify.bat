@echo off
echo DataLake Sync Netlify Deployment Script
echo ======================================
echo.

REM Check if Netlify CLI is installed
echo Checking for Netlify CLI...
netlify --version > nul 2>&1
if %errorlevel% neq 0 (
  echo Netlify CLI not found. Installing...
  npm install -g netlify-cli
) else (
  echo Netlify CLI is installed.
)

echo.
echo Building the application...
npm run build

echo.
echo Deploying to Netlify...
echo.
echo Choose an option:
echo 1. Deploy preview (no production changes)
echo 2. Deploy to production
echo 3. Create new site and deploy
echo.

set /p option="Enter option (1-3): "

if "%option%"=="1" (
  echo.
  echo Creating deploy preview...
  netlify deploy
) else if "%option%"=="2" (
  echo.
  echo Deploying to production...
  netlify deploy --prod
) else if "%option%"=="3" (
  echo.
  echo Creating new site and deploying...
  netlify sites:create
  netlify deploy --prod
) else (
  echo.
  echo Invalid option. Exiting.
  exit /b 1
)

echo.
echo Deployment completed!
echo.
echo Next steps:
echo 1. Verify the deployment at the URL provided above
echo 2. Configure environment variables in the Netlify dashboard
echo 3. Test the application functionality
echo.
echo For troubleshooting, refer to DEPLOYMENT_TROUBLESHOOTING.md
echo.
