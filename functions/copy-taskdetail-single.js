// Netlify function for copying TaskDetail data one record at a time
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const ionApi = require('./utils/ion-api');
const TaskDetail = require('./models/taskdetail');
const JobStatus = require('./models/JobStatus');

// Configure logger
const logger = {
  info: (message) => console.log(`[copy-taskdetail-single][INFO] ${message}`),
  error: (message) => console.error(`[copy-taskdetail-single][ERROR] ${message}`),
  warn: (message) => console.warn(`[copy-taskdetail-single][WARNING] ${message}`),
  debug: (message) => console.log(`[copy-taskdetail-single][DEBUG] ${message}`)
};

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT',
  'Content-Type': 'application/json'
};

// Success response helper
function successResponse(body) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(body)
  };
}

// Error response helper
function errorResponse(statusCode, message) {
  return {
    statusCode: statusCode || 500,
    headers,
    body: JSON.stringify({ error: true, message })
  };
}

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    // MongoDB connection string from environment variable
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    
    logger.info('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
}

// Disconnect from MongoDB
async function disconnectFromMongoDB() {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
}

// Build TaskDetail query for single record
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

// Build count query
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

// Transform data for MongoDB
function transformData(records) {
  return records.map(record => {
    // Convert date strings to Date objects
    const transformed = { ...record };
    
    if (transformed.ADDDATE && typeof transformed.ADDDATE === 'string') {
      transformed.ADDDATE = new Date(transformed.ADDDATE);
    }
    
    if (transformed.EDITDATE && typeof transformed.EDITDATE === 'string') {
      transformed.EDITDATE = new Date(transformed.EDITDATE);
    }
    
    return transformed;
  });
}

// Process records one by one
async function processRecords(jobId, whseid, filters, totalRecords, processingDelay, startOffset = 0) {
  try {
    logger.info(`Starting background processing for job ${jobId} with startOffset=${startOffset}, totalRecords=${totalRecords}, processingDelay=${processingDelay}ms`);
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await connectToMongoDB();
    }
    
    // Process records one by one
    let offset = startOffset;
    let processedCount = startOffset; // If we're starting from offset > 0, we've already processed some records
    let insertedCount = 0;
    
    while (processedCount < totalRecords) {
      try {
        // Check if job is paused or stopped
        const currentJobStatus = await JobStatus.findOne({ jobId });
        
        if (!currentJobStatus) {
          logger.error(`Job ${jobId} not found in database`);
          break;
        }
        
        if (currentJobStatus.status === 'stopped') {
          logger.info(`Job ${jobId} has been stopped`);
          break;
        }
        
        if (currentJobStatus.paused) {
          logger.info(`Job ${jobId} is paused, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        
        // Build query for a single record
        const query = buildTaskDetailQuery(offset, 1, whseid, filters);
        logger.debug(`Processing record at offset ${offset}: ${query}`);
        
        // Execute query
        const response = await ionApi.submitQuery(query);
        
        // Wait for query to complete
        let status;
        do {
          status = await ionApi.checkStatus(response.queryId);
          
          if (status.status === 'failed' || status.status === 'FAILED') {
            throw new Error(`Query failed: ${JSON.stringify(status)}`);
          }
          
          if (status.status !== 'completed' && status.status !== 'COMPLETED' && status.status !== 'FINISHED') {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } while (status.status !== 'completed' && status.status !== 'COMPLETED' && status.status !== 'FINISHED');
        
        // Get results
        const results = await ionApi.getResults(response.queryId);
        
        // Extract record
        let record = null;
        if (results.results && results.results.length > 0) {
          record = results.results[0];
        } else if (results.rows && results.rows.length > 0) {
          // Convert row to object using column names
          const columns = results.columns || [];
          record = {};
          results.rows[0].forEach((value, index) => {
            if (columns[index]) {
              record[columns[index].name] = value;
            }
          });
        }
        
        if (record) {
          // Transform record
          const transformedRecord = transformData([record])[0];
          
          // Save to MongoDB
          try {
            // Check if record already exists
            const existingRecord = await TaskDetail.findOne({
              TASKDETAILKEY: transformedRecord.TASKDETAILKEY,
              WHSEID: transformedRecord.WHSEID
            });
            
            if (existingRecord) {
              // Update existing record
              await TaskDetail.updateOne(
                { _id: existingRecord._id },
                { $set: transformedRecord }
              );
              logger.debug(`Updated record: ${transformedRecord.TASKDETAILKEY}`);
            } else {
              // Insert new record
              const newRecord = new TaskDetail(transformedRecord);
              await newRecord.save();
              insertedCount++;
              logger.debug(`Inserted record: ${transformedRecord.TASKDETAILKEY}`);
            }
            
            // Update job status with current record
            await JobStatus.findOneAndUpdate(
              { jobId },
              { 
                $set: { 
                  processedRecords: processedCount + 1,
                  insertedRecords: insertedCount,
                  currentRecord: transformedRecord,
                  lastUpdated: new Date()
                }
              }
            );
          } catch (saveError) {
            logger.error(`Error saving record: ${saveError.message}`);
            
            // Update job status with error
            await JobStatus.findOneAndUpdate(
              { jobId },
              { $push: { errors: `Error saving record: ${saveError.message}` } }
            );
          }
        } else {
          logger.warn(`No record found at offset ${offset}`);
        }
        
        // Increment counters
        offset++;
        processedCount++;
        
        // Add delay between records if specified
        if (processingDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, processingDelay));
        }
        
      } catch (error) {
        logger.error(`Error processing record at offset ${offset}: ${error.message}`);
        
        // Update job status with error
        await JobStatus.findOneAndUpdate(
          { jobId },
          { $push: { errors: `Error at offset ${offset}: ${error.message}` } }
        );
        
        // Increment offset to try next record
        offset++;
      }
    }
    
    // Mark job as completed
    await JobStatus.findOneAndUpdate(
      { jobId },
      { 
        $set: { 
          status: 'completed',
          endTime: new Date(),
          processedRecords: processedCount,
          insertedRecords: insertedCount
        }
      }
    );
    
    logger.info(`Job ${jobId} completed: ${processedCount} records processed, ${insertedCount} records inserted`);
    
  } catch (error) {
    logger.error(`Error in background processing: ${error.message}`);
    
    // Update job status with error
    await JobStatus.findOneAndUpdate(
      { jobId },
      { 
        $set: { status: 'failed', endTime: new Date() },
        $push: { errors: error.message }
      }
    );
  } finally {
    // Disconnect from MongoDB
    await disconnectFromMongoDB();
  }
}

// Main handler function
exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }
  
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
    // Get record limit
    const recordLimit = parseInt(requestBody.recordLimit, 10) || 10;
    // Get processing delay
    const processingDelay = parseInt(requestBody.processingDelay, 10) || 1000;
    
    // Log filter parameters
    logger.info(`Filters applied: ${JSON.stringify(filters)}`);
    logger.info(`Record limit: ${recordLimit}, Processing delay: ${processingDelay}ms`);
    
    console.log(`Starting TaskDetail copy for warehouse ${whseid} (using table CSWMS_wmwhse_TASKDETAIL with WHSEID filter)`);
    
    // Connect to MongoDB
    console.log('Calling connectToMongoDB function...');
    await connectToMongoDB();
    
    // Build count query
    const countQuery = buildCountQuery(whseid, filters);
    console.log('Count query:', countQuery);
    
    // Execute count query
    const countResponse = await ionApi.submitQuery(countQuery);
    console.log('Count query submitted:', countResponse);
    
    // Wait for count query to complete
    let countStatus;
    do {
      countStatus = await ionApi.checkStatus(countResponse.queryId);
      console.log('Count query status:', countStatus.status);
      
      if (countStatus.status === 'failed' || countStatus.status === 'FAILED') {
        throw new Error(`Count query failed: ${JSON.stringify(countStatus)}`);
      }
      
      if (countStatus.status !== 'completed' && countStatus.status !== 'COMPLETED' && countStatus.status !== 'FINISHED') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } while (countStatus.status !== 'completed' && countStatus.status !== 'COMPLETED' && countStatus.status !== 'FINISHED');
    
    // Get count results
    const countResults = await ionApi.getResults(countResponse.queryId);
    console.log('Count results:', countResults);
    
    // Extract total count
    let totalRecords = 0;
    if (countResults.results && countResults.results[0] && countResults.results[0].count !== undefined) {
      totalRecords = parseInt(countResults.results[0].count, 10);
    } else if (countResults.rows && countResults.rows[0] && countResults.rows[0][0] !== undefined) {
      totalRecords = parseInt(countResults.rows[0][0], 10);
    }
    
    console.log(`Total records: ${totalRecords}`);
    
    // Limit the total records if needed
    const actualTotalRecords = Math.min(totalRecords, recordLimit);
    console.log(`Actual records to process: ${actualTotalRecords}`);
    
    // Create a job ID
    const jobId = uuidv4();
    
    // Create job status in MongoDB
    const jobStatus = new JobStatus({
      jobId,
      type: 'copy-taskdetail-single',
      status: 'running',
      totalRecords: actualTotalRecords,
      processedRecords: 0,
      insertedRecords: 0,
      errors: [],
      filters: {
        whseid,
        year: filters.year,
        taskType: filters.taskType
      },
      settings: {
        recordLimit,
        processingDelay
      },
      startTime: new Date(),
      paused: false
    });
    
    await jobStatus.save();
    console.log(`Job status created with ID: ${jobId}`);
    
    // Process the first record synchronously to ensure it starts properly
    // Then continue with background processing for the rest
    if (actualTotalRecords > 0) {
      try {
        // Build query for the first record
        const query = buildTaskDetailQuery(0, 1, whseid, filters);
        logger.info(`Processing first record synchronously: ${query}`);
        
        // Execute query
        const response = await ionApi.submitQuery(query);
        
        // Wait for query to complete
        let status;
        do {
          status = await ionApi.checkStatus(response.queryId);
          
          if (status.status === 'failed' || status.status === 'FAILED') {
            throw new Error(`Query failed: ${JSON.stringify(status)}`);
          }
          
          if (status.status !== 'completed' && status.status !== 'COMPLETED' && status.status !== 'FINISHED') {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } while (status.status !== 'completed' && status.status !== 'COMPLETED' && status.status !== 'FINISHED');
        
        // Get results
        const results = await ionApi.getResults(response.queryId);
        
        // Extract record
        let record = null;
        if (results.results && results.results.length > 0) {
          record = results.results[0];
        } else if (results.rows && results.rows.length > 0) {
          // Convert row to object using column names
          const columns = results.columns || [];
          record = {};
          results.rows[0].forEach((value, index) => {
            if (columns[index]) {
              record[columns[index].name] = value;
            }
          });
        }
        
        if (record) {
          // Transform record
          const transformedRecord = transformData([record])[0];
          
          // Save to MongoDB
          try {
            // Check if record already exists
            const existingRecord = await TaskDetail.findOne({
              TASKDETAILKEY: transformedRecord.TASKDETAILKEY,
              WHSEID: transformedRecord.WHSEID
            });
            
            if (existingRecord) {
              // Update existing record
              await TaskDetail.updateOne(
                { _id: existingRecord._id },
                { $set: transformedRecord }
              );
              logger.info(`Updated first record: ${transformedRecord.TASKDETAILKEY}`);
            } else {
              // Insert new record
              const newRecord = new TaskDetail(transformedRecord);
              await newRecord.save();
              logger.info(`Inserted first record: ${transformedRecord.TASKDETAILKEY}`);
            }
            
            // Update job status with current record
            await JobStatus.findOneAndUpdate(
              { jobId },
              { 
                $set: { 
                  processedRecords: 1,
                  insertedRecords: 1,
                  currentRecord: transformedRecord,
                  lastUpdated: new Date()
                }
              }
            );
          } catch (saveError) {
            logger.error(`Error saving first record: ${saveError.message}`);
            throw saveError;
          }
        } else {
          logger.warn('No record found in the first position');
        }
      } catch (error) {
        logger.error(`Error processing first record: ${error.message}`);
        // Don't throw here, we'll still return the job ID and let the client check status
      }
    }
    
    // Continue with background processing for remaining records
    if (actualTotalRecords > 1) {
      setTimeout(() => {
        processRecords(jobId, whseid, filters, actualTotalRecords, processingDelay, 1) // Start from offset 1
          .catch(error => {
            console.error(`Background processing error: ${error.message}`);
            // Update job status with error
            JobStatus.findOneAndUpdate(
              { jobId },
              { 
                $set: { status: 'failed' },
                $push: { errors: error.message }
              }
            ).catch(err => {
              console.error(`Error updating job status: ${err.message}`);
            });
          });
      }, 100);
    }
    
    // Build the queries for display purposes
    const displayCountQuery = buildCountQuery(whseid, filters);
    const displayDataQuery = buildTaskDetailQuery(0, 1, whseid, filters);
    
    // Return response with job status and SQL queries
    return successResponse({
      message: 'TaskDetail copy started as background process',
      jobId,
      totalRecords: actualTotalRecords,
      status: 'running',
      queries: {
        countQuery: displayCountQuery.trim(),
        dataQuery: displayDataQuery.trim()
      }
    });
    
  } catch (error) {
    console.error(`Error in copy-taskdetail-single: ${error.message}`);
    
    // Ensure MongoDB connection is closed
    try {
      await disconnectFromMongoDB();
    } catch (disconnectError) {
      console.error(`Error disconnecting from MongoDB: ${disconnectError.message}`);
    }
    
    return errorResponse(500, `Error starting copy process: ${error.message}`);
  }
};
