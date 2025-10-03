# DataLake Sync Query Testing

This document explains how to use the query testing tools to validate SQL compatibility with the DataFabric API.

## Overview

The DataLake Sync application needs to query the Infor WMS DataLake using SQL. However, different SQL dialects support different syntax for filtering data. These test scripts help identify which SQL syntax is compatible with the DataFabric API.

## Test Scripts

1. **test-query-filters.js**: Tests various SQL query formats to determine compatibility
2. **simulate-filter-queries.js**: Simulates the actual query building process used in the application with different filter combinations
3. **run-query-tests.bat**: Batch script to run both test scripts in sequence

## Running the Tests

### Option 1: Using the Batch Script

1. Open a command prompt
2. Navigate to the project directory
3. Run the batch script:
   ```
   run-query-tests.bat
   ```

### Option 2: Running Individual Tests

1. Open a command prompt
2. Navigate to the project directory
3. Run the test-query-filters.js script:
   ```
   node test-query-filters.js
   ```
4. Run the simulate-filter-queries.js script:
   ```
   node simulate-filter-queries.js
   ```

## Test Results

The test scripts will generate JSON files with detailed results:

- **query-test-results-[timestamp].json**: Results from testing different SQL query formats
- **filter-simulation-results-[timestamp].json**: Results from simulating filter combinations

These files contain detailed information about which queries succeeded or failed, along with error messages and sample data.

## Interpreting Results

### SQL Format Compatibility

The test-query-filters.js script tests different ways of writing SQL queries, particularly for filtering by year:

- **EXTRACT function**: `EXTRACT(YEAR FROM ADDDATE) = 2025`
- **Date range**: `ADDDATE >= '2025-01-01' AND ADDDATE <= '2025-12-31'`
- **YEAR function**: `YEAR(ADDDATE) = 2025`
- **String manipulation**: `SUBSTRING(CAST(ADDDATE AS VARCHAR), 1, 4) = '2025'`

The results will show which of these formats are compatible with the DataFabric API.

### Filter Combination Compatibility

The simulate-filter-queries.js script tests different combinations of filters:

- No filters
- Year filter only
- Task type filter only
- Combined year and task type filters

The results will show which filter combinations work with each warehouse.

## Updating the Application

Based on the test results, you may need to update the application's query building logic in copy-taskdetail.js:

1. If date range filtering works, keep the current implementation
2. If a different year filtering approach works better, update the buildCountQuery and buildTaskDetailQuery functions
3. If certain filter combinations consistently fail, update the error handling to provide better guidance to users

## Troubleshooting

If all queries fail, check:

1. ION API credentials in the hardcoded-credentials.js file
2. Network connectivity to the DataFabric API
3. Permissions for the API user

If only certain queries fail, it's likely due to SQL dialect limitations in the DataFabric API.
