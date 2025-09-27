/**
 * Backend API handler for Infor DataFabric
 * This module handles all API calls with proper credential management
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load credentials from environment or file
let credentials = {};
try {
  // Try to load from environment variables first
  credentials = {
    tenant: process.env.INFOR_TENANT,
    saak: process.env.INFOR_SAAK,
    sask: process.env.INFOR_SASK,
    clientId: process.env.INFOR_CLIENT_ID,
    clientSecret: process.env.INFOR_CLIENT_SECRET,
    ionApiUrl: process.env.INFOR_ION_API_URL || 'https://mingle-ionapi.inforcloudsuite.com'
  };
  
  // If any credential is missing, try to load from file
  if (!credentials.tenant || !credentials.saak || !credentials.sask || !credentials.clientId || !credentials.clientSecret) {
    console.log('Some credentials missing from environment, trying to load from file...');
    
    // Try to load from credentials file
    const credentialsPath = path.resolve(__dirname, '../../ION_Credentials/IONAPI_CREDENTIALS.ionapi');
    if (fs.existsSync(credentialsPath)) {
      const credentialsFile = fs.readFileSync(credentialsPath, 'utf8');
      const parsedCredentials = JSON.parse(credentialsFile);
      
      credentials = {
        tenant: parsedCredentials.ti,
        saak: parsedCredentials.saak,
        sask: parsedCredentials.sask,
        clientId: parsedCredentials.ci,
        clientSecret: parsedCredentials.cs,
        ionApiUrl: parsedCredentials.iu || 'https://mingle-ionapi.inforcloudsuite.com'
      };
      
      console.log('Credentials loaded from file successfully');
    } else {
      console.warn('Credentials file not found at:', credentialsPath);
    }
  }
} catch (error) {
  console.error('Error loading credentials:', error);
}

// Cache the token to avoid unnecessary token requests
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get a bearer token for API authentication
 * @returns {Promise<string>} - Bearer token
 */
async function getToken() {
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    console.log('Using cached token');
    return cachedToken;
  }
  
  console.log('Getting new token...');
  
  // Validate credentials
  if (!credentials.tenant || !credentials.saak || !credentials.sask || !credentials.clientId || !credentials.clientSecret) {
    throw new Error('Missing credentials. Please set environment variables or provide a credentials file.');
  }
  
  try {
    // Create Basic Auth header
    const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
    
    // Encode username (SAAK)
    const encodedUsername = encodeURIComponent(credentials.saak);
    
    // Set token URL
    const tokenUrl = `https://mingle-sso.inforcloudsuite.com:443/${credentials.tenant}/as/token.oauth2`;
    
    // Make the token request
    const response = await axios({
      method: 'post',
      url: tokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json'
      },
      data: `grant_type=password&username=${encodedUsername}&password=${credentials.sask}&scope=openid`
    });
    
    // Cache the token
    cachedToken = response.data.access_token;
    // Set expiry time (subtract 5 minutes for safety)
    tokenExpiry = now + ((response.data.expires_in - 300) * 1000);
    
    console.log('Token retrieved successfully');
    return cachedToken;
  } catch (error) {
    console.error('Error getting token:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Submit a SQL query to DataFabric
 * @param {string} sqlQuery - SQL query to execute
 * @returns {Promise<Object>} - Job submission response
 */
async function submitQuery(sqlQuery) {
  const token = await getToken();
  
  try {
    const submitUrl = `${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/`;
    
    console.log('Submitting query:', sqlQuery);
    
    const response = await axios({
      method: 'post',
      url: submitUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
        'Accept': 'application/json'
      },
      data: sqlQuery
    });
    
    console.log('Query submitted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error submitting query:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
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
  const token = await getToken();
  
  try {
    const statusUrl = `${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/${queryId}/status/`;
    
    console.log('Checking status for queryId:', queryId);
    
    const response = await axios({
      method: 'get',
      url: statusUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Status response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking status:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
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
async function getResults(queryId, offset = 0, limit = 100) {
  const token = await getToken();
  
  try {
    const resultsUrl = `${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/${queryId}/result/?offset=${offset}&limit=${limit}`;
    
    console.log('Getting results for queryId:', queryId);
    
    const response = await axios({
      method: 'get',
      url: resultsUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Results retrieved successfully');
    return response.data;
  } catch (error) {
    console.error('Error getting results:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  getToken,
  submitQuery,
  checkStatus,
  getResults
};
