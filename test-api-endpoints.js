/**
 * Test script for API endpoints
 * This script tests all API endpoints to ensure they are working correctly
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseUrl: 'http://localhost:8888/.netlify/functions',
  timeout: 30000,
  logFile: path.join(__dirname, 'api-test-results.log')
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  tests: []
};

// Create API client
const api = axios.create({
  baseURL: config.baseUrl,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Logger
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(config.logFile, logMessage + '\n');
  },
  error: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(logMessage);
    fs.appendFileSync(config.logFile, logMessage + '\n');
  },
  result: (testName, passed, message) => {
    const status = passed ? 'PASSED' : 'FAILED';
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${status}] ${testName}: ${message}`;
    console.log(logMessage);
    fs.appendFileSync(config.logFile, logMessage + '\n');
    
    results.tests.push({
      name: testName,
      passed,
      message,
      timestamp
    });
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    results.total++;
  }
};

// Initialize log file
fs.writeFileSync(config.logFile, `API Endpoint Test Results - ${new Date().toISOString()}\n\n`);

// Helper function to run a test
async function runTest(name, testFn) {
  logger.log(`Running test: ${name}`);
  try {
    await testFn();
    logger.result(name, true, 'Test passed');
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    if (error.response) {
      logger.error(`Response status: ${error.response.status}`);
      logger.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    logger.result(name, false, error.message);
  }
}

// Test functions
async function testGetToken() {
  const response = await api.get('/get-token');
  if (!response.data.token) {
    throw new Error('No token returned');
  }
  return response.data.token;
}

async function testSubmitQuery() {
  const sqlQuery = 'SELECT * FROM wmwhse_taskdetail.taskdetail LIMIT 10';
  const response = await api.post('/submit-query', { sqlQuery });
  if (!response.data.queryId) {
    throw new Error('No queryId returned');
  }
  return response.data.queryId;
}

async function testCheckStatus(queryId) {
  const response = await api.get(`/check-status?queryId=${queryId}`);
  if (!response.data.status) {
    throw new Error('No status returned');
  }
  return response.data;
}

async function testGetResults(queryId) {
  const response = await api.get(`/get-results?queryId=${queryId}&offset=0&limit=10`);
  if (!response.data.results) {
    throw new Error('No results returned');
  }
  return response.data;
}

async function testSyncTaskdetail() {
  const options = {
    startDate: '2025-01-01',
    endDate: '2025-07-01',
    limit: 100
  };
  const response = await api.post('/sync-taskdetail', options);
  if (!response.data.jobId) {
    throw new Error('No jobId returned');
  }
  return response.data.jobId;
}

async function testCheckSyncStatus(jobId) {
  const response = await api.get(`/check-sync-status?jobId=${jobId}`);
  if (!response.data.status) {
    throw new Error('No status returned');
  }
  return response.data;
}

async function testGetSyncHistory() {
  const response = await api.get('/get-sync-history?page=1&limit=10');
  if (!Array.isArray(response.data.jobs)) {
    throw new Error('No jobs array returned');
  }
  return response.data;
}

async function testGetTaskdetailStats() {
  const response = await api.get('/get-taskdetail-stats');
  if (!response.data.stats) {
    throw new Error('No stats returned');
  }
  return response.data;
}

async function testGetSettings() {
  const response = await api.get('/get-settings');
  if (!response.data) {
    throw new Error('No settings returned');
  }
  return response.data;
}

async function testSaveSettings() {
  const settings = {
    syncFrequency: 'daily',
    syncTime: '00:00',
    notifyOnCompletion: true
  };
  const response = await api.post('/save-settings', settings);
  if (!response.data.success) {
    throw new Error('Settings not saved successfully');
  }
  return response.data;
}

// Main test function
async function runTests() {
  logger.log('Starting API endpoint tests');
  
  // Test get-token
  await runTest('get-token', async () => {
    await testGetToken();
  });
  
  // Test submit-query and related endpoints
  let queryId;
  await runTest('submit-query', async () => {
    queryId = await testSubmitQuery();
  });
  
  if (queryId) {
    // Test check-status
    await runTest('check-status', async () => {
      await testCheckStatus(queryId);
    });
    
    // Wait for query to complete
    let queryCompleted = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!queryCompleted && attempts < maxAttempts) {
      try {
        logger.log(`Waiting for query to complete (attempt ${attempts + 1}/${maxAttempts})...`);
        const status = await testCheckStatus(queryId);
        if (status.status === 'completed') {
          queryCompleted = true;
          logger.log('Query completed successfully');
        } else if (status.status === 'failed') {
          throw new Error('Query failed');
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        logger.error(`Error checking query status: ${error.message}`);
        break;
      }
      attempts++;
    }
    
    // Test get-results if query completed
    if (queryCompleted) {
      await runTest('get-results', async () => {
        await testGetResults(queryId);
      });
    } else {
      logger.log('Skipping get-results test because query did not complete');
      results.skipped++;
    }
  } else {
    logger.log('Skipping check-status and get-results tests because submit-query failed');
    results.skipped += 2;
  }
  
  // Test sync-taskdetail and related endpoints
  let jobId;
  await runTest('sync-taskdetail', async () => {
    jobId = await testSyncTaskdetail();
  });
  
  if (jobId) {
    // Test check-sync-status
    await runTest('check-sync-status', async () => {
      await testCheckSyncStatus(jobId);
    });
  } else {
    logger.log('Skipping check-sync-status test because sync-taskdetail failed');
    results.skipped++;
  }
  
  // Test get-sync-history
  await runTest('get-sync-history', async () => {
    await testGetSyncHistory();
  });
  
  // Test get-taskdetail-stats
  await runTest('get-taskdetail-stats', async () => {
    await testGetTaskdetailStats();
  });
  
  // Test get-settings and save-settings
  await runTest('get-settings', async () => {
    await testGetSettings();
  });
  
  await runTest('save-settings', async () => {
    await testSaveSettings();
  });
  
  // Print summary
  logger.log('\n--- Test Summary ---');
  logger.log(`Total tests: ${results.total}`);
  logger.log(`Passed: ${results.passed}`);
  logger.log(`Failed: ${results.failed}`);
  logger.log(`Skipped: ${results.skipped}`);
  logger.log('-------------------\n');
  
  // Save results to file
  fs.writeFileSync(
    path.join(__dirname, 'api-test-summary.json'),
    JSON.stringify(results, null, 2)
  );
}

// Run tests
runTests()
  .then(() => {
    logger.log('Tests completed');
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    logger.error(`Error running tests: ${error.message}`);
    process.exit(1);
  });
