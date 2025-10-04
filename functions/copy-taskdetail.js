// Background function to copy TaskDetail data from DataLake to MongoDB Atlas
// This runs as a background function with a 15-minute timeout
const config = {
  background: true
};

// Export the config for Netlify
exports.config = config;

// Track detected SQL dialect capabilities
let detectedSqlDialect = null;

/**
 * Detect SQL dialect capabilities of the DataFabric API
 * This helps determine which query syntax to use
 * @returns {Promise<string>} 'advanced' if EXTRACT is supported, 'basic' otherwise
 */
async function detectSqlDialect() {
  if (detectedSqlDialect) {
    return detectedSqlDialect;
  }
  
  console.log('Detecting SQL dialect capabilities...');
  
  try {
    // Try a simple query with EXTRACT function
    const extractQuery = `
      SELECT 1 as test
      WHERE EXTRACT(YEAR FROM CURRENT_DATE) > 2000
    `;
    
    const response = await ionApi.submitQuery(extractQuery);
    const queryId = response.queryId || response.id;
    
    // Check status
    const status = await ionApi.checkStatus(queryId);
    
    if (status.status === 'completed' || status.status === 'COMPLETED' || status.status === 'FINISHED') {
      console.log('SQL dialect supports EXTRACT function');
      detectedSqlDialect = 'advanced';
    } else {
      console.log('SQL dialect does NOT support EXTRACT function');
      detectedSqlDialect = 'basic';
    }
  } catch (error) {
    console.warn('Error detecting SQL dialect, assuming basic dialect:', error.message);
    detectedSqlDialect = 'basic';
  }
  
  return detectedSqlDialect;
}

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

function buildTaskDetailQuery(offset, limit, whseid = 'wmwhse1', filters = {}) {
  // Build WHERE clause based on filters
  let whereClause = '';
  const conditions = [];
  
  // Filter by warehouse ID unless 'all' is specified
  if (whseid !== 'all') {
    conditions.push(`WHSEID = '${whseid}'`);
  }
  
  // Add year filter if provided
  if (filters.year) {
    try {
      // Use a date range comparison that's compatible with most SQL dialects
      // and handles ISO 8601 format dates (YYYY-MM-DDTHH:MM:SS.sssZ)
      const yearStart = `${filters.year}-01-01T00:00:00.000Z`;
      const yearEnd = `${filters.year}-12-31T23:59:59.999Z`;
      
      // Use string comparison with full ISO format to ensure proper date filtering
      conditions.push(`(ADDDATE >= '${yearStart}' AND ADDDATE <= '${yearEnd}')`);
      
      logger.info(`Using date range filter: ADDDATE between ${yearStart} and ${yearEnd}`);
    } catch (e) {
      logger.error('Error creating date filter:', e.message);
    }
  }
  
  // Add task type filter if provided
  if (filters.taskType) {
    conditions.push(`TASKTYPE = '${filters.taskType}'`);
  } else {
    // If no task type is specified, use the expanded list of task types
    // Primary task types: PK, PP, PA, CC, LD, TD, RC
    // Additional high-volume task types: PIA, PIB, DP, MV, RP, CR
    conditions.push(`TASKTYPE IN ('PK', 'PP', 'PA', 'CC', 'LD', 'TD', 'RC', 'PIA', 'PIB', 'DP', 'MV', 'RP', 'CR')`);
  }
  
  // Combine conditions
  whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // For single record lookup
  if (limit === 1) {
    return `
      SELECT *
      FROM "CSWMS_wmwhse_TASKDETAIL"
      ${whereClause}
      ORDER BY TASKDETAILKEY
      OFFSET ${offset}
      LIMIT 1
    `;
  }
  
  // Query for larger batches with filters
  return `
    SELECT *
    FROM (
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY TASKDETAILKEY) AS row_num
      FROM 
        "CSWMS_wmwhse_TASKDETAIL"
      ${whereClause}
    ) AS numbered_rows
    WHERE row_num BETWEEN ${offset + 1} AND ${offset + limit}
  `;
}

function buildCountQuery(whseid = 'wmwhse1', filters = {}) {
  // Build WHERE clause based on filters
  let whereClause = '';
  const conditions = [];
  
  // Filter by warehouse ID unless 'all' is specified
  if (whseid !== 'all') {
    conditions.push(`WHSEID = '${whseid}'`);
  }
  
  // Add year filter if provided
  if (filters.year) {
    try {
      // Use a date range comparison that's compatible with most SQL dialects
      // and handles ISO 8601 format dates (YYYY-MM-DDTHH:MM:SS.sssZ)
      const yearStart = `${filters.year}-01-01T00:00:00.000Z`;
      const yearEnd = `${filters.year}-12-31T23:59:59.999Z`;
      
      // Use string comparison with full ISO format to ensure proper date filtering
      conditions.push(`(ADDDATE >= '${yearStart}' AND ADDDATE <= '${yearEnd}')`);
      
      logger.info(`Using date range filter: ADDDATE between ${yearStart} and ${yearEnd}`);
    } catch (e) {
      logger.error('Error creating date filter:', e.message);
    }
  }
  
  // Add task type filter if provided
  if (filters.taskType) {
    conditions.push(`TASKTYPE = '${filters.taskType}'`);
  } else {
    // If no task type is specified, use the expanded list of task types
    // Primary task types: PK, PP, PA, CC, LD, TD, RC
    // Additional high-volume task types: PIA, PIB, DP, MV, RP, CR
    conditions.push(`TASKTYPE IN ('PK', 'PP', 'PA', 'CC', 'LD', 'TD', 'RC', 'PIA', 'PIB', 'DP', 'MV', 'RP', 'CR')`);
  }
  
  // Combine conditions
  whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return `
    SELECT COUNT(*) as count
    FROM "CSWMS_wmwhse_TASKDETAIL"
    ${whereClause}
  `;
}
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
  
  // Detect SQL dialect capabilities early
  try {
    const sqlDialect = await detectSqlDialect();
    logger.info(`Detected SQL dialect: ${sqlDialect}`);
  } catch (dialectError) {
    logger.warn(`Could not detect SQL dialect: ${dialectError.message}. Will use safe query syntax.`);
  }
  
  // Define variables at the top level of the function for proper scope
  let jobId;
  let totalRecords = 0;
  
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    // Extract filter parameters
    const filters = {
      year: requestBody.year ? parseInt(requestBody.year, 10) : null,
      taskType: requestBody.taskType || null,
    };
    
    // Using warehouse ID from request or default to 'all'
    const whseid = requestBody.whseid || 'all';
    // Use a batch size of 1000 records for efficient processing
    const batchSize = 1000;
    
    // Log filter parameters
    logger.info(`Filters applied: ${JSON.stringify(filters)}`);
    
    console.log(`Starting TaskDetail copy for warehouse ${whseid} (using table CSWMS_wmwhse_TASKDETAIL with WHSEID filter)`);
    
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
    const countQuery = buildCountQuery(whseid, filters);
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
          
          // Create a detailed error message based on the filters that were used
          let errorMessage = 'Count query failed';
          if (filters.year) {
            errorMessage += `. The year filter (${filters.year}) may not be supported by this SQL dialect.`;
          }
          if (filters.taskType) {
            errorMessage += ` Task type filter: ${filters.taskType}`;
          }
          
          // Log the error with details about the filters
          console.error(`Query failed with filters: ${JSON.stringify(filters)}`);
          
          // Disconnect from MongoDB and return error
          await disconnectFromMongoDB();
          return errorResponse(errorMessage, countStatus, 500);
        }
      }
      
      console.log('Count query completed successfully with status:', countStatus.status);
      
      // Get count results (within the same try block to maintain countQueryId scope)
      console.log('Getting count results...');
      const countResults = await ionApi.getResults(countQueryId);
      console.log('Count results:', JSON.stringify(countResults, null, 2));
      
      // We're already using a batch size of 1 record at a time (defined earlier)
      
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
      console.log(`Count query details: Format detected=${
        countResults.results ? 'results array' : 
        countResults.rows ? 'rows array' : 
        countResults.data ? 'data object' : 'unknown'
      }`);
      
      // Log the raw count results for debugging
      console.log('Raw count results:', JSON.stringify(countResults, null, 2));
      
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
      let jobStatus = new JobStatus({
        jobId,
        operation: 'copy-taskdetail',
        totalRecords: totalRecords,
        processedRecords: 0,
        insertedRecords: 0,
        updatedRecords: 0,
        errorRecords: 0,
        startTime: new Date(),
        options: { 
          whseid,
          filters: {
            year: filters.year,
            taskType: filters.taskType
          }
        },
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
      const firstBatchResult = await processTaskDetailBatch(whseid, 0, batchSize, jobId, filters);
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
    
    // Start background processing of remaining records
    // This will continue after the response is sent
    (async () => {
      try {
        logger.info(`Starting background processing of remaining records for job ${jobId}`);
        let offset = updatedJobStatus.processedRecords || 0;
        
        // Continue processing in batches until all records are processed
        let noRecordsCount = 0; // Track consecutive empty batches
        const maxEmptyBatches = 5; // Stop after this many consecutive empty batches (increased from 3)
        let processedCount = updatedJobStatus.processedRecords || 0; // Initialize with current processed count
        
        while (processedCount < totalRecords) {
          try {
            logger.info(`Processing batch at offset ${offset} of ${totalRecords} total records (${Math.round((processedCount / totalRecords) * 100)}% complete)`);
            const batchResult = await processTaskDetailBatch(whseid, offset, batchSize, jobId, filters);
            
            // Check if we got any records in this batch
            if (batchResult.processedRecords === 0) {
              noRecordsCount++;
              logger.warn(`No records processed in batch at offset ${offset}. Empty batch count: ${noRecordsCount}/${maxEmptyBatches}`);
              
              // If we've had several consecutive empty batches, we might have reached the end of data
              if (noRecordsCount >= maxEmptyBatches) {
                logger.warn(`Received ${maxEmptyBatches} consecutive empty batches. Assuming end of data reached.`);
                
                // Update the total records count to match what we've actually processed
                const currentJob = await JobStatus.findOne({ jobId });
                if (currentJob) {
                  const actualProcessed = currentJob.processedRecords || 0;
                  logger.info(`Adjusting total record count from ${totalRecords} to ${actualProcessed} based on actual data received`);
                  totalRecords = actualProcessed;
                  
                  // Update the job with the corrected total
                  await JobStatus.findOneAndUpdate(
                    { jobId },
                    { $set: { totalRecords: actualProcessed, percentComplete: 100 } }
                  );
                }
                
                break; // Exit the processing loop
              }
              
              // If no records were processed, still increment the offset to avoid an infinite loop
              offset += batchSize;
            } else {
              // Reset the counter if we got records
              noRecordsCount = 0;
              
              // Only increment the offset by the number of records actually processed
              // This ensures we don't skip records or process them multiple times
              offset += batchResult.processedRecords;
              processedCount += batchResult.processedRecords;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between batches
          } catch (error) {
            logger.error(`Error processing batch at offset ${offset}: ${error.message}`);
            // Increment offset by a smaller amount when there's an error to try to recover
            offset += Math.ceil(batchSize / 10); // Move forward a bit, but not a full batch
          }
        }
        
        // Mark job as completed
        await JobStatus.findOneAndUpdate(
          { jobId },
          { 
            $set: {
              status: 'completed',
              message: `Processed all ${totalRecords} records`,
              endTime: new Date(),
              percentComplete: 100
            }
          }
        );
        logger.info(`Background processing completed for job ${jobId}`);
      } catch (error) {
        logger.error(`Fatal error in background processing: ${error.message}`);
      }
    })().catch(error => logger.error(`Unhandled error in background processing: ${error.message}`));
    
    // Build the queries for display purposes
    const displayCountQuery = buildCountQuery(whseid, filters);
    const displayDataQuery = buildTaskDetailQuery(0, 1000, whseid, filters);
    
    // Return response with job status and SQL queries
    return successResponse({
      message: 'TaskDetail copy started as background process',
      jobId,
      totalRecords,
      status: updatedJobStatus.status,
      firstBatchProcessed: true,
      queries: {
        countQuery: displayCountQuery.trim(),
        dataQuery: displayDataQuery.trim()
      },
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
    
    // If there's a jobId in scope, try to update its status
    try {
      if (typeof jobId !== 'undefined') {
        await JobStatus.findOneAndUpdate(
          { jobId },
          { 
            $set: {
              status: 'failed',
              message: `Error in copy-taskdetail function: ${error.message}`,
              error: error.message,
              endTime: new Date()
            }
          }
        );
        console.log(`Updated job status in MongoDB for job ${jobId} with error information`);
      }
    } catch (updateError) {
      console.error('Error updating job status:', updateError);
    }
    
    await disconnectFromMongoDB();
    return errorResponse('Failed to copy TaskDetail data', error.message, 500);
  }
};

// Process a single batch of TaskDetail records
async function processTaskDetailBatch(whseid, offset, limit, jobId = null, filters = {}) {
  logger.info(`Processing batch: offset=${offset}, limit=${limit}, jobId=${jobId || 'none'}`);
  
  const result = {
    processedRecords: 0,
    insertedRecords: 0,
    updatedRecords: 0,
    errorRecords: 0
  };
  
  try {
    logger.info('Starting batch processing...');
    // Build and submit query
    const query = buildTaskDetailQuery(offset, limit, whseid, filters);
    logger.info(`Submitting query to ION API: ${query.replace(/\s+/g, ' ').trim()}`);
    
    // Add retry logic for query submission
    let queryResponse;
    let queryId;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        queryResponse = await ionApi.submitQuery(query);
        queryId = queryResponse.queryId || queryResponse.id;
        logger.info(`Query submitted successfully, queryId: ${queryId}`);
        break; // Success, exit the retry loop
      } catch (error) {
        retryCount++;
        logger.error(`Error submitting query (attempt ${retryCount}/${maxRetries}): ${error.message}`);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to submit query after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying with exponential backoff
        const delay = 1000 * Math.pow(2, retryCount - 1); // 1s, 2s, 4s
        logger.info(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Wait for query to complete
    let queryStatus = await ionApi.checkStatus(queryId);
    while (queryStatus.status !== 'completed' && queryStatus.status !== 'COMPLETED' && queryStatus.status !== 'FINISHED') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      queryStatus = await ionApi.checkStatus(queryId);
      
      if (queryStatus.status === 'failed' || queryStatus.status === 'FAILED') {
        logger.error(`Batch query failed: ${JSON.stringify(queryStatus)}`);
        result.errorRecords = limit;
        return result;
      }
    }
    
    // Get results
    logger.info(`Query completed, fetching results for queryId: ${queryId}`);
    // Pass the limit parameter to ensure we get the correct batch size
    
    // Add retry logic for getting results
    let queryResults;
    let records = [];
    let resultRetryCount = 0;
    const maxResultRetries = 3;
    
    while (resultRetryCount < maxResultRetries) {
      try {
        queryResults = await ionApi.getResults(queryId, 0, limit);
        records = queryResults.results || [];
        logger.info(`Retrieved ${records.length} records from ION API (requested limit: ${limit})`);
        break; // Success, exit the retry loop
      } catch (error) {
        resultRetryCount++;
        logger.error(`Error getting results (attempt ${resultRetryCount}/${maxResultRetries}): ${error.message}`);
        
        if (resultRetryCount >= maxResultRetries) {
          throw new Error(`Failed to get results after ${maxResultRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying with exponential backoff
        const delay = 1000 * Math.pow(2, resultRetryCount - 1); // 1s, 2s, 4s
        logger.info(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Log more details about the results
    if (records.length === 0) {
      logger.warn(`No records returned for this batch! This might indicate we've reached the end of data or an API limitation`);
      logger.info(`Raw query results structure: ${JSON.stringify(Object.keys(queryResults))}`);
      
      // Log more details about the query results
      logger.info(`Query status: ${queryStatus.status}`);
      logger.info(`Query ID: ${queryId}`);
      logger.info(`Query response headers: ${JSON.stringify(queryResults.headers || {})}`);
      
      // If there's an error message in the response, log it
      if (queryResults.error || queryResults.message) {
        logger.error(`Query error: ${queryResults.error || queryResults.message}`);
      }
      
      // Log the full query for debugging
      logger.info(`Full query: ${query}`);
    } else if (records.length < limit) {
      logger.info(`Received fewer records (${records.length}) than requested (${limit}). This might be the last batch.`);
      logger.info(`First record TASKDETAILKEY: ${records[0].TASKDETAILKEY}, Last record TASKDETAILKEY: ${records[records.length-1].TASKDETAILKEY}`);
    } else {
      logger.info(`Received full batch of ${records.length} records. First: ${records[0].TASKDETAILKEY}, Last: ${records[records.length-1].TASKDETAILKEY}`);
    }
    
    // Transform records
    const transformedRecords = transformData(records);
    
    // Skip if no records
    if (transformedRecords.length === 0) {
      logger.info('No records to process, skipping batch');
      return result;
    }
    
    // Log sample record structure
    if (transformedRecords.length > 0) {
      const sampleRecord = transformedRecords[0];
      const sampleKeys = Object.keys(sampleRecord).slice(0, 10); // Show first 10 keys
      logger.info(`Sample record structure (first 10 fields): ${JSON.stringify(sampleKeys)}`);
    }
    
    // Create bulk operations
    const bulkOperations = createBulkOperations(transformedRecords);
    
    // For single records, use updateOne instead of bulkWrite for better logging
    if (transformedRecords.length === 1) {
      const record = transformedRecords[0];
      logger.info(`Processing single record: TASKDETAILKEY=${record.TASKDETAILKEY}, WHSEID=${record.WHSEID}`);
      
      // Execute updateOne instead of bulkWrite for single records
      logger.info(`Executing updateOne for TASKDETAILKEY=${record.TASKDETAILKEY}`);
      try {
        const updateResult = await TaskDetail.updateOne(
          { TASKDETAILKEY: record.TASKDETAILKEY, WHSEID: record.WHSEID },
          { $set: record },
          { upsert: true }
        );
        
        logger.info(`MongoDB updateOne result: ${JSON.stringify({
          matchedCount: updateResult.matchedCount || 0,
          modifiedCount: updateResult.modifiedCount || 0,
          upsertedCount: updateResult.upsertedId ? 1 : 0
        })}`);
        
        // Update result
        result.processedRecords = 1;
        result.insertedRecords = updateResult.upsertedId ? 1 : 0;
        result.updatedRecords = updateResult.modifiedCount || 0;
        result.upsertedRecords = updateResult.upsertedId ? 1 : 0;
        
        // Skip the bulkWrite operation
        return result;
      } catch (updateError) {
        logger.error(`MongoDB updateOne error: ${updateError.message}`);
        throw updateError;
      }
    }
    
    // For multiple records, use bulkWrite
    logger.info(`Executing bulkWrite operation with ${bulkOperations.length} operations`);
    try {
      const bulkResult = await TaskDetail.bulkWrite(bulkOperations);
      
      // Log detailed results
      logger.info(`MongoDB bulkWrite result: ${JSON.stringify({
        insertedCount: bulkResult.insertedCount || 0,
        matchedCount: bulkResult.matchedCount || 0,
        modifiedCount: bulkResult.modifiedCount || 0,
        deletedCount: bulkResult.deletedCount || 0,
        upsertedCount: bulkResult.upsertedCount || 0,
        upsertedIds: bulkResult.upsertedIds ? Object.keys(bulkResult.upsertedIds).length : 0
      })}`);
      
      // Update result
      result.processedRecords = transformedRecords.length;
      result.insertedRecords = bulkResult.insertedCount || 0;
      result.updatedRecords = bulkResult.modifiedCount || 0;
      
      // Add upsert information
      result.upsertedRecords = bulkResult.upsertedCount || 0;
    } catch (bulkError) {
      logger.error(`MongoDB bulkWrite error: ${bulkError.message}`);
      if (bulkError.writeErrors) {
        logger.error(`Write errors: ${JSON.stringify(bulkError.writeErrors)}`);
      }
      throw bulkError;
    }
    
    // Update job status in MongoDB if jobId is provided
    if (jobId) {
      try {
        // Calculate percentage complete based on processed records
        const jobStatus = await JobStatus.findOne({ jobId });
        if (jobStatus) {
          const totalRecords = jobStatus.totalRecords || 1000;
          const processedSoFar = jobStatus.processedRecords || 0;
          const newProcessed = processedSoFar + result.processedRecords;
          const percentComplete = Math.round((newProcessed / totalRecords) * 100);
          
          // Update job status
          const updateResult = await JobStatus.findOneAndUpdate(
            { jobId },
            { 
              $inc: { 
                processedRecords: result.processedRecords,
                insertedRecords: result.insertedRecords,
                updatedRecords: result.updatedRecords,
                upsertedRecords: result.upsertedRecords || 0
              },
              $set: {
                percentComplete: percentComplete,
                message: `Processed ${newProcessed} of ${totalRecords} records (${percentComplete}%)`
              }
            },
            { new: true } // Return updated document
          );
          
          logger.info(`Updated job status in MongoDB for job ${jobId}: ${JSON.stringify({
            processedRecords: updateResult.processedRecords,
            insertedRecords: updateResult.insertedRecords,
            updatedRecords: updateResult.updatedRecords,
            percentComplete: updateResult.percentComplete
          })}`);
        } else {
          logger.warn(`Job ${jobId} not found in database, could not update status`);
        }
      } catch (updateError) {
        logger.error(`Error updating job status in MongoDB: ${updateError.message}`);
      }
    }
    
    logger.info(`Batch completed: ${result.processedRecords} records processed, ${result.insertedRecords} inserted, ${result.updatedRecords} updated, ${result.upsertedRecords || 0} upserted`);
    return result;
  } catch (error) {
    logger.error(`Error processing batch: ${error.message}`);
    if (error.stack) {
      logger.error(`Stack trace: ${error.stack}`);
    }
    result.errorRecords = limit;
    
    // Update job status in MongoDB if jobId is provided
    if (jobId) {
      try {
        const errorUpdate = await JobStatus.findOneAndUpdate(
          { jobId },
          { 
            $inc: { errorRecords: limit },
            $set: {
              message: `Error processing batch at offset ${offset}: ${error.message}`,
              lastError: error.message,
              lastErrorTimestamp: new Date()
            }
          },
          { new: true }
        );
        
        if (errorUpdate) {
          logger.info(`Updated job status in MongoDB for job ${jobId} with error information`);
          logger.info(`Current job status: ${JSON.stringify({
            status: errorUpdate.status,
            processedRecords: errorUpdate.processedRecords,
            errorRecords: errorUpdate.errorRecords,
            percentComplete: errorUpdate.percentComplete
          })}`);
        } else {
          logger.warn(`Job ${jobId} not found in database, could not update error status`);
        }
      } catch (updateError) {
        logger.error(`Error updating job status in MongoDB: ${updateError.message}`);
      }
    }
    
    return result;
  }
}

// Export the processTaskDetailBatch function for testing
exports.processTaskDetailBatch = processTaskDetailBatch;
