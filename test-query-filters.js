/**
 * Test script for DataFabric API queries with different filters
 * This script tests various SQL query formats to determine compatibility
 * 
 * Usage: node test-query-filters.js
 */

const fs = require('fs');
const path = require('path');
const ionApi = require('./functions/utils/ion-api');

// Simple logger for consistent logging
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  warn: (message) => console.warn(`[WARNING] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  result: (message) => console.log(`[RESULT] ${message}`)
};

// Test queries with different filter combinations
const testQueries = [
  {
    name: 'Basic count query (no filters)',
    query: `
      SELECT COUNT(*) as count
      FROM "CSWMS_wmwhse_TASKDETAIL"
      WHERE WHSEID = 'wmwhse1'
    `,
    description: 'Simple count query with warehouse filter only'
  },
  {
    name: 'Task type filter only',
    query: `
      SELECT COUNT(*) as count
      FROM "CSWMS_wmwhse_TASKDETAIL"
      WHERE WHSEID = 'wmwhse1' AND TASKTYPE = 'PICK'
    `,
    description: 'Count query with warehouse and task type filters'
  },
  {
    name: 'Year filter using EXTRACT',
    query: `
      SELECT COUNT(*) as count
      FROM "CSWMS_wmwhse_TASKDETAIL"
      WHERE WHSEID = 'wmwhse1' AND EXTRACT(YEAR FROM ADDDATE) = 2025
    `,
    description: 'Count query with warehouse and year filter using EXTRACT function'
  },
  {
    name: 'Year filter using date range',
    query: `
      SELECT COUNT(*) as count
      FROM "CSWMS_wmwhse_TASKDETAIL"
      WHERE WHSEID = 'wmwhse1' AND ADDDATE >= '2025-01-01' AND ADDDATE <= '2025-12-31'
    `,
    description: 'Count query with warehouse and year filter using date range comparison'
  },
  {
    name: 'Combined filters (task type + year range)',
    query: `
      SELECT COUNT(*) as count
      FROM "CSWMS_wmwhse_TASKDETAIL"
      WHERE WHSEID = 'wmwhse1' AND TASKTYPE = 'PICK' AND ADDDATE >= '2025-01-01' AND ADDDATE <= '2025-12-31'
    `,
    description: 'Count query with warehouse, task type and year filters using date range'
  },
  {
    name: 'Year filter using YEAR function',
    query: `
      SELECT COUNT(*) as count
      FROM "CSWMS_wmwhse_TASKDETAIL"
      WHERE WHSEID = 'wmwhse1' AND YEAR(ADDDATE) = 2025
    `,
    description: 'Count query with warehouse and year filter using YEAR function (alternative syntax)'
  },
  {
    name: 'Year filter using string manipulation',
    query: `
      SELECT COUNT(*) as count
      FROM "CSWMS_wmwhse_TASKDETAIL"
      WHERE WHSEID = 'wmwhse1' AND SUBSTRING(CAST(ADDDATE AS VARCHAR), 1, 4) = '2025'
    `,
    description: 'Count query with warehouse and year filter using string manipulation (most compatible)'
  },
  {
    name: 'Data sample query',
    query: `
      SELECT *
      FROM "CSWMS_wmwhse_TASKDETAIL"
      WHERE WHSEID = 'wmwhse1'
      LIMIT 5
    `,
    description: 'Query to get a sample of data for a specific warehouse'
  }
];

// Test a specific query
async function testQuery(queryObj) {
  logger.info(`Testing query: ${queryObj.name}`);
  logger.info(`Description: ${queryObj.description}`);
  logger.info(`SQL: ${queryObj.query.trim().replace(/\s+/g, ' ')}`);
  
  try {
    // Submit the query
    logger.info('Submitting query to ION API...');
    const response = await ionApi.submitQuery(queryObj.query);
    
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
      logger.error(`Query failed with status: ${queryStatus.status}`);
      return { 
        success: false, 
        error: 'Query failed', 
        status: queryStatus.status,
        details: queryStatus
      };
    }
    
    // If query succeeded, get results
    if (queryStatus.status === 'completed' || queryStatus.status === 'COMPLETED' || queryStatus.status === 'FINISHED') {
      logger.success(`Query completed successfully with status: ${queryStatus.status}`);
      
      // Get results
      const results = await ionApi.getResults(queryId);
      
      // Extract count or data from results based on result format
      let data;
      if (results.results && results.results.length > 0) {
        data = results.results;
      } else if (results.rows && results.rows.length > 0) {
        data = results.rows;
      } else if (results.data) {
        data = results.data;
      } else {
        data = results;
      }
      
      return { 
        success: true, 
        status: queryStatus.status,
        data: data
      };
    } else {
      logger.warn(`Query did not complete after ${maxAttempts} attempts. Last status: ${queryStatus.status}`);
      return { 
        success: false, 
        error: 'Query timeout', 
        status: queryStatus.status
      };
    }
  } catch (error) {
    logger.error(`Error testing query: ${error.message}`);
    return { 
      success: false, 
      error: error.message
    };
  }
}

// Run all test queries
async function runAllTests() {
  logger.info('Starting query filter tests');
  logger.info(`Testing ${testQueries.length} different query formats`);
  
  const results = [];
  
  for (const queryObj of testQueries) {
    logger.info('\n' + '='.repeat(80));
    const result = await testQuery(queryObj);
    
    results.push({
      name: queryObj.name,
      query: queryObj.query.trim().replace(/\s+/g, ' '),
      result: result
    });
    
    // Log the result
    if (result.success) {
      logger.success(`Test "${queryObj.name}" PASSED`);
      
      // For count queries, show the count
      if (queryObj.name.includes('count')) {
        let count = 'Unknown';
        
        if (result.data && result.data[0] && result.data[0].count !== undefined) {
          count = result.data[0].count;
        } else if (result.data && result.data[0] && result.data[0][0] !== undefined) {
          count = result.data[0][0];
        }
        
        logger.result(`Count: ${count}`);
      } 
      // For data sample queries, show record count
      else if (queryObj.name.includes('sample')) {
        const recordCount = Array.isArray(result.data) ? result.data.length : 'Unknown';
        logger.result(`Records returned: ${recordCount}`);
        
        // Show first record as sample
        if (Array.isArray(result.data) && result.data.length > 0) {
          const firstRecord = result.data[0];
          logger.result(`Sample record: ${JSON.stringify(firstRecord).substring(0, 200)}...`);
        }
      }
    } else {
      logger.error(`Test "${queryObj.name}" FAILED: ${result.error}`);
    }
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(__dirname, `query-test-results-${timestamp}.json`);
  
  fs.writeFileSync(
    resultsFile, 
    JSON.stringify(results, null, 2)
  );
  
  logger.info('\n' + '='.repeat(80));
  logger.info(`All tests completed. Results saved to ${resultsFile}`);
  
  // Print summary
  logger.info('\nSUMMARY:');
  const successful = results.filter(r => r.result.success).length;
  logger.info(`Passed: ${successful}/${results.length}`);
  logger.info(`Failed: ${results.length - successful}/${results.length}`);
  
  // Show which query formats worked
  logger.info('\nCOMPATIBLE QUERY FORMATS:');
  results.forEach(r => {
    if (r.result.success) {
      logger.success(`✓ ${r.name}`);
    } else {
      logger.error(`✗ ${r.name}`);
    }
  });
}

// Run the tests
runAllTests().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
