// Netlify function for checking the status of a single record copy job
const mongoose = require('mongoose');
const JobStatus = require('./models/JobStatus');

// Configure logger
const logger = {
  info: (message) => console.log(`[copy-taskdetail-single-status][INFO] ${message}`),
  error: (message) => console.error(`[copy-taskdetail-single-status][ERROR] ${message}`),
  warn: (message) => console.warn(`[copy-taskdetail-single-status][WARNING] ${message}`),
  debug: (message) => console.log(`[copy-taskdetail-single-status][DEBUG] ${message}`)
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
  
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method Not Allowed');
  }
  
  try {
    // Get job ID from query parameters
    const jobId = event.queryStringParameters?.jobId;
    
    if (!jobId) {
      return errorResponse(400, 'Missing job ID');
    }
    
    logger.info(`Checking status for job ${jobId}`);
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Find job status
    const jobStatus = await JobStatus.findOne({ jobId });
    
    if (!jobStatus) {
      return errorResponse(404, `Job ${jobId} not found`);
    }
    
    // Return job status
    return successResponse({
      jobId: jobStatus.jobId,
      status: jobStatus.status,
      totalRecords: jobStatus.totalRecords,
      processedRecords: jobStatus.processedRecords,
      insertedRecords: jobStatus.insertedRecords,
      errors: jobStatus.errors,
      paused: jobStatus.paused,
      startTime: jobStatus.startTime,
      endTime: jobStatus.endTime,
      lastUpdated: jobStatus.lastUpdated,
      currentRecord: jobStatus.currentRecord,
      filters: jobStatus.filters,
      settings: jobStatus.settings
    });
    
  } catch (error) {
    logger.error(`Error checking job status: ${error.message}`);
    
    // Ensure MongoDB connection is closed
    try {
      await disconnectFromMongoDB();
    } catch (disconnectError) {
      logger.error(`Error disconnecting from MongoDB: ${disconnectError.message}`);
    }
    
    return errorResponse(500, `Error checking job status: ${error.message}`);
  } finally {
    // Disconnect from MongoDB
    await disconnectFromMongoDB();
  }
};
