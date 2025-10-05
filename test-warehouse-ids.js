// Script to test different warehouse IDs in DataFabric
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

// Warehouse IDs to test
const warehouseIds = [
  'wmwhse',   // Generic
  'wmwhse1',  // Specific warehouses
  'wmwhse2',
  'wmwhse3',
  'wmwhse4',
  'wmwhse5',
  'wmwhse6',
  'wmwhse7',
  'wmwhse8',
  'wmwhse9',
  'wmwhse10'
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
  const maxAttempts = 5;
  
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

// Test a warehouse ID
async function testWarehouseId(token, warehouseId) {
  console.log('\n========================================');
  console.log(`TESTING WAREHOUSE ID: ${warehouseId}`);
  console.log('========================================');
  
  const tableName = `CSWMS_${warehouseId}_TASKDETAIL`;
  const query = `SELECT * FROM "${tableName}" LIMIT 10`;
  
  // Submit query
  const queryId = await submitQuery(token, query);
  if (!queryId) {
    console.log(`Failed to submit query for warehouse ID: ${warehouseId}`);
    return false;
  }
  
  // Poll for completion
  const completed = await pollQueryStatus(token, queryId);
  if (!completed) {
    console.log(`Query did not complete successfully for warehouse ID: ${warehouseId}`);
    return false;
  }
  
  // Get results
  const results = await getQueryResults(token, queryId);
  const hasRecords = results && results.results && results.results.length > 0;
  
  if (hasRecords) {
    console.log(`SUCCESS: Found records for warehouse ID: ${warehouseId}`);
    return true;
  } else {
    console.log(`No records found for warehouse ID: ${warehouseId}`);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Testing different warehouse IDs...');
    
    // Get token
    const token = await getToken();
    
    // Track successful warehouse IDs
    const successfulIds = [];
    
    // Test each warehouse ID
    for (const warehouseId of warehouseIds) {
      const success = await testWarehouseId(token, warehouseId);
      if (success) {
        successfulIds.push(warehouseId);
      }
    }
    
    // Summary
    console.log('\n========================================');
    console.log('TESTING SUMMARY');
    console.log('========================================');
    console.log(`Total warehouse IDs tested: ${warehouseIds.length}`);
    console.log(`Successful warehouse IDs: ${successfulIds.length}`);
    
    if (successfulIds.length > 0) {
      console.log('\nSuccessful warehouse IDs:');
      successfulIds.forEach(id => console.log(`- ${id}`));
      console.log('\nUse these warehouse IDs in your application.');
    } else {
      console.log('\nNo successful warehouse IDs found. Please check your API credentials and table names.');
    }
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the script
main();
