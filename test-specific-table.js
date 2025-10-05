// Script to test a specific table in DataFabric
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

// Get the table name from command line arguments
const tableName = process.argv[2] || 'CSWMS_wmwhse_TASKDETAIL';

if (!tableName) {
  console.error('Please provide a table name as a command line argument');
  process.exit(1);
}

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

// Test different query variations for the specified table
async function testTableQueries(token, tableName) {
  // Generate different query variations
  const queries = [
    // Basic query
    `SELECT * FROM "${tableName}"`,
    
    // Without quotes
    `SELECT * FROM ${tableName}`,
    
    // With LIMIT
    `SELECT * FROM "${tableName}" LIMIT 10`,
    
    // Count query
    `SELECT COUNT(*) FROM "${tableName}"`,
    
    // Check if table exists
    `SELECT 1 FROM "${tableName}" LIMIT 1`
  ];
  
  // Test each query
  for (const query of queries) {
    console.log('\n========================================');
    console.log(`TESTING QUERY: ${query}`);
    console.log('========================================');
    
    // Submit query
    const queryId = await submitQuery(token, query);
    if (!queryId) {
      console.log('Failed to submit query, skipping to next query');
      continue;
    }
    
    // Poll for completion
    const completed = await pollQueryStatus(token, queryId);
    if (!completed) {
      console.log('Query did not complete successfully, skipping results');
      continue;
    }
    
    // Get results
    await getQueryResults(token, queryId);
  }
}

// Main function
async function main() {
  try {
    console.log(`Testing table: ${tableName}`);
    
    // Get token
    const token = await getToken();
    
    // Test queries for the specified table
    await testTableQueries(token, tableName);
    
    console.log('\nAll tests completed');
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the script
main();
