// API utility for communicating with Netlify Functions
import axios from 'axios';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Helper function to retry API calls
 * @param {Function} apiCall - The API call function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise<any>} - API response
 */
async function retryApiCall(apiCall, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attempt the API call
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's a client error (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      console.log(`API call failed, retrying (${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
    }
  }
  
  // This should never happen, but just in case
  throw lastError;
}

// Create axios instance with base URL
const api = axios.create({
  // Use relative path for Netlify functions which will resolve to the current domain
  baseURL: process.env.REACT_APP_API_URL || '/.netlify/functions',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get a token from the ION API
 * @returns {Promise<string>} - Token
 */
export const getIonToken = async () => {
  return retryApiCall(async () => {
    const response = await api.get('/get-token');
    return response.data.token;
  });
};

/**
 * Submit a query to the DataFabric API
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Query submission response
 */
export const submitQuery = async (options) => {
  try {
    return await retryApiCall(async () => {
      const response = await api.post('/submit-query', options);
      return response.data;
    });
  } catch (error) {
    console.error('Error in submitQuery:', error);
    throw error;
  }
};

/**
 * Check the status of a query
 * @param {string} queryId - Query ID
 * @returns {Promise<Object>} - Query status
 */
export const checkQueryStatus = async (queryId) => {
  try {
    return await retryApiCall(async () => {
      const response = await api.get(`/check-status?queryId=${queryId}`);
      return response.data;
    });
  } catch (error) {
    console.error('Error in checkQueryStatus:', error);
    throw error;
  }
};

/**
 * Get the results of a query
 * @param {string} queryId - Query ID
 * @param {number} offset - Result offset
 * @param {number} limit - Result limit
 * @returns {Promise<Object>} - Query results
 */
export const getQueryResults = async (queryId, offset = 0, limit = 1000) => {
  try {
    return await retryApiCall(async () => {
      // Use the fixed version of the get-results function
      const response = await api.get(`/get-results-fixed?queryId=${queryId}&offset=${offset}&limit=${limit}`);
      return response.data;
    });
  } catch (error) {
    console.error('Error in getQueryResults:', error);
    throw error;
  }
};

/**
 * Start a sync job
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} - Sync job response
 */
export const startSync = async (options) => {
  try {
    return await retryApiCall(async () => {
      const response = await api.post('/sync-taskdetail', options);
      return response.data;
    });
  } catch (error) {
    console.error('Error in startSync:', error);
    throw error;
  }
};

/**
 * Check the status of a sync job
 * @param {string} jobId - Sync job ID
 * @returns {Promise<Object>} - Sync job status
 */
export const checkSyncStatus = async (jobId) => {
  try {
    return await retryApiCall(async () => {
      const response = await api.get(`/check-sync-status?jobId=${jobId}`);
      return response.data;
    });
  } catch (error) {
    console.error('Error in checkSyncStatus:', error);
    throw error;
  }
};

/**
 * Get sync history
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} - Sync history
 */
export const getSyncHistory = async (options = {}) => {
  try {
    const { jobType, status, page = 1, limit = 10 } = options;
    
    let url = `/get-sync-history?page=${page}&limit=${limit}`;
    
    if (jobType) {
      url += `&jobType=${jobType}`;
    }
    
    if (status) {
      url += `&status=${status}`;
    }
    
    return await retryApiCall(async () => {
      const response = await api.get(url);
      return response.data;
    });
  } catch (error) {
    console.error('Error in getSyncHistory:', error);
    throw error;
  }
};

/**
 * Get taskdetail stats
 * @returns {Promise<Object>} - Taskdetail stats
 */
export const getTaskdetailStats = async () => {
  try {
    return await retryApiCall(async () => {
      const response = await api.get('/get-taskdetail-stats');
      return response.data;
    });
  } catch (error) {
    console.error('Error in getTaskdetailStats:', error);
    throw error;
  }
};

/**
 * Get settings
 * @returns {Promise<Object>} - Settings
 */
export const getSettings = async () => {
  try {
    return await retryApiCall(async () => {
      const response = await api.get('/get-settings');
      return response.data;
    });
  } catch (error) {
    console.error('Error in getSettings:', error);
    throw error;
  }
};

/**
 * Save settings
 * @param {Object} settings - Settings to save
 * @returns {Promise<Object>} - Response
 */
export const saveSettings = async (settings) => {
  try {
    return await retryApiCall(async () => {
      const response = await api.post('/save-settings', settings);
      return response.data;
    });
  } catch (error) {
    console.error('Error in saveSettings:', error);
    throw error;
  }
};

export default api;
