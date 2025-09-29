// Simple function to copy TaskDetail data from DataLake to MongoDB Atlas
const mongoose = require('mongoose');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const ionApi = require('./utils/ion-api');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';

// Define TaskDetail schema
const taskDetailSchema = new mongoose.Schema({
  taskId: { type: String, required: true, index: true },
  whseid: { type: String, required: true },
  tasktype: String,
  status: String,
  priority: Number,
  pickdetailkey: String,
  storerkey: String,
  sku: String,
  loc: String,
  lot: String,
  qty: Number,
  uom: String,
  fromLoc: String,
  toLoc: String,
  addDate: Date,
  addWho: String,
  editDate: Date,
  editWho: String
}, { 
  timestamps: true,
  strict: false // Allow additional fields
});

// Create model
const TaskDetail = mongoose.models.TaskDetail || mongoose.model('TaskDetail', taskDetailSchema);

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
  return `
    SELECT 
      TASKDETAILKEY as taskId,
      WHSEID as whseid,
      TASKTYPE as tasktype,
      STATUS as status,
      PRIORITY as priority,
      PICKDETAILKEY as pickdetailkey,
      STORERKEY as storerkey,
      SKU as sku,
      LOC as loc,
      LOT as lot,
      QTY as qty,
      UOM as uom,
      FROMLOC as fromLoc,
      TOLOC as toLoc,
      ADDDATE as addDate,
      ADDWHO as addWho,
      EDITDATE as editDate,
      EDITWHO as editWho
    FROM 
      "CSWMS_wmwhse_TASKDETAIL"
    ORDER BY 
      TASKDETAILKEY
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY
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
    if (record.addDate) {
      record.addDate = new Date(record.addDate);
    }
    if (record.editDate) {
      record.editDate = new Date(record.editDate);
    }
    return record;
  });
}

// Create bulk write operations
function createBulkOperations(records) {
  return records.map(record => ({
    updateOne: {
      filter: { taskId: record.taskId, whseid: record.whseid },
      update: { $set: record },
      upsert: true
    }
  }));
}

exports.handler = async function(event, context) {
  console.log('copy-taskdetail function called');
  
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return handlePreflight();
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.log(`Invalid method: ${event.httpMethod}`);
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
    console.log('Getting total record count...');
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
      
      while (countStatus.status !== 'completed' && countStatus.status !== 'COMPLETED') {
        console.log(`Query status: ${countStatus.status}, waiting 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        countStatus = await ionApi.checkStatus(countQueryId);
        
        if (countStatus.status === 'failed' || countStatus.status === 'FAILED') {
          console.error('Count query failed:', JSON.stringify(countStatus, null, 2));
          await disconnectFromMongoDB();
          return errorResponse('Count query failed', countStatus, 500);
        }
      }
      
      console.log('Count query completed successfully');
    } catch (ionApiError) {
      console.error('Error calling ION API:', ionApiError);
      console.error('Error name:', ionApiError.name);
      console.error('Error message:', ionApiError.message);
      if (ionApiError.stack) console.error('Stack trace:', ionApiError.stack);
      
      await disconnectFromMongoDB();
      return errorResponse('Error calling ION API', ionApiError.message, 500);
    }
    
    // Declare variables in the outer scope
    let totalRecords, jobId, jobStatus;
    
    // Get count results
    try {
      console.log('Getting count results...');
      const countResults = await ionApi.getResults(countQueryId);
      console.log('Count results:', JSON.stringify(countResults, null, 2));
      
      if (!countResults || !countResults.results || !countResults.results[0] || countResults.results[0].count === undefined) {
        console.error('Invalid count results:', countResults);
        await disconnectFromMongoDB();
        return errorResponse('Invalid count results from ION API', countResults, 500);
      }
      
      totalRecords = parseInt(countResults.results[0].count, 10);
      const defaultConfig = {
        tableId: tableId,
        tableName: tableId === 'taskdetail' ? 'Task Detail' : 
                  tableId === 'receipt' ? 'Receipt' : 
                  tableId === 'receiptdetail' ? 'Receipt Detail' : 
                  tableId === 'orders' ? 'Orders' : 
                  tableId === 'orderdetail' ? 'Order Detail' : tableId,
        description: `Default configuration for ${tableId}`,
        enabled: true,
        syncFrequency: 60,
        initialSync: true,
        batchSize: 1000,
        maxRecords: 10000,
        options: {
          whseid: whseid
        },
        status: 'in_progress'
      };
      
      console.log('Job status initialized:', jobStatus);
    } catch (resultsError) {
      console.error('Error getting count results:', resultsError);
      console.error('Error message:', resultsError.message);
      if (resultsError.stack) console.error('Stack trace:', resultsError.stack);
      
      await disconnectFromMongoDB();
      return errorResponse('Error getting count results', resultsError.message, 500);
    }
    
    // Process the first batch immediately to ensure we have data
    try {
      console.log('Processing first batch...');
      const firstBatchResult = await processTaskDetailBatch(whseid, 0, batchSize);
      console.log('First batch result:', firstBatchResult);
      
      // Update job status with first batch results
      jobStatus.processedRecords += firstBatchResult.processedRecords;
      jobStatus.insertedRecords += firstBatchResult.insertedRecords;
      jobStatus.updatedRecords += firstBatchResult.updatedRecords;
      jobStatus.errorRecords += firstBatchResult.errorRecords;
      
      console.log('Updated job status:', jobStatus);
    } catch (batchError) {
      console.error('Error processing first batch:', batchError);
      console.error('Error name:', batchError.name);
      console.error('Error message:', batchError.message);
      if (batchError.stack) console.error('Stack trace:', batchError.stack);
      
      // Even if the first batch fails, we'll return a response with the error
      jobStatus.errorRecords += batchSize;
      jobStatus.status = 'failed';
    }
    
    // Return response with job status
    return successResponse({
      message: 'TaskDetail copy started',
      jobId,
      totalRecords,
      status: 'in_progress',
      firstBatchProcessed: true,
      progress: {
        processedRecords: jobStatus.processedRecords,
        insertedRecords: jobStatus.insertedRecords,
        updatedRecords: jobStatus.updatedRecords,
        errorRecords: jobStatus.errorRecords,
        percentComplete: Math.round((jobStatus.processedRecords / totalRecords) * 100)
      }
    });
  } catch (error) {
    console.error('Error in copy-taskdetail function:', error);
    await disconnectFromMongoDB();
    return errorResponse('Failed to copy TaskDetail data', error.message, 500);
  }
};

// Process a single batch of TaskDetail records
async function processTaskDetailBatch(whseid, offset, limit) {
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
    
    console.log(`Batch processed: ${result.processedRecords} records, ${result.insertedRecords} inserted, ${result.updatedRecords} updated`);
    return result;
  } catch (error) {
    console.error('Error processing batch:', error);
    result.errorRecords = limit;
    return result;
  }
}
