/**
 * Get Sync Status Function
 * Returns the current status of a sync job
 */

const logger = require('./utils/logger');
const { connectToDatabase } = require('./utils/mongodb-manager');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const { handleError } = require('./utils/error-handler');

// Import models
const JobStatus = require('./models/job-status');

/**
 * Handler function for the get-sync-status endpoint
 */
exports.handler = async function(event, context) {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }

  // Get job ID from query parameters
  const jobId = event.queryStringParameters?.jobId;
  
  if (!jobId) {
    return errorResponse('Missing required parameter: jobId', null, 400);
  }
  
  logger.info(`Retrieving status for job: ${jobId}`);

  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Find job status in MongoDB
    const jobStatus = await JobStatus.findOne({ jobId });
    
    // Log job status details
    if (jobStatus) {
      logger.info(`Job status found for ${jobId}: status=${jobStatus.status}, processed=${jobStatus.processedRecords}, total=${jobStatus.totalRecords}, percent=${jobStatus.percentComplete}%`);
    } else {
      logger.info(`No job status found for job ID: ${jobId}`);
    }
    
    // If job not found, return a default response
    if (!jobStatus) {
      return successResponse({
        job: {
          id: jobId,
          status: 'not_found',
          message: 'Job not found or expired',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Return the job status from MongoDB with proper structure
    return successResponse({
      job: {
        id: jobStatus.jobId,
        status: jobStatus.status || 'unknown',
        processedRecords: jobStatus.processedRecords || 0,
        totalRecords: jobStatus.totalRecords || 0,
        insertedRecords: jobStatus.insertedRecords || 0,
        updatedRecords: jobStatus.updatedRecords || 0,
        errorRecords: jobStatus.errorRecords || 0,
        percentComplete: jobStatus.percentComplete || 0,
        message: jobStatus.message || 'Processing...',
        startTime: jobStatus.startTime,
        endTime: jobStatus.endTime,
        currentBatch: jobStatus.currentBatch || 0,
        totalBatches: jobStatus.totalBatches || 0,
        lastBatchTime: jobStatus.lastBatchTime,
        error: jobStatus.error
      }
    });
    
  } catch (error) {
    const handledError = handleError(error, 'get-sync-status');
    
    // Even on error, try to return a usable response
    return successResponse({
      job: {
        id: jobId,
        status: 'error',
        message: `Error retrieving status: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};
