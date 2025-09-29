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
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB Atlas');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
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
      "CSWMS_${whseid}_TASKDETAIL"
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
    FROM "CSWMS_${whseid}_TASKDETAIL"
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
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return errorResponse(`Method ${event.httpMethod} not allowed`, null, 405);
  }
  
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    const whseid = requestBody.whseid || 'wmwhse1';
    const batchSize = requestBody.batchSize || 1000;
    
    console.log(`Starting TaskDetail copy for warehouse ${whseid}`);
    
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
      return errorResponse('Failed to connect to MongoDB', null, 500);
    }
    
    // Step 1: Get total count
    console.log('Getting total record count...');
    const countQuery = buildCountQuery(whseid);
    const countResponse = await ionApi.submitQuery(countQuery);
    const countQueryId = countResponse.queryId || countResponse.id;
    
    // Wait for count query to complete
    let countStatus = await ionApi.checkStatus(countQueryId);
    while (countStatus.status !== 'completed' && countStatus.status !== 'COMPLETED') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      countStatus = await ionApi.checkStatus(countQueryId);
      
      if (countStatus.status === 'failed' || countStatus.status === 'FAILED') {
        await disconnectFromMongoDB();
        return errorResponse('Count query failed', countStatus, 500);
      }
    }
    
    // Get count results
    const countResults = await ionApi.getResults(countQueryId);
    const totalRecords = parseInt(countResults.results[0].count, 10);
    console.log(`Total TaskDetail records: ${totalRecords}`);
    
    // Create job status object
    const jobId = `job_${Date.now()}`;
    const jobStatus = {
      id: jobId,
      totalRecords,
      processedRecords: 0,
      insertedRecords: 0,
      updatedRecords: 0,
      errorRecords: 0,
      startTime: new Date(),
      status: 'in_progress'
    };
    
    // Process the first batch immediately to ensure we have data
    console.log('Processing first batch...');
    const firstBatchResult = await processTaskDetailBatch(whseid, 0, batchSize);
    
    // Update job status with first batch results
    jobStatus.processedRecords += firstBatchResult.processedRecords;
    jobStatus.insertedRecords += firstBatchResult.insertedRecords;
    jobStatus.updatedRecords += firstBatchResult.updatedRecords;
    jobStatus.errorRecords += firstBatchResult.errorRecords;
    
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
