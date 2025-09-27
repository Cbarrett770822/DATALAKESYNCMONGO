/**
 * Centralized CORS headers utility
 * Provides consistent CORS headers for all Netlify Functions
 */

// Default CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Handle OPTIONS preflight request
 * @returns {Object} Response object with CORS headers
 */
const handlePreflight = () => {
  return {
    statusCode: 204, // No content
    headers: corsHeaders,
    body: '' // Empty body for preflight
  };
};

/**
 * Add CORS headers to a response
 * @param {Object} response - Response object
 * @returns {Object} Response object with CORS headers
 */
const addCorsHeaders = (response) => {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...corsHeaders
    }
  };
};

/**
 * Create a success response with CORS headers
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Success response with CORS headers
 */
const successResponse = (data, statusCode = 200) => {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(data)
  };
};

/**
 * Create an error response with CORS headers
 * @param {string} message - Error message
 * @param {string} details - Error details
 * @param {number} statusCode - HTTP status code (default: 500)
 * @returns {Object} Error response with CORS headers
 */
const errorResponse = (message, details = null, statusCode = 500) => {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({
      error: message,
      details: details || 'No additional details'
    })
  };
};

module.exports = {
  corsHeaders,
  handlePreflight,
  addCorsHeaders,
  successResponse,
  errorResponse
};
