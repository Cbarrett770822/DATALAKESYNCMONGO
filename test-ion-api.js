/**
 * Test script for direct ION API access
 * This script tests basic connectivity to the ION API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Simple logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  json: (label, data) => console.log(`[JSON] ${label}: ${JSON.stringify(data, null, 2)}`)
};

// Load credentials from file
function loadCredentials() {
  try {
    // Try to find credentials file
    const credentialsPath = path.join(__dirname, 'ION_Credentials', 'IONAPI_CREDENTIALS.ionapi');
    logger.info(`Looking for credentials at: ${credentialsPath}`);
    
    if (fs.existsSync(credentialsPath)) {
      const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsData);
      
      logger.success(`Credentials loaded successfully from ${credentialsPath}`);
      
      return {
        tenant: credentials.ti,
        saak: credentials.saak,
        sask: credentials.sask,
        clientId: credentials.ci,
        clientSecret: credentials.cs,
        ionApiUrl: credentials.iu || 'https://mingle-ionapi.inforcloudsuite.com',
        ssoUrl: credentials.pu || `https://mingle-sso.inforcloudsuite.com:443/${credentials.ti}/as/`
      };
    } else {
      throw new Error(`Credentials file not found at ${credentialsPath}`);
    }
  } catch (error) {
    logger.error(`Error loading credentials: ${error.message}`);
    throw error;
  }
}

// Make HTTPS request
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    logger.info(`Making ${options.method} request to ${options.hostname}${options.path}`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        logger.info(`Response status: ${res.statusCode} ${res.statusMessage}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject({
            statusCode: res.statusCode,
            message: `HTTP Error: ${res.statusCode}`,
            data: data
          });
        }
      });
    });
    
    req.on('error', (e) => {
      reject({
        message: `Request error: ${e.message}`,
        error: e
      });
    });
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

// Get OAuth token
async function getToken(credentials) {
  logger.info('Getting OAuth token...');
  
  // Create Basic Auth header
  const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  
  // Prepare the request body
  const body = `grant_type=password&username=${encodeURIComponent(credentials.saak)}&password=${encodeURIComponent(credentials.sask)}&scope=openid`;
  
  // Extract hostname and path from SSO URL
  const ssoUrlObj = new URL(credentials.ssoUrl);
  const tokenPath = `${ssoUrlObj.pathname}token.oauth2`;
  
  const options = {
    hostname: ssoUrlObj.hostname,
    port: ssoUrlObj.port || 443,
    path: tokenPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  
  try {
    const response = await makeRequest(options, body);
    logger.success('Token retrieved successfully');
    return response.access_token;
  } catch (error) {
    logger.error(`Error getting token: ${error.message}`);
    throw error;
  }
}

// Test DataFabric API connectivity
async function testDataFabricApi() {
  try {
    // Load credentials
    const credentials = loadCredentials();
    
    // Get token
    const token = await getToken(credentials);
    logger.success('Authentication successful');
    
    // Test a simple query
    const simpleQuery = 'SELECT 1 as test';
    
    // Prepare the request URL
    const submitUrl = new URL(`${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/`);
    
    const options = {
      hostname: submitUrl.hostname,
      port: submitUrl.port || 443,
      path: submitUrl.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(simpleQuery)
      }
    };
    
    logger.info(`Submitting simple query: ${simpleQuery}`);
    const response = await makeRequest(options, simpleQuery);
    logger.json('Query submission response', response);
    
    // Check query status
    const queryId = response.queryId || response.id;
    if (!queryId) {
      throw new Error('No query ID returned');
    }
    
    logger.info(`Query ID: ${queryId}`);
    
    // Wait for query to complete
    const statusUrl = new URL(`${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/${queryId}/status/`);
    
    const statusOptions = {
      hostname: statusUrl.hostname,
      port: statusUrl.port || 443,
      path: statusUrl.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    };
    
    logger.info('Checking query status...');
    let queryStatus;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      queryStatus = await makeRequest(statusOptions);
      logger.info(`Query status: ${queryStatus.status} (attempt ${attempts + 1}/${maxAttempts})`);
      attempts++;
    } while (attempts < maxAttempts && 
             queryStatus.status !== 'completed' && 
             queryStatus.status !== 'COMPLETED' && 
             queryStatus.status !== 'FINISHED' &&
             queryStatus.status !== 'failed' && 
             queryStatus.status !== 'FAILED');
    
    logger.json('Final query status', queryStatus);
    
    // If query succeeded, get results
    if (queryStatus.status === 'completed' || queryStatus.status === 'COMPLETED' || queryStatus.status === 'FINISHED') {
      const resultsUrl = new URL(`${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/${queryId}/result/`);
      
      const resultsOptions = {
        hostname: resultsUrl.hostname,
        port: resultsUrl.port || 443,
        path: resultsUrl.pathname,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      };
      
      logger.info('Getting query results...');
      const results = await makeRequest(resultsOptions);
      logger.json('Query results', results);
      
      logger.success('Test completed successfully');
    } else {
      logger.error(`Query failed or timed out with status: ${queryStatus.status}`);
    }
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    if (error.data) {
      try {
        const errorData = JSON.parse(error.data);
        logger.json('Error details', errorData);
      } catch (e) {
        logger.error(`Raw error data: ${error.data}`);
      }
    }
  }
}

// Run the test
testDataFabricApi().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
