/**
 * Start Sync Function
 * Initiates the TaskDetail data sync process
 */

// Configure as a background function
exports.config = {
  background: true
};

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');
const ionApi = require('./utils/ion-api');
const { waitForQueryCompletion } = require('./utils/wait-for-query');
const { connectToDatabase } = require('./utils/mongodb-manager');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const { handleError } = require('./utils/error-handler');
const { buildTaskDetailCountQuery } = require('./utils/query-builder');

// Import models
const JobStatus = require('./models/job-status');

/**
 * Handler function for the start-sync endpoint
 */
exports.handler = async function(event, context) {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }

  // Parse request body
  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (error) {
    return errorResponse('Invalid request body', error.message, 400);
  }

  // Extract parameters from request
  const { whseid = 'wmwhse', batchSize = 1000 } = requestBody;
  
  // Generate a unique job ID
  const jobId = `job_${uuidv4().replace(/-/g, '')}`;
  
  logger.info(`Starting TaskDetail sync job ${jobId} for warehouse ${whseid}`);

  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get total record count from DataFabric
    logger.info('Fetching total record count from DataFabric');
    const countQuery = buildTaskDetailCountQuery(whseid);
    const countQueryResponse = await ionApi.submitQuery(countQuery);
    const countQueryId = countQueryResponse.queryId;
    
    // Wait for count query to complete
    logger.info(`Waiting for count query ${countQueryId} to complete`);
    await waitForQueryCompletion(ionApi, countQueryId);
    const countResults = await ionApi.getResults(countQueryId);
    
    if (!countResults || !countResults.results || countResults.results.length === 0) {
      throw new Error('Failed to get record count from DataFabric');
    }
    
    const totalRecords = parseInt(countResults.results[0].count, 10);
    const totalBatches = Math.ceil(totalRecords / batchSize);
    
    logger.info(`Total TaskDetail records: ${totalRecords} (${totalBatches} batches of ${batchSize})`);
    
    // Create job status record in MongoDB
    const jobStatus = new JobStatus({
      jobId,
      status: 'pending',
      operation: 'sync-taskdetail',
      totalRecords,
      processedRecords: 0,
      insertedRecords: 0,
      updatedRecords: 0,
      errorRecords: 0,
      percentComplete: 0,
      startTime: new Date(),
      message: 'Starting TaskDetail sync operation',
      currentBatch: 0,
      totalBatches,
      options: { whseid, batchSize }
    });
    
    await jobStatus.save();
    logger.info(`Created job status record in MongoDB: ${jobId}`);
    
    // Trigger the first batch processing
    const deployUrl = process.env.DEPLOY_URL || 'http://localhost:8888';
    const processBatchUrl = `${deployUrl}/.netlify/functions/process-batch`;
    
    logger.info(`Triggering first batch processing: ${processBatchUrl}`);
    
    // Update job status to in_progress
    await JobStatus.findOneAndUpdate(
      { jobId },
      { $set: { status: 'in_progress', message: 'Processing first batch' } }
    );
    
    // Call the process-batch function asynchronously
    try {
      await axios.post(processBatchUrl, {
        jobId,
        whseid,
        batchSize,
        offset: 0,
        batchNumber: 1,
        totalBatches
      });
      logger.info(`Successfully triggered first batch processing for job ${jobId}`);
    } catch (error) {
      logger.error(`Error triggering first batch: ${error.message}`);
      // Even if the HTTP request fails, the function may still be running
      // We'll continue and let the user check status later
    }
    
    // Return success response
    return successResponse({
      message: 'TaskDetail sync started as background process',
      jobId,
      totalRecords,
      totalBatches,
      batchSize,
      status: 'in_progress'
    });
    
  } catch (error) {
    const handledError = handleError(error, 'start-sync');
    
    // Update job status to failed if it was created
    try {
      await JobStatus.findOneAndUpdate(
        { jobId },
        { 
          $set: {
            status: 'failed',
            message: `Failed to start sync: ${error.message}`,
            error: error.message,
            endTime: new Date()
          }
        }
      );
    } catch (dbError) {
      logger.error(`Error updating job status: ${dbError.message}`);
    }
    
    return errorResponse(handledError.message, handledError.context, 500);
  }
};
