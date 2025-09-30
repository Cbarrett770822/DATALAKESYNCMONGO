// Simple status check endpoint for background jobs
const mongoose = require('mongoose');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const JobStatus = require('./models/JobStatus');

// Simple logger for consistent logging
const logger = {
  info: (message) => console.log(message),
  error: (message) => console.error(message),
  warn: (message) => console.warn(message),
  debug: (message) => console.log(message)
};

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    if (mongoose.connection.readyState !== 1) {
      logger.info('Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      logger.info('Connected to MongoDB');
    } else {
      logger.info('Already connected to MongoDB');
    }
    return true;
  } catch (error) {
    logger.error('MongoDB connection error: ' + error.message);
    return false;
  }
}

// Keep connection open for connection pooling
async function disconnectFromMongoDB() {
  // In a serverless environment, it's better to keep connections open
  // for reuse across function invocations
  logger.info('Keeping MongoDB connection open for reuse');
  return true;
  
  // Only close in case of errors or when explicitly needed
  // try {
  //   if (mongoose.connection.readyState !== 0) {
  //     await mongoose.connection.close();
  //     logger.info('Disconnected from MongoDB');
  //   }
  // } catch (error) {
  //   logger.error('Error disconnecting from MongoDB: ' + error.message);
  // }
}

exports.handler = async function(event, context) {
  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  // Get job ID from query parameters
  const jobId = event.queryStringParameters?.jobId || 'unknown';
  logger.info(`Retrieving status for job: ${jobId}`);
  
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
      return errorResponse('Failed to connect to MongoDB', null, 500);
    }
    
    // Find job status in MongoDB
    const jobStatus = await JobStatus.findOne({ jobId });
    
    // Log job status details
    if (jobStatus) {
      logger.info(`Job status found for ${jobId}: status=${jobStatus.status}, processed=${jobStatus.processedRecords}, total=${jobStatus.totalRecords}, percent=${jobStatus.percentComplete}%`);
    } else {
      logger.info(`No job status found for job ID: ${jobId}`);
    }
    
    // Keep MongoDB connection open
    await disconnectFromMongoDB();
    
    if (!jobStatus) {
      // If job not found, return a default status
      logger.info(`Job ID ${jobId} not found in database, returning default status`);
      
      return successResponse({
        job: {
          id: jobId,
          status: 'in_progress',
          processedRecords: 0,
          totalRecords: 22197, // Updated with actual record count from logs
          insertedRecords: 0,
          updatedRecords: 0,
          errorRecords: 0,
          percentComplete: 0,
          message: 'Job started, waiting for first update...'
        }
      });
    }
    
    // Return the job status from MongoDB with proper structure
    // Make sure all fields are present even if null
    return successResponse({
      job: {
        id: jobStatus.jobId,
        status: jobStatus.status || 'in_progress',
        processedRecords: jobStatus.processedRecords || 0,
        totalRecords: jobStatus.totalRecords || 22197,
        insertedRecords: jobStatus.insertedRecords || 0,
        updatedRecords: jobStatus.updatedRecords || 0,
        errorRecords: jobStatus.errorRecords || 0,
        percentComplete: jobStatus.percentComplete || 0,
        message: jobStatus.message || 'Processing...',
        startTime: jobStatus.startTime,
        endTime: jobStatus.endTime,
        // Add upserted records if available
        upsertedRecords: jobStatus.upsertedRecords || 0
      }
    });
  } catch (error) {
    logger.error('Error getting job status: ' + error.message);
    if (error.stack) {
      logger.error('Stack trace: ' + error.stack);
    }
    
    // Even on error, try to return a usable response
    return successResponse({
      job: {
        id: jobId,
        status: 'in_progress',
        processedRecords: 0,
        totalRecords: 22197,
        insertedRecords: 0,
        updatedRecords: 0,
        errorRecords: 0,
        percentComplete: 0,
        message: 'Error retrieving status, but job may still be running',
        error: error.message
      }
    });
  }
};
