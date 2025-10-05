// Netlify function for pushing DataLake records to MongoDB
const mongoose = require('mongoose');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const { extractTableNameFromSQL, identifyPrimaryKeyFields } = require('./utils/table-utils');
const { getOrCreateModel } = require('./utils/model-factory');

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
    
    // Determine table information
    let tableName = requestBody.tableName;
    let columns = requestBody.columns;
    let sqlQuery = requestBody.sqlQuery;
    
    // If table name is not provided, try to extract it from SQL query
    if (!tableName && sqlQuery) {
      tableName = extractTableNameFromSQL(sqlQuery);
      logger.info(`Extracted table name from SQL query: ${tableName}`);
    }
    
    // If still no table name, use a default
    if (!tableName) {
      tableName = 'unknown_table';
      logger.warn(`Could not determine table name, using default: ${tableName}`);
    }
    
    // Get or create the model for this table
    const Model = getOrCreateModel(tableName, columns);
    logger.info(`Using model for table: ${tableName}`);
    
    // Transform records
    const transformedRecords = transformData(requestBody.records);
    logger.info(`Transformed ${transformedRecords.length} records for MongoDB`);
    
    // Get a sample record for key field validation
    const sampleRecord = transformedRecords.length > 0 ? transformedRecords[0] : null;
    
    // Identify primary key fields using the sample record to validate field existence
    const keyFields = requestBody.keyFields || identifyPrimaryKeyFields(columns, sampleRecord);
    logger.info(`Using key fields for identification: ${keyFields.join(', ')}`);
    
    // Validate that all key fields exist in the sample record
    if (sampleRecord) {
      const missingKeys = keyFields.filter(key => !sampleRecord.hasOwnProperty(key));
      if (missingKeys.length > 0) {
        logger.warn(`Warning: Some key fields are missing in the data: ${missingKeys.join(', ')}`);
        // Remove missing keys from the key fields list
        const validKeyFields = keyFields.filter(key => sampleRecord.hasOwnProperty(key));
        if (validKeyFields.length > 0) {
          logger.info(`Using valid key fields instead: ${validKeyFields.join(', ')}`);
          keyFields.length = 0; // Clear the array
          keyFields.push(...validKeyFields); // Add valid keys
        } else {
          // If no valid key fields, use the first field from the record
          const fallbackKey = Object.keys(sampleRecord)[0];
          logger.info(`No valid key fields found, using first field as fallback: ${fallbackKey}`);
          keyFields.length = 0;
          keyFields.push(fallbackKey);
        }
      }
    }
    
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
        // If record is empty or not an object, skip it
        if (!record || typeof record !== 'object') {
          stats.errors++;
          stats.errorDetails.push('Invalid record: not an object');
          return;
        }
        
        // Build query based on key fields
        const query = {};
        let recordIdentifier = 'unknown';
        
        // Check if we have any key fields defined
        if (!keyFields || keyFields.length === 0) {
          // If no key fields, create a new document with MongoDB's _id
          const newRecord = new Model(record);
          await newRecord.save();
          stats.inserted++;
          logger.debug(`Inserted record with new _id`);
          return;
        }
        
        // Check if record has all required key fields
        let validKeyFound = false;
        
        for (const keyField of keyFields) {
          if (record[keyField] !== undefined) {
            query[keyField] = record[keyField];
            recordIdentifier = record[keyField]; // Use the first valid key field as identifier in logs
            validKeyFound = true;
          }
        }
        
        // If no valid keys found, use a fallback approach
        if (!validKeyFound) {
          // Try to find any field that might work as an identifier
          const recordFields = Object.keys(record);
          if (recordFields.length > 0) {
            const fallbackField = recordFields[0];
            query[fallbackField] = record[fallbackField];
            recordIdentifier = record[fallbackField];
            logger.debug(`No key fields found in record, using fallback field: ${fallbackField}`);
          } else {
            // If record has no fields at all, skip it
            stats.errors++;
            stats.errorDetails.push('Record has no fields');
            return;
          }
        }
        
        // Use findOneAndUpdate with upsert to efficiently handle both insert and update cases
        const result = await Model.findOneAndUpdate(
          query,
          { $set: record },
          { 
            upsert: true, 
            new: true,
            rawResult: true // Return info about the operation
          }
        );
        
        // Check if it was an insert or update
        if (result.lastErrorObject && result.lastErrorObject.updatedExisting) {
          stats.updated++;
          logger.debug(`Updated record: ${recordIdentifier}`);
        } else {
          stats.inserted++;
          logger.debug(`Inserted record: ${recordIdentifier}`);
        }
      } catch (error) {
        stats.errors++;
        const recordId = keyFields.map(key => record[key] || 'unknown').join('-');
        stats.errorDetails.push(`Error processing record ${recordId}: ${error.message}`);
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
