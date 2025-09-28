// Database Helper Utility
// Provides enhanced MongoDB operations with retry logic and error handling

const mongodb = require('./mongodb');
const mongoose = require('mongoose');

/**
 * Execute a database operation with retry logic for transient errors
 * @param {Function} operation - Database operation to execute
 * @param {Object} options - Options for retry logic
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 500)
 * @param {number} options.backoffFactor - Backoff factor for exponential delay (default: 2)
 * @returns {Promise<any>} - Result of the operation
 */
async function executeWithRetry(operation, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.initialDelay || 500;
  const backoffFactor = options.backoffFactor || 2;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Connect to MongoDB if not already connected
      if (mongoose.connection.readyState !== 1) {
        await mongodb.connectToDatabase();
      }
      
      // Execute the operation
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if error is a transient error that can be retried
      const isTransientError = isRetryableError(error);
      
      if (attempt < maxRetries && isTransientError) {
        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(backoffFactor, attempt);
        console.log(`Retryable error detected, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // If we've exhausted retries or it's not a retryable error, throw the error
        break;
      }
    }
  }
  
  // If we get here, all retries failed
  console.error('All retry attempts failed:', lastError);
  throw lastError;
}

/**
 * Check if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} - Whether the error is retryable
 */
function isRetryableError(error) {
  // Check for MongoDB transient error labels
  if (error.hasErrorLabel && (
    error.hasErrorLabel('TransientTransactionError') ||
    error.hasErrorLabel('UnknownTransactionCommitResult')
  )) {
    return true;
  }
  
  // Check for specific error codes
  if (error.code && [
    112, // WriteConflict
    11000, // Duplicate key error
    11600, // Interrupted
    11601, // Interrupted at shutdown
    11602, // Interrupted due to replica state change
    13436, // Not master error
    13435, // Node is recovering
    10107, // NotMaster
    10058, // Socket exception
    6, // HostUnreachable
    7, // HostNotFound
    89, // NetworkTimeout
    91, // ShutdownInProgress
    189, // PrimarySteppedDown
    262, // ExceededTimeLimit
  ].includes(error.code)) {
    return true;
  }
  
  // Check for error message patterns
  if (error.message && (
    error.message.includes('WriteConflict') ||
    error.message.includes('connection') ||
    error.message.includes('timeout') ||
    error.message.includes('exceeded time limit') ||
    error.message.includes('not master') ||
    error.message.includes('socket')
  )) {
    return true;
  }
  
  return false;
}

/**
 * Execute a MongoDB transaction with retry logic
 * @param {Function} transactionFn - Function to execute in transaction
 * @param {Object} options - Options for retry logic
 * @returns {Promise<any>} - Result of the transaction
 */
async function executeTransaction(transactionFn, options = {}) {
  return executeWithRetry(async () => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Execute the transaction function
      const result = await transactionFn(session);
      
      // Commit the transaction
      if (session.inTransaction()) {
        await session.commitTransaction();
      }
      
      return result;
    } catch (error) {
      // Abort the transaction if it's still active
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          console.error('Error aborting transaction:', abortError);
          // Don't throw here, we want to throw the original error
        }
      }
      
      throw error;
    } finally {
      // End the session
      await session.endSession();
    }
  }, options);
}

/**
 * Execute a MongoDB bulk write operation with retry logic
 * @param {Object} model - Mongoose model
 * @param {Array} operations - Bulk write operations
 * @param {Object} options - Options for retry logic and bulk write
 * @returns {Promise<Object>} - Result of the bulk write
 */
async function executeBulkWrite(model, operations, options = {}) {
  return executeWithRetry(async () => {
    // Use lean queries for initial data retrieval to avoid read conflicts
    if (options.findBeforeBulkWrite) {
      const findQuery = options.findBeforeBulkWrite;
      await model.find(findQuery).lean().exec();
    }
    
    // Execute bulk write
    return await model.bulkWrite(operations, {
      ordered: options.ordered !== false, // Default to ordered
      ...options.bulkWriteOptions
    });
  }, options);
}

module.exports = {
  executeWithRetry,
  executeTransaction,
  executeBulkWrite,
  isRetryableError
};
