// Simple script to test SQL queries against DataFabric API
const axios = require('axios');
require('dotenv').config();

// Configuration - update these values as needed
const config = {
  apiUrl: process.env.DATAFABRIC_API_URL || 'https://api.datafabric.cswg.com',
  clientId: process.env.DATAFABRIC_CLIENT_ID,
  clientSecret: process.env.DATAFABRIC_CLIENT_SECRET,
  tenant: process.env.DATAFABRIC_TENANT,
  saak: process.env.DATAFABRIC_SAAK,
  sask: process.env.DATAFABRIC_SASK
};

// SQL queries to test
const queriesToTest = [
  // Original query
  'SELECT * FROM "CSWMS_wmwhse_TASKDETAIL"',
  
  // Try with specific warehouse IDs
  'SELECT * FROM "CSWMS_wmwhse1_TASKDETAIL"',
  'SELECT * FROM "CSWMS_wmwhse2_TASKDETAIL"',
  'SELECT * FROM "CSWMS_wmwhse3_TASKDETAIL"',
  'SELECT * FROM "CSWMS_wmwhse4_TASKDETAIL"',
  
  // Try without quotes
  'SELECT * FROM CSWMS_wmwhse_TASKDETAIL',
  
  // Try with different case
  'SELECT * FROM "cswms_wmwhse_taskdetail"',
  
  // Try with LIMIT
  'SELECT * FROM "CSWMS_wmwhse_TASKDETAIL" LIMIT 10',
  
  // Try a simple test query
  'SELECT 1'
];

// Get authentication token
async function getToken() {
  try {
    console.log('Getting authentication token...');
    
    const tokenResponse = await axios.post(`${config.apiUrl}/v1/token`, {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tenant: config.tenant,
      saak: config.saak,
      sask: config.sask
    });
    
    console.log('Token obtained successfully');
    return tokenResponse.data.token;
  } catch (error) {
    console.error('Error getting token:', error.response?.data || error.message);
    throw error;
  }
}

// Submit a query to DataFabric
async function submitQuery(token, sqlQuery) {
  try {
    console.log(`\nSubmitting query: ${sqlQuery}`);
    
    const response = await axios.post(`${config.apiUrl}/v1/query`, {
      sqlQuery,
      offset: 0,
      limit: 10
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Query submitted successfully');
    console.log('Query ID:', response.data.queryId);
    return response.data.queryId;
  } catch (error) {
    console.error('Error submitting query:', error.response?.data || error.message);
    return null;
  }
}

// Check query status
async function checkQueryStatus(token, queryId) {
  try {
    console.log(`Checking status for query ID: ${queryId}`);
    
    const response = await axios.get(`${config.apiUrl}/v1/query/${queryId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Status:', response.data.status);
    console.log('Progress:', response.data.progress || 0);
    return response.data;
  } catch (error) {
    console.error('Error checking query status:', error.response?.data || error.message);
    return { status: 'ERROR' };
  }
}

// Get query results
async function getQueryResults(token, queryId) {
  try {
    console.log(`Getting results for query ID: ${queryId}`);
    
    const response = await axios.get(`${config.apiUrl}/v1/query/${queryId}/results`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const recordCount = response.data.results?.length || 0;
    console.log(`Results received: ${recordCount} records`);
    
    if (recordCount > 0) {
      console.log('Sample record:', JSON.stringify(response.data.results[0], null, 2));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting query results:', error.response?.data || error.message);
    return null;
  }
}

// Poll for query completion
async function pollQueryStatus(token, queryId) {
  let status;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    attempts++;
    console.log(`Polling attempt ${attempts}/${maxAttempts}`);
    
    const statusResponse = await checkQueryStatus(token, queryId);
    status = statusResponse.status?.toUpperCase();
    
    if (status === 'COMPLETED' || status === 'FINISHED' || status === 'DONE') {
      return true;
    } else if (status === 'FAILED' || status === 'ERROR') {
      return false;
    }
    
    // Wait 3 seconds before checking again
    console.log('Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  } while (attempts < maxAttempts);
  
  console.log('Maximum polling attempts reached');
  return false;
}

// Test a single query
async function testQuery(token, sqlQuery) {
  console.log('\n========================================');
  console.log(`TESTING QUERY: ${sqlQuery}`);
  console.log('========================================');
  
  // Submit query
  const queryId = await submitQuery(token, sqlQuery);
  if (!queryId) {
    console.log('Failed to submit query, skipping to next query');
    return;
  }
  
  // Poll for completion
  const completed = await pollQueryStatus(token, queryId);
  if (!completed) {
    console.log('Query did not complete successfully, skipping results');
    return;
  }
  
  // Get results
  await getQueryResults(token, queryId);
}

// Main function to test all queries
async function testAllQueries() {
  try {
    // Get token
    const token = await getToken();
    
    // Test each query
    for (const query of queriesToTest) {
      await testQuery(token, query);
    }
    
    console.log('\nAll queries tested');
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the script
testAllQueries();
