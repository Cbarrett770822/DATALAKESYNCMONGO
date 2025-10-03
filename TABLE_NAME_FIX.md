# DataLake Table Name Fix

## Issue Summary

The DataLake synchronization was failing because the SQL queries were using incorrect table names. The application was trying to use separate tables for each warehouse (like "CSWMS_wmwhse1_TASKDETAIL"), but the actual DataLake structure has a single table named "CSWMS_wmwhse_TASKDETAIL" with a WHSEID column to distinguish between warehouses.

## Changes Made

### 1. Fixed Table Name and Added WHSEID Filter

The following functions were updated to use the correct table name and filter by WHSEID:

- `buildCountQuery`: Now uses "CSWMS_wmwhse_TASKDETAIL" and adds a WHSEID filter
- `buildTaskDetailQuery`: Now uses "CSWMS_wmwhse_TASKDETAIL" and adds a WHSEID filter

### 2. Updated Log Messages

Changed log messages to reflect the correct table structure.

### 3. Updated Test Scripts

Modified the test scripts to use the correct table name and WHSEID filtering:
- test-query-filters.js
- simulate-filter-queries.js

## SQL Query Compatibility

Based on testing, the following SQL query formats are compatible with the DataFabric API:

| Query Format | Compatible | Notes |
|--------------|------------|-------|
| Basic count query | ✅ Yes | |
| Task type filter | ✅ Yes | |
| Year filter (EXTRACT) | ❌ No | EXTRACT function not supported |
| Year filter (date range) | ✅ Yes | Use ADDDATE >= 'YYYY-01-01' AND ADDDATE <= 'YYYY-12-31' |
| Year filter (YEAR function) | ✅ Yes | |
| Year filter (string manipulation) | ✅ Yes | |
| Combined filters | ✅ Yes | |

## Recommendations for Future Development

1. **Always filter by WHSEID**: When querying the "CSWMS_wmwhse_TASKDETAIL" table, always include a WHSEID filter in the WHERE clause.

2. **Use Date Range for Year Filtering**: When filtering by year, use date range comparison (ADDDATE >= 'YYYY-01-01' AND ADDDATE <= 'YYYY-12-31') instead of EXTRACT function.

3. **Consider Performance**: For large datasets, consider adding indexes to the WHSEID, ADDDATE, and TASKTYPE columns in the DataLake.

4. **Monitor Query Performance**: Keep an eye on query execution times, especially for large datasets, and optimize as needed.

## Testing

All tests now pass except for the EXTRACT function test, which is expected since that SQL function is not supported by the DataFabric API.

## Deployment

The fixed code is ready to be deployed to production. No database schema changes are required since we're just adjusting the queries to match the existing database structure.
