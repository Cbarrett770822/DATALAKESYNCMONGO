@echo off
echo Running SQL Query Filter Tests for DataLake Sync Application
echo ==========================================================
echo.

echo Step 1: Testing different SQL query formats
echo -----------------------------------------
node --trace-warnings test-query-filters.js
echo.
echo.

echo Step 2: Simulating filter combinations
echo ------------------------------------
node --trace-warnings simulate-filter-queries.js
echo.
echo.

echo All tests completed!
echo Results have been saved to JSON files in the current directory.
echo.

pause
