@echo off
echo Testing specific table in DataFabric...

if "%1"=="" (
  echo No table name provided, using default: CSWMS_wmwhse_TASKDETAIL
  set TABLE_NAME=CSWMS_wmwhse_TASKDETAIL
) else (
  echo Testing table: %1
  set TABLE_NAME=%1
)

echo Copying .env.test to .env...
copy .env.test .env

echo Running test script...
node test-specific-table.js %TABLE_NAME%

echo Test complete.
pause
