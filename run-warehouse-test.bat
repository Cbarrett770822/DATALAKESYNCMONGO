@echo off
echo Testing different warehouse IDs in DataFabric...

echo Copying .env.test to .env...
copy .env.test .env

echo Running test script...
node test-warehouse-ids.js

echo Test complete.
pause
