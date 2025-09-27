// API utility for communicating with Netlify Functions
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
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
  const response = await api.get('/get-token');
  return response.data.token;
};

/**
 * Submit a query to the DataFabric API
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Query submission response
 */
export const submitQuery = async (options) => {
  try {
    const response = await api.post('/submit-query', options);
    return response.data;
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
    const response = await api.get(`/check-status?queryId=${queryId}`);
    return response.data;
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
    const response = await api.get(`/get-results?queryId=${queryId}&offset=${offset}&limit=${limit}`);
    return response.data;
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
    const response = await api.post('/sync-taskdetail', options);
    return response.data;
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
  const response = await api.get(`/check-sync-status?jobId=${jobId}`);
  return response.data;
};

/**
 * Get sync history
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} - Sync history
 */
export const getSyncHistory = async (options = {}) => {
  const { jobType, status, page = 1, limit = 10 } = options;
  
  let url = `/get-sync-history?page=${page}&limit=${limit}`;
  
  if (jobType) {
    url += `&jobType=${jobType}`;
  }
  
  if (status) {
    url += `&status=${status}`;
  }
  
  const response = await api.get(url);
  return response.data;
};

/**
 * Get taskdetail stats
 * @returns {Promise<Object>} - Taskdetail stats
 */
export const getTaskdetailStats = async () => {
  const response = await api.get('/get-taskdetail-stats');
  return response.data;
};

/**
 * Get settings
 * @returns {Promise<Object>} - Settings
 */
export const getSettings = async () => {
  const response = await api.get('/get-settings');
  return response.data;
};

/**
 * Save settings
 * @param {Object} settings - Settings to save
 * @returns {Promise<Object>} - Response
 */
export const saveSettings = async (settings) => {
  const response = await api.post('/save-settings', settings);
  return response.data;
};

export default api;
