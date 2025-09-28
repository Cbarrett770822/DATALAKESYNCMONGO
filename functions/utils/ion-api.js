// ION API Authentication Module
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

// Load hardcoded credentials if available (for testing only)
let hardcodedCredentials;
try {
  hardcodedCredentials = require('./hardcoded-credentials');
  console.log('Hardcoded credentials module found');
} catch (e) {
  console.log('No hardcoded credentials module found');
  hardcodedCredentials = null;
}

// Load ION API credentials from environment variables or file
function loadCredentials() {
  try {
    // Log environment for debugging
    console.log('Current directory:', __dirname);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('NETLIFY_ENV:', process.env.NETLIFY_ENV || 'Not set');
    console.log('CONTEXT:', process.env.CONTEXT || 'Not set');
    
    // Check if credentials are available as environment variables
    if (process.env.ION_TENANT && 
        process.env.ION_SAAK && 
        process.env.ION_SASK && 
        process.env.ION_CLIENT_ID && 
        process.env.ION_CLIENT_SECRET) {
      
      console.log('Using ION API credentials from environment variables');
      
      // Default API URLs if not provided
      const ionApiUrl = process.env.ION_API_URL || 'https://mingle-ionapi.inforcloudsuite.com';
      const ssoUrl = process.env.ION_SSO_URL || `https://mingle-sso.inforcloudsuite.com:443/${process.env.ION_TENANT}/as/`;
      
      return {
        tenant: process.env.ION_TENANT,
        saak: process.env.ION_SAAK,
        sask: process.env.ION_SASK,
        clientId: process.env.ION_CLIENT_ID,
        clientSecret: process.env.ION_CLIENT_SECRET,
        ionApiUrl: ionApiUrl,
        ssoUrl: ssoUrl
      };
    }
    
    // Try different paths for credentials file
    console.log('Trying to load ION API credentials from file');
    
    // Possible paths for credentials file
    const possiblePaths = [
      // Path from environment variable
      process.env.ION_CREDENTIALS_PATH,
      
      // Common paths in different environments
      path.resolve(__dirname, '../../ION_Credentials/IONAPI_CREDENTIALS.ionapi'),
      path.resolve(__dirname, '../../../ION_Credentials/IONAPI_CREDENTIALS.ionapi'),
      path.resolve(__dirname, '../../../../ION_Credentials/IONAPI_CREDENTIALS.ionapi'),
      
      // Netlify-specific paths
      path.resolve('/opt/build/repo/ION_Credentials/IONAPI_CREDENTIALS.ionapi'),
      path.resolve('/var/task/ION_Credentials/IONAPI_CREDENTIALS.ionapi')
    ].filter(Boolean); // Filter out undefined paths
    
    // Try each path until we find a valid credentials file
    let credentialsData = null;
    let credentialsPath = null;
    
    for (const testPath of possiblePaths) {
      try {
        console.log('Trying credentials path:', testPath);
        if (fs.existsSync(testPath)) {
          credentialsData = fs.readFileSync(testPath, 'utf8');
          credentialsPath = testPath;
          console.log('Found credentials file at:', credentialsPath);
          break;
        }
      } catch (pathError) {
        console.log('Error checking path:', testPath, pathError.message);
      }
    }
    
    if (!credentialsData) {
      throw new Error('Could not find credentials file in any of the expected locations');
    }
    
    // Parse credentials
    const credentials = JSON.parse(credentialsData);
    
    console.log('Successfully loaded credentials from file:', credentialsPath);
    
    return {
      tenant: credentials.ti,
      saak: credentials.saak,
      sask: credentials.sask,
      clientId: credentials.ci,
      clientSecret: credentials.cs,
      ionApiUrl: credentials.iu || 'https://mingle-ionapi.inforcloudsuite.com',
      ssoUrl: credentials.pu || `https://mingle-sso.inforcloudsuite.com:443/${credentials.ti}/as/`
    };
  } catch (error) {
    console.error('Error loading ION API credentials:', error);
    
    // Last resort: try to use hardcoded credentials if available
    if (hardcodedCredentials && typeof hardcodedCredentials.getHardcodedCredentials === 'function') {
      try {
        console.log('FALLBACK: Using hardcoded credentials (FOR TESTING ONLY)');
        return hardcodedCredentials.getHardcodedCredentials();
      } catch (credError) {
        console.error('Error using hardcoded credentials:', credError.message);
        throw new Error(`Failed to use hardcoded credentials: ${credError.message}`);
      }
    }
    
    throw new Error(`Failed to load ION API credentials: ${error.message}`);
  }
}

// Cache the token to avoid unnecessary token requests
let cachedToken = null;
let tokenExpiry = null;

/**
 * Make an HTTPS request
 * @param {Object} options - Request options
 * @param {string} body - Request body (if applicable)
 * @returns {Promise<Object>} - Response data
 */
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (e) {
            // If not JSON, return raw data
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

/**
 * Get a bearer token for API authentication
 * @returns {Promise<string>} - Bearer token
 */
async function getToken() {
  // Get credentials
  const credentials = loadCredentials();
  
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    console.log('Using cached token');
    return cachedToken;
  }
  
  console.log('Getting new token...');
  
  // Create Basic Auth header
  const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  
  // Prepare the request body
  const body = querystring.stringify({
    grant_type: 'password',
    username: credentials.saak,
    password: credentials.sask,
    scope: 'openid'
  });
  
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
    
    // Cache the token
    cachedToken = response.access_token;
    // Set expiry time (subtract 5 minutes for safety)
    tokenExpiry = now + ((response.expires_in - 300) * 1000);
    
    console.log('Token retrieved successfully');
    return cachedToken;
  } catch (error) {
    console.error('Error getting token:', error);
    throw error;
  }
}

/**
 * Submit a SQL query to DataFabric
 * @param {string} sqlQuery - SQL query to execute
 * @returns {Promise<Object>} - Job submission response
 */
async function submitQuery(sqlQuery) {
  // Get credentials
  const credentials = loadCredentials();
  
  // Get token
  const token = await getToken();
  
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
      'Content-Length': Buffer.byteLength(sqlQuery)
    }
  };
  
  try {
    console.log('Submitting query:', sqlQuery);
    const response = await makeRequest(options, sqlQuery);
    console.log('Query submitted successfully:', response);
    return response;
  } catch (error) {
    console.error('Error submitting query:', error);
    throw error;
  }
}

/**
 * Check the status of a job
 * @param {string} queryId - Query ID to check
 * @returns {Promise<Object>} - Job status
 */
async function checkStatus(queryId) {
  // Get credentials
  const credentials = loadCredentials();
  
  // Get token
  const token = await getToken();
  
  // Prepare the request URL
  const statusUrl = new URL(`${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/${queryId}/status/`);
  
  const options = {
    hostname: statusUrl.hostname,
    port: statusUrl.port || 443,
    path: statusUrl.pathname,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  };
  
  try {
    console.log('Checking status for queryId:', queryId);
    const response = await makeRequest(options);
    console.log('Status response:', response);
    
    // Enhanced error handling for FAILED status
    if (response.status === 'FAILED') {
      console.error(`Query ${queryId} failed with status: ${response.status}`);
      
      // Extract error details if available
      if (response.error) {
        console.error('Error details:', response.error);
      }
      
      // Parse message for additional error information
      if (response.message) {
        console.error('Error message:', response.message);
        
        // Try to extract structured error information if it's in JSON format
        try {
          if (typeof response.message === 'string' && response.message.includes('{')) {
            const errorMatch = response.message.match(/\{.*\}/s);
            if (errorMatch) {
              const errorJson = JSON.parse(errorMatch[0]);
              response.errorDetails = errorJson;
              console.error('Parsed error details:', errorJson);
            }
          }
        } catch (parseError) {
          console.log('Could not parse error details from message:', parseError.message);
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error('Error checking status:', error);
    throw error;
  }
}

/**
 * Get the results of a completed job
 * @param {string} queryId - Query ID to get results for
 * @param {number} offset - Result offset
 * @param {number} limit - Result limit
 * @returns {Promise<Object>} - Query results
 */
async function getResults(queryId, offset = 0, limit = 1000) {
  // Get credentials
  const credentials = loadCredentials();
  
  // Get token
  const token = await getToken();
  
  // Prepare the request URL
  const resultsUrl = new URL(`${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/${queryId}/result/`);
  resultsUrl.searchParams.append('offset', offset);
  resultsUrl.searchParams.append('limit', limit);
  
  const options = {
    hostname: resultsUrl.hostname,
    port: resultsUrl.port || 443,
    path: resultsUrl.pathname + resultsUrl.search,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  };
  
  try {
    console.log('Getting results for queryId:', queryId);
    
    // First check if the job is completed
    const statusResponse = await checkStatus(queryId);
    if (statusResponse.status !== 'COMPLETED') {
      console.error(`Cannot get results: Job status is ${statusResponse.status}`);
      if (statusResponse.status === 'FAILED') {
        throw {
          statusCode: 400,
          message: `Query failed: ${statusResponse.message || 'Unknown error'}`,
          data: statusResponse
        };
      } else if (statusResponse.status === 'RUNNING') {
        throw {
          statusCode: 202, // Accepted but not ready
          message: 'Query is still running',
          data: statusResponse
        };
      } else {
        throw {
          statusCode: 400,
          message: `Cannot get results: Job status is ${statusResponse.status}`,
          data: statusResponse
        };
      }
    }
    
    // If job is completed, get the results
    const response = await makeRequest(options);
    
    // Check if results are empty
    if (response && Array.isArray(response.rows) && response.rows.length === 0) {
      console.log('Query returned no results');
    } else {
      console.log(`Results retrieved successfully: ${response.rows ? response.rows.length : 0} rows`);
    }
    
    return response;
  } catch (error) {
    console.error('Error getting results:', error);
    throw error;
  }
}

module.exports = {
  getToken,
  submitQuery,
  checkStatus,
  getResults
};
