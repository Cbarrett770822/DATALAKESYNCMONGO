/**
 * Simulation script for testing TaskDetail queries with different filter combinations
 * This script simulates the query building and execution process from the copy-taskdetail.js function
 * 
 * Usage: node simulate-filter-queries.js
 */

const ionApi = require('./functions/utils/ion-api');

// Simple logger for consistent logging
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  warn: (message) => console.warn(`[WARNING] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  result: (message) => console.log(`[RESULT] ${message}`)
};

// Filter combinations to test
const filterCombinations = [
  { name: 'No filters', filters: {} },
  { name: 'Year filter only (2025)', filters: { year: 2025 } },
  { name: 'Task type filter only (PICK)', filters: { taskType: 'PICK' } },
  { name: 'Task type filter only (COUNT)', filters: { taskType: 'COUNT' } },
  { name: 'Combined filters (Year 2025 + PICK)', filters: { year: 2025, taskType: 'PICK' } },
  { name: 'Combined filters (Year 2024 + COUNT)', filters: { year: 2024, taskType: 'COUNT' } }
];

// Warehouse IDs to test
const warehouseIds = ['wmwhse1', 'wmwhse10'];

// Build count query (copied from copy-taskdetail.js)
function buildCountQuery(whseid = 'wmwhse1', filters = {}) {
  // Build WHERE clause based on filters
  let whereClause = '';
  const conditions = [];
  
  // Always filter by warehouse ID
  conditions.push(`WHSEID = '${whseid}'`);
  
  // Add year filter if provided
  if (filters.year) {
    try {
      // Use a date range comparison that's compatible with most SQL dialects
      const yearStart = `${filters.year}-01-01`;
      const yearEnd = `${filters.year}-12-31`;
      
      // Use simple string comparison which works in most SQL dialects
      conditions.push(`(ADDDATE >= '${yearStart}' AND ADDDATE <= '${yearEnd}')`);
      
      logger.info(`Using date range filter: ADDDATE between ${yearStart} and ${yearEnd}`);
    } catch (e) {
      logger.error('Error creating date filter:', e.message);
    }
  }
  
  // Add task type filter if provided
  if (filters.taskType) {
    conditions.push(`TASKTYPE = '${filters.taskType}'`);
  }
  
  // Combine conditions
  whereClause = `WHERE ${conditions.join(' AND ')}`;
  
  return `
    SELECT COUNT(*) as count
    FROM "CSWMS_wmwhse_TASKDETAIL"
    ${whereClause}
  `;
}

// Build task detail query (copied from copy-taskdetail.js)
function buildTaskDetailQuery(offset, limit, whseid = 'wmwhse1', filters = {}) {
  // Build WHERE clause based on filters
  let whereClause = '';
  const conditions = [];
  
  // Always filter by warehouse ID
  conditions.push(`WHSEID = '${whseid}'`);
  
  // Add year filter if provided
  if (filters.year) {
    try {
      // Use a date range comparison that's compatible with most SQL dialects
      const yearStart = `${filters.year}-01-01`;
      const yearEnd = `${filters.year}-12-31`;
      
      // Use simple string comparison which works in most SQL dialects
      conditions.push(`(ADDDATE >= '${yearStart}' AND ADDDATE <= '${yearEnd}')`);
      
      logger.info(`Using date range filter: ADDDATE between ${yearStart} and ${yearEnd}`);
    } catch (e) {
      logger.error('Error creating date filter:', e.message);
    }
  }
  
  // Add task type filter if provided
  if (filters.taskType) {
    conditions.push(`TASKTYPE = '${filters.taskType}'`);
  }
  
  // Combine conditions
  whereClause = `WHERE ${conditions.join(' AND ')}`;
  
  // For single record lookup
  if (limit === 1) {
    return `
      SELECT *
      FROM "CSWMS_wmwhse_TASKDETAIL"
      ${whereClause}
      ORDER BY TASKDETAILKEY
      OFFSET ${offset}
      LIMIT 1
    `;
  }
  
  // Query for larger batches with filters
  return `
    SELECT *
    FROM (
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY TASKDETAILKEY) AS row_num
      FROM 
        "CSWMS_wmwhse_TASKDETAIL"
      ${whereClause}
    ) AS numbered_rows
    WHERE row_num BETWEEN ${offset + 1} AND ${offset + limit}
  `;
}

// Test count query
async function testCountQuery(whseid, filters) {
  const query = buildCountQuery(whseid, filters);
  logger.info(`Testing count query for warehouse ${whseid} with filters: ${JSON.stringify(filters)}`);
  logger.info(`SQL: ${query.trim().replace(/\s+/g, ' ')}`);
  
  try {
    // Submit the query
    logger.info('Submitting count query to ION API...');
    const response = await ionApi.submitQuery(query);
    
    if (!response || !response.queryId && !response.id) {
      logger.error('Invalid response from ION API');
      return { success: false, error: 'Invalid response' };
    }
    
    const queryId = response.queryId || response.id;
    logger.info(`Query ID: ${queryId}`);
    
    // Wait for query to complete
    logger.info('Checking query status...');
    let queryStatus = await ionApi.checkStatus(queryId);
    let attempts = 1;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts && 
           queryStatus.status !== 'completed' && 
           queryStatus.status !== 'COMPLETED' && 
           queryStatus.status !== 'FINISHED' &&
           queryStatus.status !== 'failed' && 
           queryStatus.status !== 'FAILED') {
      logger.info(`Query status: ${queryStatus.status}, waiting 1 second... (attempt ${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      queryStatus = await ionApi.checkStatus(queryId);
      attempts++;
    }
    
    // Check if query failed
    if (queryStatus.status === 'failed' || queryStatus.status === 'FAILED') {
      logger.error(`Count query failed with status: ${queryStatus.status}`);
      return { 
        success: false, 
        error: 'Query failed', 
        status: queryStatus.status,
        details: queryStatus
      };
    }
    
    // If query succeeded, get results
    if (queryStatus.status === 'completed' || queryStatus.status === 'COMPLETED' || queryStatus.status === 'FINISHED') {
      logger.success(`Count query completed successfully with status: ${queryStatus.status}`);
      
      // Get results
      const results = await ionApi.getResults(queryId);
      
      // Extract count from results based on result format
      let count = 0;
      
      if (results.results && results.results[0] && results.results[0].count !== undefined) {
        count = parseInt(results.results[0].count, 10);
      } else if (results.rows && results.rows[0] && results.rows[0][0] !== undefined) {
        count = parseInt(results.rows[0][0], 10);
      } else if (results.data && results.data.count !== undefined) {
        count = parseInt(results.data.count, 10);
      }
      
      logger.result(`Total records: ${count}`);
      
      return { 
        success: true, 
        status: queryStatus.status,
        count: count
      };
    } else {
      logger.warn(`Count query did not complete after ${maxAttempts} attempts. Last status: ${queryStatus.status}`);
      return { 
        success: false, 
        error: 'Query timeout', 
        status: queryStatus.status
      };
    }
  } catch (error) {
    logger.error(`Error testing count query: ${error.message}`);
    return { 
      success: false, 
      error: error.message
    };
  }
}

// Test data query
async function testDataQuery(whseid, filters) {
  const offset = 0;
  const limit = 5; // Just get a few records for testing
  const query = buildTaskDetailQuery(offset, limit, whseid, filters);
  
  logger.info(`Testing data query for warehouse ${whseid} with filters: ${JSON.stringify(filters)}`);
  logger.info(`SQL: ${query.trim().replace(/\s+/g, ' ')}`);
  
  try {
    // Submit the query
    logger.info('Submitting data query to ION API...');
    const response = await ionApi.submitQuery(query);
    
    if (!response || !response.queryId && !response.id) {
      logger.error('Invalid response from ION API');
      return { success: false, error: 'Invalid response' };
    }
    
    const queryId = response.queryId || response.id;
    logger.info(`Query ID: ${queryId}`);
    
    // Wait for query to complete
    logger.info('Checking query status...');
    let queryStatus = await ionApi.checkStatus(queryId);
    let attempts = 1;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts && 
           queryStatus.status !== 'completed' && 
           queryStatus.status !== 'COMPLETED' && 
           queryStatus.status !== 'FINISHED' &&
           queryStatus.status !== 'failed' && 
           queryStatus.status !== 'FAILED') {
      logger.info(`Query status: ${queryStatus.status}, waiting 1 second... (attempt ${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      queryStatus = await ionApi.checkStatus(queryId);
      attempts++;
    }
    
    // Check if query failed
    if (queryStatus.status === 'failed' || queryStatus.status === 'FAILED') {
      logger.error(`Data query failed with status: ${queryStatus.status}`);
      return { 
        success: false, 
        error: 'Query failed', 
        status: queryStatus.status,
        details: queryStatus
      };
    }
    
    // If query succeeded, get results
    if (queryStatus.status === 'completed' || queryStatus.status === 'COMPLETED' || queryStatus.status === 'FINISHED') {
      logger.success(`Data query completed successfully with status: ${queryStatus.status}`);
      
      // Get results
      const results = await ionApi.getResults(queryId);
      
      // Extract data from results based on result format
      let data = [];
      
      if (results.results && Array.isArray(results.results)) {
        data = results.results;
      } else if (results.rows && Array.isArray(results.rows)) {
        data = results.rows;
      } else if (results.data) {
        data = Array.isArray(results.data) ? results.data : [results.data];
      }
      
      logger.result(`Records returned: ${data.length}`);
      
      // Show sample record
      if (data.length > 0) {
        const sampleRecord = data[0];
        const sampleKeys = Object.keys(sampleRecord).slice(0, 5); // Show first 5 keys
        logger.result(`Sample record keys: ${JSON.stringify(sampleKeys)}`);
        
        // Show TASKTYPE and ADDDATE if available
        if (sampleRecord.TASKTYPE) {
          logger.result(`Sample TASKTYPE: ${sampleRecord.TASKTYPE}`);
        }
        if (sampleRecord.ADDDATE) {
          logger.result(`Sample ADDDATE: ${sampleRecord.ADDDATE}`);
        }
      }
      
      return { 
        success: true, 
        status: queryStatus.status,
        recordCount: data.length,
        data: data
      };
    } else {
      logger.warn(`Data query did not complete after ${maxAttempts} attempts. Last status: ${queryStatus.status}`);
      return { 
        success: false, 
        error: 'Query timeout', 
        status: queryStatus.status
      };
    }
  } catch (error) {
    logger.error(`Error testing data query: ${error.message}`);
    return { 
      success: false, 
      error: error.message
    };
  }
}

// Run simulation for all filter combinations
async function runSimulation() {
  logger.info('Starting filter query simulation');
  logger.info(`Testing ${filterCombinations.length} filter combinations on ${warehouseIds.length} warehouses`);
  
  const results = [];
  
  for (const whseid of warehouseIds) {
    for (const filterCombo of filterCombinations) {
      logger.info('\n' + '='.repeat(80));
      logger.info(`Testing ${filterCombo.name} on warehouse ${whseid}`);
      
      // Test count query
      const countResult = await testCountQuery(whseid, filterCombo.filters);
      
      // Only test data query if count query succeeded
      let dataResult = { success: false, error: 'Count query failed, skipping data query' };
      if (countResult.success) {
        // If count is very large, skip data query
        if (countResult.count > 10000) {
          logger.warn(`Count is very large (${countResult.count}), skipping data query`);
          dataResult = { success: true, skipped: true, reason: 'Count too large' };
        } else {
          dataResult = await testDataQuery(whseid, filterCombo.filters);
        }
      }
      
      results.push({
        warehouse: whseid,
        filterName: filterCombo.name,
        filters: filterCombo.filters,
        countQuery: {
          success: countResult.success,
          count: countResult.count,
          error: countResult.error
        },
        dataQuery: {
          success: dataResult.success,
          recordCount: dataResult.recordCount,
          error: dataResult.error,
          skipped: dataResult.skipped
        }
      });
      
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Print summary
  logger.info('\n' + '='.repeat(80));
  logger.info('SIMULATION SUMMARY:');
  
  results.forEach(result => {
    const status = result.countQuery.success && (result.dataQuery.success || result.dataQuery.skipped) ? 
      'PASSED' : 'FAILED';
    
    logger.info(`${status}: Warehouse ${result.warehouse}, ${result.filterName}`);
    
    if (result.countQuery.success) {
      logger.result(`  Count: ${result.countQuery.count}`);
    } else {
      logger.error(`  Count query failed: ${result.countQuery.error}`);
    }
    
    if (result.dataQuery.skipped) {
      logger.warn(`  Data query skipped: ${result.dataQuery.reason}`);
    } else if (result.dataQuery.success) {
      logger.result(`  Data records: ${result.dataQuery.recordCount}`);
    } else {
      logger.error(`  Data query failed: ${result.dataQuery.error}`);
    }
  });
  
  // Save results to file
  const fs = require('fs');
  const path = require('path');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(__dirname, `filter-simulation-results-${timestamp}.json`);
  
  fs.writeFileSync(
    resultsFile, 
    JSON.stringify(results, null, 2)
  );
  
  logger.info(`\nResults saved to ${resultsFile}`);
  
  // Final compatibility summary
  logger.info('\nFILTER COMPATIBILITY SUMMARY:');
  
  const compatibilitySummary = {};
  
  filterCombinations.forEach(combo => {
    const warehouseResults = {};
    
    warehouseIds.forEach(whseid => {
      const result = results.find(r => r.warehouse === whseid && r.filterName === combo.name);
      if (result) {
        warehouseResults[whseid] = result.countQuery.success && (result.dataQuery.success || result.dataQuery.skipped);
      }
    });
    
    compatibilitySummary[combo.name] = warehouseResults;
  });
  
  Object.entries(compatibilitySummary).forEach(([filterName, warehouseResults]) => {
    const allCompatible = Object.values(warehouseResults).every(v => v === true);
    
    if (allCompatible) {
      logger.success(`✓ ${filterName}: Compatible with all warehouses`);
    } else {
      const compatibleWarehouses = Object.entries(warehouseResults)
        .filter(([_, isCompatible]) => isCompatible)
        .map(([whseid, _]) => whseid);
      
      if (compatibleWarehouses.length === 0) {
        logger.error(`✗ ${filterName}: Not compatible with any warehouse`);
      } else {
        logger.warn(`⚠ ${filterName}: Compatible with some warehouses: ${compatibleWarehouses.join(', ')}`);
      }
    }
  });
}

// Run the simulation
runSimulation().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
