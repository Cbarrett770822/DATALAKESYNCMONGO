// Test script for Data Lake Sync
const axios = require('axios');
const BASE_URL = 'http://localhost:8888';

async function test() {
  try {
    // Start sync
    console.log('Starting sync...');
    const startResponse = await axios.post(`${BASE_URL}/.netlify/functions/start-sync`, {
      whseid: 'wmwhse',
      batchSize: 1000
    });
    
    const jobId = startResponse.data.jobId;
    console.log(`Job started: ${jobId}`);
    
    // Poll for status
    let completed = false;
    while (!completed) {
      await new Promise(r => setTimeout(r, 2000));
      
      const statusResponse = await axios.get(
        `${BASE_URL}/.netlify/functions/get-sync-status?jobId=${jobId}`
      );
      
      const job = statusResponse.data.job;
      console.log(`Status: ${job.status}, Progress: ${job.percentComplete}%`);
      
      if (job.status === 'completed' || job.status === 'failed') {
        completed = true;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
