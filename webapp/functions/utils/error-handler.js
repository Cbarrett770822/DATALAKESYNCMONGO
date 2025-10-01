/**
 * Error Handler Utility
 * Standardized error handling and logging
 */
const logger = require('./logger');

/**
 * Error categories for better error handling
 */
const ErrorCategory = {
  DATABASE: 'DATABASE',
  NETWORK: 'NETWORK',
  API: 'API',
  VALIDATION: 'VALIDATION',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Categorize an error based on its message or type
 * @param {Error} error - The error to categorize
 * @returns {string} Error category
 */
function categorizeError(error) {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('mongo') || 
      errorMessage.includes('database') || 
      errorMessage.includes('connection')) {
    return ErrorCategory.DATABASE;
  }
  
  if (errorMessage.includes('network') || 
      errorMessage.includes('timeout') || 
      errorMessage.includes('econnrefused')) {
    return ErrorCategory.NETWORK;
  }
  
  if (errorMessage.includes('api') || 
      errorMessage.includes('unauthorized') || 
      errorMessage.includes('forbidden')) {
    return ErrorCategory.API;
  }
  
  if (errorMessage.includes('validation') || 
      errorMessage.includes('invalid') || 
      errorMessage.includes('required')) {
    return ErrorCategory.VALIDATION;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Handle an error with standardized logging and categorization
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @returns {Object} Standardized error object
 */
function handleError(error, context = 'unknown') {
  const category = categorizeError(error);
  const timestamp = new Date().toISOString();
  
  // Log the error with context
  logger.error(`[${category}] Error in ${context}: ${error.message}`);
  
  // Log stack trace for debugging
  if (error.stack) {
    logger.debug(`Stack trace: ${error.stack}`);
  }
  
  // Return standardized error object
  return {
    category,
    message: error.message,
    context,
    timestamp,
    originalError: error
  };
}

/**
 * Create a standardized error response for API endpoints
 * @param {Error|string} error - Error object or message
 * @param {string} context - Context where the error occurred
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error response object
 */
function createErrorResponse(error, context = 'unknown', statusCode = 500) {
  const errorObj = typeof error === 'string' 
    ? new Error(error) 
    : error;
  
  const handledError = handleError(errorObj, context);
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify({
      error: handledError.message,
      category: handledError.category,
      context: handledError.context,
      timestamp: handledError.timestamp
    })
  };
}

module.exports = {
  ErrorCategory,
  handleError,
  createErrorResponse,
  categorizeError
};
