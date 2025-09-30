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

// Disconnect from MongoDB
async function disconnectFromMongoDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('Disconnected from MongoDB');
    }
  } catch (error) {
    logger.error('Error disconnecting from MongoDB: ' + error.message);
  }
}

exports.handler = async function(event, context) {
  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  // Get job ID from query parameters
  const jobId = event.queryStringParameters?.jobId || 'unknown';
  
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
      return errorResponse('Failed to connect to MongoDB', null, 500);
    }
    
    // Find job status in MongoDB
    const jobStatus = await JobStatus.findOne({ jobId });
    
    // Disconnect from MongoDB
    await disconnectFromMongoDB();
    
    if (!jobStatus) {
      // If job not found, return a default in_progress status
      // This handles the case where the frontend generates a client-side job ID
      // that doesn't exist in the database yet
      logger.info(`Job ID ${jobId} not found in database, returning default status`);
      
      return successResponse({
        job: {
          id: jobId,
          status: 'in_progress',
          processedRecords: 0,
          totalRecords: 1000, // Placeholder value
          insertedRecords: 0,
          updatedRecords: 0,
          errorRecords: 0,
          percentComplete: 0,
          message: 'Job started, waiting for first update...'
        }
      });
    }
    
    // Return the job status from MongoDB
    return successResponse({
      job: {
        id: jobStatus.jobId,
        status: jobStatus.status,
        processedRecords: jobStatus.processedRecords,
        totalRecords: jobStatus.totalRecords,
        insertedRecords: jobStatus.insertedRecords,
        updatedRecords: jobStatus.updatedRecords,
        errorRecords: jobStatus.errorRecords,
        percentComplete: jobStatus.percentComplete,
        message: jobStatus.message || 'Processing...',
        startTime: jobStatus.startTime,
        endTime: jobStatus.endTime
      }
    });
  } catch (error) {
    logger.error('Error getting job status: ' + error.message);
    return errorResponse('Failed to get job status', error.message, 500);
  }
};
