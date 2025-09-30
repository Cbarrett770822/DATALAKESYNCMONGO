// Background function to copy TaskDetail data from DataLake to MongoDB Atlas
// This runs as a background function with a 15-minute timeout
const config = {
  background: true
};

// Export the config for Netlify
exports.config = config;

// Simple logger for consistent logging
const logger = {
  info: (message) => console.log(message),
  error: (message) => console.error(message),
  warn: (message) => console.warn(message),
  debug: (message) => console.log(message)
};

const mongoose = require('mongoose');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const ionApi = require('./utils/ion-api');
const JobStatus = require('./models/JobStatus');
const TaskDetail = require('./models/taskdetail'); // Correct import with lowercase 't'

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';

// TaskDetail model is imported from './models/taskdetail'

// Connect to MongoDB
async function connectToMongoDB() {
  console.log('Attempting to connect to MongoDB...');
  console.log('Connection string (masked):', MONGODB_URI.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://[USERNAME]:[PASSWORD]@'));
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    
    console.log('Connected to MongoDB Atlas successfully');
    console.log('Connection state:', mongoose.connection.readyState);
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.stack) console.error('Stack trace:', error.stack);
    return false;
  }
}

// Disconnect from MongoDB
async function disconnectFromMongoDB() {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}

// Build SQL query for TaskDetail
function buildTaskDetailQuery(offset = 0, limit = 1000, whseid = 'wmwhse1') {
  // Calculate start and end row numbers based on offset and limit
  const startRow = offset + 1;
  const endRow = offset + limit;
  
  return `
    SELECT *
    FROM (
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY TASKDETAILKEY) AS row_num
      FROM 
        "CSWMS_wmwhse_TASKDETAIL"
    ) AS numbered_rows
    WHERE row_num BETWEEN ${startRow} AND ${endRow}
  `;
}

// Build count query
function buildCountQuery(whseid = 'wmwhse1') {
  return `
    SELECT COUNT(*) as count
    FROM "CSWMS_wmwhse_TASKDETAIL"
  `;
}

// Transform data for MongoDB
function transformData(records) {
  return records.map(record => {
    // Convert date strings to Date objects
    const dateFields = [
      'ADDDATE', 'EDITDATE', 'STARTTIME', 'ENDTIME', 'RELEASEDATE',
      'ORIGINALSTARTTIME', 'ORIGINALENDTIME', 'REQUESTEDSHIPDATE',
      'EXT_UDF_DATE1', 'EXT_UDF_DATE2', 'EXT_UDF_DATE3', 'EXT_UDF_DATE4', 'EXT_UDF_DATE5'
    ];
    
    // Process all date fields
    dateFields.forEach(field => {
      if (record[field] && typeof record[field] === 'string') {
        try {
          record[field] = new Date(record[field]);
        } catch (e) {
          console.warn(`Failed to convert ${field} to date: ${record[field]}`);
        }
      }
    });
    
    // Add sync metadata
    record._syncDate = new Date();
    record._syncStatus = 'synced';
    
    return record;
  });
}

// Create bulk write operations
function createBulkOperations(records) {
  return records.map(record => ({
    updateOne: {
      filter: { TASKDETAILKEY: record.TASKDETAILKEY, WHSEID: record.WHSEID },
      update: { $set: record },
      upsert: true // Create if doesn't exist
    }
  }));
}

exports.handler = async function(event, context) {
  logger.info('copy-taskdetail function called');
  
  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  // Only allow POST method
  if (event.httpMethod !== 'POST') {
    logger.error(`Invalid method: ${event.httpMethod}`);
    return errorResponse(`Method ${event.httpMethod} not allowed`, null, 405);
  }
  
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    // Using fixed warehouse ID 'wmwhse' as per the correct table name
    const whseid = 'wmwhse';
    const batchSize = requestBody.batchSize || 1000;
    
    console.log(`Starting TaskDetail copy for warehouse ${whseid} (using fixed table name CSWMS_wmwhse_TASKDETAIL)`);
    
    // Connect to MongoDB
    console.log('Calling connectToMongoDB function...');
    const connected = await connectToMongoDB();
    console.log('MongoDB connection result:', connected);
    
    if (!connected) {
      console.error('MongoDB connection failed, returning error response');
      return errorResponse('Failed to connect to MongoDB', null, 500);
    }
    
    console.log('MongoDB connection successful, proceeding...');
    
    // Step 1: Get total count
    const countQuery = buildCountQuery(whseid);
    console.log('Count query SQL:', countQuery);
    
    try {
      console.log('Submitting count query to ION API...');
      const countResponse = await ionApi.submitQuery(countQuery);
      console.log('Count query response:', JSON.stringify(countResponse, null, 2));
      
      if (!countResponse || !countResponse.queryId && !countResponse.id) {
        console.error('Invalid count query response:', countResponse);
        await disconnectFromMongoDB();
        return errorResponse('Invalid response from ION API', countResponse, 500);
      }
      
      const countQueryId = countResponse.queryId || countResponse.id;
      console.log('Count query ID:', countQueryId);
      
      // Wait for count query to complete
      console.log('Checking count query status...');
      let countStatus = await ionApi.checkStatus(countQueryId);
      console.log('Initial count status:', JSON.stringify(countStatus, null, 2));
      while (countStatus.status !== 'completed' && countStatus.status !== 'COMPLETED' && countStatus.status !== 'FINISHED') {
        console.log(`Query status: ${countStatus.status}, waiting 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        countStatus = await ionApi.checkStatus(countQueryId);
        
        if (countStatus.status === 'failed' || countStatus.status === 'FAILED') {
          console.error('Count query failed:', JSON.stringify(countStatus, null, 2));
          await disconnectFromMongoDB();
          return errorResponse('Count query failed', countStatus, 500);
        }
      }
      
      console.log('Count query completed successfully with status:', countStatus.status);
      
      // Get count results (within the same try block to maintain countQueryId scope)
      console.log('Getting count results...');
      const countResults = await ionApi.getResults(countQueryId);
      console.log('Count results:', JSON.stringify(countResults, null, 2));
      
      // Define batch size for processing
      const batchSize = 1000;
      
      // Extract count from results based on different possible formats
      let totalRecords = 0;
      
      if (countResults && countResults.results && countResults.results[0] && countResults.results[0].count !== undefined) {
        // Format: { results: [{ count: 123 }] }
        totalRecords = parseInt(countResults.results[0].count, 10);
      } else if (countResults && countResults.rows && countResults.rows[0] && countResults.rows[0][0] !== undefined) {
        // Format: { rows: [[123]] }
        totalRecords = parseInt(countResults.rows[0][0], 10);
      } else if (countResults && countResults.data && countResults.data.count !== undefined) {
        // Format: { data: { count: 123 } }
        totalRecords = parseInt(countResults.data.count, 10);
      } else {
        console.error('Invalid count results format:', countResults);
        await disconnectFromMongoDB();
        return errorResponse('Invalid count results format from ION API', countResults, 500);
      }
      
      console.log(`Total TaskDetail records: ${totalRecords}`);
      
      // Use client-provided job ID if available, otherwise create one
      jobId = requestBody.clientJobId || `job_${Date.now()}`;
      logger.info(`Using job ID: ${jobId} (${requestBody.clientJobId ? 'client-provided' : 'server-generated'})`);
      
      // Check if a job with this ID already exists
      const existingJob = await JobStatus.findOne({ jobId });
      if (existingJob) {
        logger.info(`Job with ID ${jobId} already exists, returning existing job status`);
        return successResponse({
          message: 'Job already in progress',
          jobId,
          status: existingJob.status,
          totalRecords: existingJob.totalRecords,
          processedRecords: existingJob.processedRecords,
          percentComplete: existingJob.percentComplete
        });
      }

      // Initialize job status in MongoDB
      jobStatus = new JobStatus({
        jobId,
        operation: 'copy-taskdetail',
        totalRecords: totalRecords,
        processedRecords: 0,
        insertedRecords: 0,
        updatedRecords: 0,
        errorRecords: 0,
        startTime: new Date(),
        options: { whseid },
        status: 'in_progress',
        message: 'Starting TaskDetail copy operation'
      });
      
      // Save initial job status to MongoDB
      await jobStatus.save();
      logger.info(`Job status initialized in MongoDB: ${JSON.stringify(jobStatus.toObject())}`);
    } catch (error) {
      console.error('Error in count query process:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      if (error.stack) console.error('Stack trace:', error.stack);
      await disconnectFromMongoDB();
      return errorResponse('Error in count query process', error.message, 500);
    }
    
    // Process the first batch immediately to ensure we have data
    try {
      console.log('Processing first batch...');
      const firstBatchResult = await processTaskDetailBatch(whseid, 0, batchSize, jobId);
      console.log('First batch result:', firstBatchResult);
      
      // Update job status with first batch results
      await JobStatus.findOneAndUpdate(
        { jobId },
        { 
          $inc: { 
            processedRecords: firstBatchResult.processedRecords,
            insertedRecords: firstBatchResult.insertedRecords,
            updatedRecords: firstBatchResult.updatedRecords,
            errorRecords: firstBatchResult.errorRecords
          },
          $set: {
            percentComplete: Math.round((firstBatchResult.processedRecords / totalRecords) * 100),
            message: 'First batch processed successfully'
          }
        },
        { new: true }
      );
      
      console.log('Updated job status in MongoDB');
    } catch (batchError) {
      console.error('Error processing first batch:', batchError);
      console.error('Error name:', batchError.name);
      console.error('Error message:', batchError.message);
      if (batchError.stack) console.error('Stack trace:', batchError.stack);
      
      // Even if the first batch fails, update MongoDB with the error
      await JobStatus.findOneAndUpdate(
        { jobId },
        { 
          $inc: { errorRecords: batchSize },
          $set: {
            status: 'failed',
            message: `Error processing first batch: ${batchError.message}`,
            error: batchError.message,
            endTime: new Date()
          }
        }
      );
    }
    
    // Get the latest job status from MongoDB
    const updatedJobStatus = await JobStatus.findOne({ jobId });
    
    // Return response with job status
    return successResponse({
      message: 'TaskDetail copy started as background process',
      jobId,
      totalRecords,
      status: updatedJobStatus.status,
      firstBatchProcessed: true,
      progress: {
        processedRecords: updatedJobStatus.processedRecords,
        insertedRecords: updatedJobStatus.insertedRecords,
        updatedRecords: updatedJobStatus.updatedRecords,
        errorRecords: updatedJobStatus.errorRecords,
        percentComplete: updatedJobStatus.percentComplete
      }
    });
  } catch (error) {
    console.error('Error in copy-taskdetail function:', error);
    await disconnectFromMongoDB();
    return errorResponse('Failed to copy TaskDetail data', error.message, 500);
  }
};

// Process a single batch of TaskDetail records
async function processTaskDetailBatch(whseid, offset, limit, jobId = null) {
  console.log(`Processing batch: offset=${offset}, limit=${limit}`);
  
  const result = {
    processedRecords: 0,
    insertedRecords: 0,
    updatedRecords: 0,
    errorRecords: 0
  };
  
  try {
    console.log('Starting batch processing...');
    // Build and submit query
    const query = buildTaskDetailQuery(offset, limit, whseid);
    const queryResponse = await ionApi.submitQuery(query);
    const queryId = queryResponse.queryId || queryResponse.id;
    
    // Wait for query to complete
    let queryStatus = await ionApi.checkStatus(queryId);
    while (queryStatus.status !== 'completed' && queryStatus.status !== 'COMPLETED') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      queryStatus = await ionApi.checkStatus(queryId);
      
      if (queryStatus.status === 'failed' || queryStatus.status === 'FAILED') {
        console.error('Batch query failed:', queryStatus);
        result.errorRecords = limit;
        return result;
      }
    }
    
    // Get results
    const queryResults = await ionApi.getResults(queryId);
    const records = queryResults.results || [];
    console.log(`Retrieved ${records.length} records`);
    
    // Transform records
    const transformedRecords = transformData(records);
    
    // Skip if no records
    if (transformedRecords.length === 0) {
      console.log('No records to process, skipping batch');
      return result;
    }
    
    // Create bulk operations
    const bulkOperations = createBulkOperations(transformedRecords);
    
    // Execute bulk write
    const bulkResult = await TaskDetail.bulkWrite(bulkOperations);
    
    // Update result
    result.processedRecords = transformedRecords.length;
    result.insertedRecords = bulkResult.insertedCount || 0;
    result.updatedRecords = bulkResult.modifiedCount || 0;
    
    // Update job status in MongoDB if jobId is provided
    if (jobId) {
      try {
        await JobStatus.findOneAndUpdate(
          { jobId },
          { 
            $inc: { 
              processedRecords: result.processedRecords,
              insertedRecords: result.insertedRecords,
              updatedRecords: result.updatedRecords
            }
          }
        );
        console.log(`Updated job status in MongoDB for job ${jobId}`);
      } catch (updateError) {
        console.error('Error updating job status in MongoDB:', updateError);
      }
    }
    
    console.log(`Batch processed: ${result.processedRecords} records, ${result.insertedRecords} inserted, ${result.updatedRecords} updated`);
    return result;
  } catch (error) {
    console.error('Error processing batch:', error);
    result.errorRecords = limit;
    
    // Update job status in MongoDB if jobId is provided
    if (jobId) {
      try {
        await JobStatus.findOneAndUpdate(
          { jobId },
          { 
            $inc: { errorRecords: limit },
            $set: {
              message: `Error processing batch at offset ${offset}: ${error.message}`
            }
          }
        );
        console.log(`Updated job status in MongoDB for job ${jobId} with error`);
      } catch (updateError) {
        console.error('Error updating job status in MongoDB:', updateError);
      }
    }
    
    return result;
  }
}
