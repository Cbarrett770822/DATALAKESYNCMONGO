// Test script for sync API functions
const axios = require('axios');

// Base URL for API calls
const API_BASE_URL = 'http://localhost:8888/.netlify/functions';

// Test data
const testSyncConfig = {
  tableId: 'taskdetail',
  tableName: 'Task Detail',
  description: 'Warehouse tasks and operations',
  enabled: true,
  syncFrequency: 60,
  initialSync: true,
  batchSize: 100,
  maxRecords: 1000,
  options: {
    whseid: 'WMD1'
  }
};

// Test sync options
const testSyncOptions = {
  tableId: 'taskdetail',
  whseid: 'WMD1',
  batchSize: 100,
  maxRecords: 500
};

/**
 * Initialize sync configurations
 */
async function initSyncConfigs() {
  try {
    console.log('Initializing sync configurations...');
    const response = await axios.post(`${API_BASE_URL}/init-sync-config`, { force: true });
    console.log('Sync configurations initialized:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error initializing sync configurations:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get sync configurations
 */
async function getSyncConfigs() {
  try {
    console.log('Getting sync configurations...');
    const response = await axios.get(`${API_BASE_URL}/sync-config`);
    console.log('Sync configurations:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting sync configurations:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update a sync configuration
 */
async function updateSyncConfig(config) {
  try {
    console.log(`Updating sync configuration for ${config.tableId}...`);
    const response = await axios.put(`${API_BASE_URL}/sync-config`, config);
    console.log('Sync configuration updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating sync configuration:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Start a sync job
 */
async function startSync(options) {
  try {
    console.log(`Starting sync for ${options.tableId}...`);
    const response = await axios.post(`${API_BASE_URL}/sync-table`, options);
    console.log('Sync started:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error starting sync:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Check sync status
 */
async function checkSyncStatus(jobId) {
  try {
    console.log(`Checking sync status for job ${jobId}...`);
    const response = await axios.get(`${API_BASE_URL}/sync-status?jobId=${jobId}`);
    console.log('Sync status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking sync status:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get sync history
 */
async function getSyncHistory(tableId) {
  try {
    console.log(`Getting sync history for ${tableId || 'all tables'}...`);
    const url = tableId ? 
      `${API_BASE_URL}/sync-history?tableId=${tableId}` : 
      `${API_BASE_URL}/sync-history`;
    const response = await axios.get(url);
    console.log('Sync history:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting sync history:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get sync statistics
 */
async function getSyncStats(tableId) {
  try {
    console.log(`Getting sync statistics for ${tableId || 'all tables'}...`);
    const url = tableId ? 
      `${API_BASE_URL}/sync-stats?tableId=${tableId}` : 
      `${API_BASE_URL}/sync-stats`;
    const response = await axios.get(url);
    console.log('Sync statistics:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting sync statistics:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Run scheduled sync
 */
async function runScheduledSync() {
  try {
    console.log('Running scheduled sync...');
    const response = await axios.post(`${API_BASE_URL}/scheduled-sync`, {});
    console.log('Scheduled sync completed:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error running scheduled sync:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Initialize sync configurations
    await initSyncConfigs();
    
    // Get sync configurations
    const configs = await getSyncConfigs();
    
    // Update a sync configuration
    if (configs && configs.length > 0) {
      const config = configs[0];
      config.batchSize = 200;
      await updateSyncConfig(config);
    }
    
    // Start a sync job
    const syncResult = await startSync(testSyncOptions);
    
    // Check sync status
    if (syncResult && syncResult.jobId) {
      await checkSyncStatus(syncResult.jobId);
    }
    
    // Get sync history
    await getSyncHistory('taskdetail');
    
    // Get sync statistics
    await getSyncStats('taskdetail');
    
    // Run scheduled sync
    await runScheduledSync();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();
