// Test script for TaskDetail synchronization
const axios = require('axios');

// Base URL for API calls
const API_BASE_URL = 'http://localhost:8888/.netlify/functions';

// Test sync options for TaskDetail
const taskDetailSyncOptions = {
  tableId: 'taskdetail',
  whseid: 'wmwhse1',
  batchSize: 100,
  maxRecords: 500
};

/**
 * Start a TaskDetail sync job
 */
async function startTaskDetailSync() {
  try {
    console.log('Starting TaskDetail sync...');
    const response = await axios.post(`${API_BASE_URL}/sync-table`, taskDetailSyncOptions);
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
 * Run the test
 */
async function runTest() {
  try {
    // Start TaskDetail sync
    const syncResult = await startTaskDetailSync();
    
    // Check sync status
    if (syncResult && syncResult.jobId) {
      // Wait for 5 seconds before checking status
      console.log('Waiting 5 seconds before checking status...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await checkSyncStatus(syncResult.jobId);
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest();
