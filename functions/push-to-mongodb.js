// Netlify function for pushing DataLake records to MongoDB
const mongoose = require('mongoose');
const TaskDetail = require('./models/taskdetail');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

// Configure logger
const logger = {
  info: (message) => console.log(`[push-to-mongodb][INFO] ${message}`),
  error: (message) => console.error(`[push-to-mongodb][ERROR] ${message}`),
  warn: (message) => console.warn(`[push-to-mongodb][WARNING] ${message}`),
  debug: (message) => console.log(`[push-to-mongodb][DEBUG] ${message}`)
};

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

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    logger.info(`Received request to push ${requestBody.records?.length || 0} records to MongoDB`);
    
    // Check if records are provided
    if (!requestBody.records || !Array.isArray(requestBody.records) || requestBody.records.length === 0) {
      return errorResponse(400, 'No records provided or invalid records format');
    }
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Transform records
    const transformedRecords = transformData(requestBody.records);
    logger.info(`Transformed ${transformedRecords.length} records for MongoDB`);
    
    // Track statistics
    const stats = {
      total: transformedRecords.length,
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    };
    
    // Define batch size and calculate number of batches
    const BATCH_SIZE = 10; // Process 10 records at a time
    const totalRecords = transformedRecords.length;
    const batches = Math.ceil(totalRecords / BATCH_SIZE);
    
    logger.info(`Processing ${totalRecords} records in ${batches} batches of ${BATCH_SIZE}`);
    
    // Process records in batches
    const batchPromises = [];
    
    // Function to process a single record
    async function processRecord(record) {
      try {
        // Check if record has required fields
        if (!record.TASKDETAILKEY || !record.WHSEID) {
          stats.errors++;
          stats.errorDetails.push(`Record missing required fields: TASKDETAILKEY or WHSEID`);
          return;
        }
        
        // Use findOneAndUpdate with upsert to efficiently handle both insert and update cases
        const result = await TaskDetail.findOneAndUpdate(
          { 
            TASKDETAILKEY: record.TASKDETAILKEY,
            WHSEID: record.WHSEID 
          },
          { $set: record },
          { 
            upsert: true, 
            new: true,
            rawResult: true // Return info about the operation
          }
        );
        
        // Check if it was an insert or update
        if (result.lastErrorObject.updatedExisting) {
          stats.updated++;
        } else {
          stats.inserted++;
        }
      } catch (error) {
        stats.errors++;
        stats.errorDetails.push(`Error processing record ${record.TASKDETAILKEY || 'unknown'}: ${error.message}`);
        logger.error(`Error processing record: ${error.message}`);
      }
    }
    
    // Process records in batches using Promise.all for better performance
    for (let i = 0; i < batches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, totalRecords);
      const batchRecords = transformedRecords.slice(start, end);
      
      logger.debug(`Processing batch ${i+1}/${batches} with ${batchRecords.length} records`);
      
      // Process batch with Promise.all for parallel execution
      const batchResult = await Promise.all(
        batchRecords.map(record => processRecord(record))
      );
      
      logger.debug(`Completed batch ${i+1}/${batches}. Current stats: inserted=${stats.inserted}, updated=${stats.updated}, errors=${stats.errors}`);
    }
    
    // Disconnect from MongoDB
    await disconnectFromMongoDB();
    
    // Return success response with stats
    return successResponse({
      message: 'Records processed successfully',
      stats
    });
  } catch (error) {
    logger.error(`Error in push-to-mongodb function: ${error.message}`);
    
    // Ensure MongoDB connection is closed
    try {
      await disconnectFromMongoDB();
    } catch (disconnectError) {
      logger.error(`Error disconnecting from MongoDB: ${disconnectError.message}`);
    }
    
    return errorResponse(500, `Error processing records: ${error.message}`);
  }
};
