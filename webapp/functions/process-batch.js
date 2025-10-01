/**
 * Process Batch Function
 * Processes a single batch of TaskDetail records
 */

// Configure as a background function
exports.config = {
  background: true
};

const axios = require('axios');
const logger = require('./utils/logger');
const ionApi = require('./utils/ion-api');
const { waitForQueryCompletion } = require('./utils/wait-for-query');
const { connectToDatabase } = require('./utils/mongodb-manager');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const { handleError } = require('./utils/error-handler');
const { buildTaskDetailQuery } = require('./utils/query-builder');
const { transformData, createBulkOperations } = require('./utils/data-transformer');

// Import models
const TaskDetail = require('./models/task-detail');
const JobStatus = require('./models/job-status');

/**
 * Handler function for the process-batch endpoint
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
  const { 
    jobId, 
    whseid = 'wmwhse', 
    batchSize = 1000, 
    offset = 0, 
    batchNumber = 1,
    totalBatches = 0
  } = requestBody;
  
  if (!jobId) {
    return errorResponse('Missing required parameter: jobId', null, 400);
  }
  
  logger.info(`Processing batch ${batchNumber}/${totalBatches || '?'} for job ${jobId} (offset: ${offset})`);

  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get job status from MongoDB
    const jobStatus = await JobStatus.findOne({ jobId });
    
    if (!jobStatus) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
      logger.info(`Job ${jobId} is already ${jobStatus.status}, skipping batch processing`);
      return successResponse({
        message: `Job ${jobId} is already ${jobStatus.status}`,
        jobId,
        status: jobStatus.status
      });
    }
    
    // Update job status to show current batch
    await JobStatus.findOneAndUpdate(
      { jobId },
      { 
        $set: {
          currentBatch: batchNumber,
          message: `Processing batch ${batchNumber}/${totalBatches || jobStatus.totalBatches || '?'}`
        }
      }
    );
    
    // Build query for this batch
    const query = buildTaskDetailQuery(offset, batchSize, whseid);
    
    // Submit query to DataFabric
    logger.info(`Submitting query to DataFabric for batch ${batchNumber}`);
    const queryResponse = await ionApi.submitQuery(query);
    const queryId = queryResponse.queryId;
    
    // Wait for query to complete
    logger.info(`Waiting for query ${queryId} to complete`);
    await waitForQueryCompletion(ionApi, queryId);
    
    // Get results
    logger.info(`Query completed, fetching results for batch ${batchNumber}`);
    const queryResults = await ionApi.getResults(queryId, 0, batchSize);
    const records = queryResults.results || [];
    
    logger.info(`Retrieved ${records.length} records from DataFabric for batch ${batchNumber}`);
    
    if (records.length === 0) {
      logger.info(`No records found for batch ${batchNumber}, job may be complete`);
      
      // Check if this was the last expected batch
      if (offset >= jobStatus.totalRecords) {
        // Mark job as completed
        await JobStatus.findOneAndUpdate(
          { jobId },
          { 
            $set: {
              status: 'completed',
              message: `Processed all ${jobStatus.totalRecords} records`,
              endTime: new Date(),
              percentComplete: 100
            }
          }
        );
        
        logger.info(`Job ${jobId} marked as completed`);
      }
      
      return successResponse({
        message: `No records found for batch ${batchNumber}`,
        jobId,
        batchNumber,
        recordsProcessed: 0
      });
    }
    
    // Transform data
    const transformedRecords = transformData(records);
    
    // Add batch metadata to each record
    transformedRecords.forEach(record => {
      record._syncBatch = batchNumber;
      record._syncJobId = jobId;
    });
    
    // Create bulk operations
    const bulkOperations = createBulkOperations(transformedRecords);
    
    // Execute bulk write
    logger.info(`Executing bulkWrite operation with ${bulkOperations.length} operations`);
    const bulkResult = await TaskDetail.bulkWrite(bulkOperations);
    
    // Update job status
    const processedRecords = jobStatus.processedRecords + records.length;
    const insertedRecords = jobStatus.insertedRecords + (bulkResult.insertedCount || 0);
    const updatedRecords = jobStatus.updatedRecords + (bulkResult.modifiedCount || 0);
    const upsertedRecords = jobStatus.upsertedRecords + (bulkResult.upsertedCount || 0);
    const percentComplete = Math.min(Math.round((processedRecords / jobStatus.totalRecords) * 100), 100);
    
    await JobStatus.findOneAndUpdate(
      { jobId },
      { 
        $set: {
          processedRecords,
          insertedRecords,
          updatedRecords,
          upsertedRecords: upsertedRecords || 0,
          percentComplete,
          lastBatchTime: new Date()
        }
      }
    );
    
    logger.info(`Updated job status: processed=${processedRecords}, inserted=${insertedRecords}, updated=${updatedRecords}, percent=${percentComplete}%`);
    
    // Check if there are more batches to process
    const newOffset = offset + batchSize;
    if (newOffset < jobStatus.totalRecords) {
      // Trigger next batch
      const deployUrl = process.env.DEPLOY_URL || 'http://localhost:8888';
      const processBatchUrl = `${deployUrl}/.netlify/functions/process-batch`;
      
      logger.info(`Triggering next batch processing at offset ${newOffset}`);
      
      try {
        // Small delay before triggering next batch to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await axios.post(processBatchUrl, {
          jobId,
          whseid,
          batchSize,
          offset: newOffset,
          batchNumber: batchNumber + 1,
          totalBatches: jobStatus.totalBatches || totalBatches
        });
        
        logger.info(`Successfully triggered next batch (${batchNumber + 1}) for job ${jobId}`);
      } catch (error) {
        logger.error(`Error triggering next batch: ${error.message}`);
        // Even if the HTTP request fails, we'll return success for this batch
      }
    } else {
      // This was the last batch, mark job as completed
      await JobStatus.findOneAndUpdate(
        { jobId },
        { 
          $set: {
            status: 'completed',
            message: `Processed all ${jobStatus.totalRecords} records`,
            endTime: new Date(),
            percentComplete: 100
          }
        }
      );
      
      logger.info(`Job ${jobId} marked as completed`);
    }
    
    // Return success response
    return successResponse({
      message: `Successfully processed batch ${batchNumber}`,
      jobId,
      batchNumber,
      recordsProcessed: records.length,
      insertedRecords: bulkResult.insertedCount || 0,
      updatedRecords: bulkResult.modifiedCount || 0,
      upsertedRecords: bulkResult.upsertedCount || 0
    });
    
  } catch (error) {
    const handledError = handleError(error, 'process-batch');
    
    // Update job status to record the error
    try {
      await JobStatus.findOneAndUpdate(
        { jobId },
        { 
          $set: {
            message: `Error in batch ${batchNumber}: ${error.message}`,
            error: error.message
          },
          $inc: { errorRecords: 1 }
        }
      );
    } catch (dbError) {
      logger.error(`Error updating job status: ${dbError.message}`);
    }
    
    return errorResponse(handledError.message, handledError.context, 500);
  }
};
