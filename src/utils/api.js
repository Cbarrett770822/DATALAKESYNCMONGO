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
 * @param {string|Object} options - SQL query string or options object
 * @returns {Promise<Object>} - Query submission response
 */
export const submitQuery = async (options) => {
  try {
    // Handle both string and object parameters
    const requestData = typeof options === 'string' 
      ? { sqlQuery: options } 
      : options;
      
    console.log('Submitting query with options:', requestData);
    
    return await retryApiCall(async () => {
      const response = await api.post('/submit-query', requestData);
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

/**
 * Push records to MongoDB with chunking for large datasets
 * @param {Array} records - Records to push to MongoDB
 * @returns {Promise<Object>} - Response with combined stats
 */
export const pushToMongoDB = async (records) => {
  try {
    // If we have a small number of records, push them directly
    if (records.length <= 50) {
      console.log(`Pushing ${records.length} records to MongoDB in a single request`);
      return await retryApiCall(async () => {
        const response = await api.post('/push-to-mongodb', { records });
        return response.data;
      });
    }
    
    // For larger datasets, chunk the records to avoid timeouts
    const CHUNK_SIZE = 50; // Process 50 records per request
    const chunks = [];
    
    // Split records into chunks
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      chunks.push(records.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`Pushing ${records.length} records to MongoDB in ${chunks.length} chunks of ${CHUNK_SIZE}`);
    
    // Track overall stats
    const combinedStats = {
      total: records.length,
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: [],
      chunks: chunks.length,
      completedChunks: 0
    };
    
    // Process each chunk sequentially
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i+1}/${chunks.length} with ${chunk.length} records`);
      
      try {
        const response = await retryApiCall(async () => {
          const chunkResponse = await api.post('/push-to-mongodb', { records: chunk });
          return chunkResponse.data;
        });
        
        // Update combined stats
        combinedStats.inserted += response.stats.inserted || 0;
        combinedStats.updated += response.stats.updated || 0;
        combinedStats.errors += response.stats.errors || 0;
        combinedStats.completedChunks++;
        
        if (response.stats.errorDetails && response.stats.errorDetails.length > 0) {
          combinedStats.errorDetails = combinedStats.errorDetails.concat(response.stats.errorDetails);
        }
        
        console.log(`Completed chunk ${i+1}/${chunks.length}. Current stats: inserted=${combinedStats.inserted}, updated=${combinedStats.updated}, errors=${combinedStats.errors}`);
        
        // Dispatch progress event for UI updates
        if (typeof window !== 'undefined') {
          const progressEvent = new CustomEvent('mongodb-chunk-progress', {
            detail: {
              currentChunk: i,
              completedChunks: combinedStats.completedChunks,
              totalChunks: chunks.length,
              stats: { ...combinedStats }
            }
          });
          window.dispatchEvent(progressEvent);
        }
      } catch (error) {
        console.error(`Error processing chunk ${i+1}:`, error);
        combinedStats.errors += chunk.length; // Count all records in the failed chunk as errors
        combinedStats.errorDetails.push(`Failed to process chunk ${i+1}: ${error.message}`);
      }
    }
    
    return {
      message: 'Records processed successfully',
      stats: combinedStats
    };
  } catch (error) {
    console.error('Error in pushToMongoDB:', error);
    throw error;
  }
};

export default api;
