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
  // Generate a unique request ID for tracking
  const requestId = `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // Log request details (with sensitive info redacted)
  const logOptions = { ...options };
  if (logOptions.headers && logOptions.headers.Authorization) {
    logOptions.headers = { ...logOptions.headers };
    logOptions.headers.Authorization = logOptions.headers.Authorization.replace(/Bearer\s+[^\s]+/, 'Bearer [REDACTED]');
  }
  
  console.log(`[${requestId}] Request:`, {
    method: options.method,
    url: `https://${options.hostname}${options.path}`,
    headers: logOptions.headers,
    bodyLength: body ? body.length : 0,
    bodyPreview: body ? `${body.substring(0, 50)}${body.length > 50 ? '...' : ''}` : null
  });
  
  return new Promise((resolve, reject) => {
    // Track request timing
    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let data = '';
      let dataSize = 0;
      
      // Log response headers
      console.log(`[${requestId}] Response headers:`, {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers
      });
      
      res.on('data', (chunk) => {
        data += chunk;
        dataSize += chunk.length;
        
        // Log progress for large responses
        if (dataSize > 1024 * 1024) { // 1MB
          console.log(`[${requestId}] Receiving large response: ${Math.floor(dataSize / 1024)}KB so far`);
        }
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] Response completed in ${duration}ms, size: ${Math.floor(data.length / 1024)}KB`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Try to parse as JSON
            const jsonData = JSON.parse(data);
            console.log(`[${requestId}] Parsed JSON response successfully`);
            
            // Check for API-specific error indicators in successful responses
            if (jsonData.error || jsonData.errorMessage) {
              console.warn(`[${requestId}] API returned error in successful response:`, 
                jsonData.error || jsonData.errorMessage);
            }
            
            resolve(jsonData);
          } catch (e) {
            // If not JSON, log and return raw data
            console.log(`[${requestId}] Response is not JSON, returning raw data`);
            resolve(data);
          }
        } else {
          // Enhanced error object
          const errorObj = {
            statusCode: res.statusCode,
            message: `HTTP Error: ${res.statusCode}`,
            data: data,
            headers: res.headers,
            requestId: requestId,
            duration: duration
          };
          
          // Try to parse error response as JSON
          try {
            if (data && data.trim().startsWith('{')) {
              errorObj.parsedError = JSON.parse(data);
              console.error(`[${requestId}] Error response parsed:`, errorObj.parsedError);
            }
          } catch (parseError) {
            console.log(`[${requestId}] Could not parse error response as JSON`);
          }
          
          console.error(`[${requestId}] Request failed with status ${res.statusCode}:`, 
            data.substring(0, 200) + (data.length > 200 ? '...' : ''));
          
          reject(errorObj);
        }
      });
    });
    
    req.on('error', (e) => {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] Network error after ${duration}ms:`, e.message);
      
      reject({
        message: `Request error: ${e.message}`,
        error: e,
        requestId: requestId,
        duration: duration,
        networkError: true
      });
    });
    
    // Set timeout
    req.setTimeout(30000, () => {
      req.destroy();
      console.error(`[${requestId}] Request timeout after 30s`);
      
      reject({
        message: 'Request timeout after 30 seconds',
        requestId: requestId,
        timeout: true
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
    console.log('Request URL:', submitUrl.toString());
    console.log('Request headers:', JSON.stringify(options.headers, null, 2).replace(options.headers.Authorization, 'Bearer [REDACTED]'));
    
    // Log the first 100 characters of the query for debugging
    console.log('Query preview:', sqlQuery.substring(0, 100) + (sqlQuery.length > 100 ? '...' : ''));
    
    // Make the request
    const response = await makeRequest(options, sqlQuery);
    
    // Log the response
    console.log('Query submitted successfully:', JSON.stringify(response, null, 2));
    
    // Verify the response contains expected fields
    if (!response.queryId && response.id) {
      console.log('Response contains id instead of queryId, normalizing...');
      response.queryId = response.id;
    }
    
    if (!response.status) {
      console.warn('Response does not contain status field');
      response.status = 'SUBMITTED';
    }
    
    return response;
  } catch (error) {
    console.error('Error submitting query:', error);
    
    // Enhanced error logging
    if (error.statusCode) {
      console.error(`HTTP Status Code: ${error.statusCode}`);
    }
    
    if (error.data) {
      console.error('Error response data:', error.data);
      
      // Try to parse the error data if it's a string
      if (typeof error.data === 'string') {
        try {
          const parsedData = JSON.parse(error.data);
          console.error('Parsed error data:', parsedData);
          
          // Add parsed data to the error object
          error.parsedData = parsedData;
          
          // Check for specific error types
          if (parsedData.error) {
            console.error('API error type:', parsedData.error);
            error.apiErrorType = parsedData.error;
          }
          
          if (parsedData.error_trace_id) {
            console.error('Error trace ID:', parsedData.error_trace_id);
            error.traceId = parsedData.error_trace_id;
          }
        } catch (parseError) {
          console.log('Could not parse error data as JSON');
        }
      }
    }
    
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
      console.error('Full response:', JSON.stringify(response, null, 2));
      
      // Extract error details if available
      if (response.error) {
        console.error('Error details:', response.error);
      }
      
      // Check for common error patterns
      if (response.message) {
        console.error('Error message:', response.message);
        
        // Look for specific error patterns
        if (response.message.includes('syntax error')) {
          console.error('SQL SYNTAX ERROR DETECTED: Check your SQL query syntax');
          response.errorType = 'SYNTAX_ERROR';
        } else if (response.message.includes('permission') || response.message.includes('access denied')) {
          console.error('PERMISSION ERROR DETECTED: The credentials may not have access to this data');
          response.errorType = 'PERMISSION_ERROR';
        } else if (response.message.includes('not found') || response.message.includes('does not exist')) {
          console.error('RESOURCE NOT FOUND ERROR: The table or resource may not exist');
          response.errorType = 'NOT_FOUND_ERROR';
        } else if (response.message.includes('timeout')) {
          console.error('TIMEOUT ERROR: The query took too long to execute');
          response.errorType = 'TIMEOUT_ERROR';
        }
        
        // Try to extract structured error information if it's in JSON format
        try {
          if (typeof response.message === 'string') {
            // Try to find JSON in the message
            const errorMatch = response.message.match(/\{.*\}/s);
            if (errorMatch) {
              const errorJson = JSON.parse(errorMatch[0]);
              response.errorDetails = errorJson;
              console.error('Parsed error details:', errorJson);
              
              // Check for specific error codes in the JSON
              if (errorJson.errorCode) {
                console.error(`Error code: ${errorJson.errorCode}`);
                response.errorCode = errorJson.errorCode;
              }
            }
            
            // Look for SQL error position indicators
            const sqlErrorMatch = response.message.match(/at or near "([^"]+)"/i);
            if (sqlErrorMatch) {
              console.error(`SQL error near: ${sqlErrorMatch[1]}`);
              response.sqlErrorNear = sqlErrorMatch[1];
            }
          }
        } catch (parseError) {
          console.log('Could not parse error details from message:', parseError.message);
        }
      }
      
      // Check for status code information
      if (response.statusCode) {
        console.error(`Status code: ${response.statusCode}`);
        
        if (response.statusCode === 400) {
          console.error('BAD REQUEST: The query format is invalid');
        } else if (response.statusCode === 401 || response.statusCode === 403) {
          console.error('AUTHENTICATION/AUTHORIZATION ERROR: Check credentials');
        } else if (response.statusCode === 404) {
          console.error('NOT FOUND: The requested resource does not exist');
        } else if (response.statusCode === 500) {
          console.error('SERVER ERROR: An internal server error occurred');
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
    
    // Convert status to uppercase for case-insensitive comparison
    const status = (statusResponse.status || '').toUpperCase();
    console.log(`Current job status: "${status}" (original: "${statusResponse.status}")`);
    
    // Check if status indicates completion
    const isCompleted = ['COMPLETED', 'FINISHED', 'DONE'].includes(status);
    
    if (!isCompleted) {
      console.error(`Cannot get results: Job status is ${status}`);
      if (status === 'FAILED') {
        throw {
          statusCode: 400,
          message: `Query failed: ${statusResponse.message || 'Unknown error'}`,
          data: statusResponse
        };
      } else if (status === 'RUNNING') {
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
    console.log(`Fetching results for completed job with status: ${status}`);
    console.log('Request options:', {
      url: `https://${options.hostname}${options.path}`,
      method: options.method,
      headers: { ...options.headers, Authorization: 'Bearer [REDACTED]' }
    });
    
    try {
      const response = await makeRequest(options);
      
      // Log the raw response for debugging
      console.log('Raw response from getResults:', typeof response, response ? 'not null' : 'null');
      
      // Check if results are empty or null
      if (!response) {
        console.warn('Results response is null or undefined');
        return { rows: [], columns: [], message: 'No results returned from API' };
      } else if (Array.isArray(response.rows) && response.rows.length === 0) {
        console.log('Query returned empty rows array');
      } else if (response.rows) {
        console.log(`Results retrieved successfully: ${response.rows.length} rows`);
      } else if (response.results) {
        console.log(`Results retrieved successfully: ${response.results.length} results`);
      } else {
        console.warn('Response has unexpected format:', response);
      }
      
      return response;
    } catch (error) {
      console.error('Error in makeRequest during getResults:', error);
      
      // Return a structured error response instead of throwing
      return {
        error: true,
        message: error.message || 'Error retrieving results',
        details: error,
        rows: [],
        columns: []
      };
    }
  } catch (error) {
    console.error('Error getting results:', error);
    throw error;
  }
}

module.exports = {
  getToken,
  submitQuery,
  checkStatus,
  getResults,
  loadCredentials // Expose for debugging
};
