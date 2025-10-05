@echo off
echo Testing SQL queries against DataFabric API...

echo Copying .env.test to .env...
copy .env.test .env

echo Running test script...
node test-sql-query.js

echo Test complete.
pause
