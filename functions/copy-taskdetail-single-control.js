// Netlify function for controlling a single record copy job (pause, resume, stop)
const mongoose = require('mongoose');
const JobStatus = require('./models/jobstatus');

// Configure logger
const logger = {
  info: (message) => console.log(`[copy-taskdetail-single-control][INFO] ${message}`),
  error: (message) => console.error(`[copy-taskdetail-single-control][ERROR] ${message}`),
  warn: (message) => console.warn(`[copy-taskdetail-single-control][WARNING] ${message}`),
  debug: (message) => console.log(`[copy-taskdetail-single-control][DEBUG] ${message}`)
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
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }
  
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    const { jobId, action } = requestBody;
    
    if (!jobId) {
      return errorResponse(400, 'Missing job ID');
    }
    
    if (!action || !['pause', 'resume', 'stop'].includes(action)) {
      return errorResponse(400, 'Invalid action. Must be one of: pause, resume, stop');
    }
    
    logger.info(`Controlling job ${jobId} with action: ${action}`);
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Find job status
    const jobStatus = await JobStatus.findOne({ jobId });
    
    if (!jobStatus) {
      return errorResponse(404, `Job ${jobId} not found`);
    }
    
    // Apply the requested action
    switch (action) {
      case 'pause':
        // Update job status to paused
        await JobStatus.updateOne(
          { jobId },
          { $set: { paused: true, lastUpdated: new Date() } }
        );
        logger.info(`Job ${jobId} paused`);
        break;
        
      case 'resume':
        // Update job status to resumed
        await JobStatus.updateOne(
          { jobId },
          { $set: { paused: false, lastUpdated: new Date() } }
        );
        logger.info(`Job ${jobId} resumed`);
        break;
        
      case 'stop':
        // Update job status to stopped
        await JobStatus.updateOne(
          { jobId },
          { 
            $set: { 
              status: 'stopped', 
              endTime: new Date(),
              lastUpdated: new Date()
            } 
          }
        );
        logger.info(`Job ${jobId} stopped`);
        break;
    }
    
    // Get updated job status
    const updatedJobStatus = await JobStatus.findOne({ jobId });
    
    // Return updated job status
    return successResponse({
      jobId: updatedJobStatus.jobId,
      status: updatedJobStatus.status,
      action,
      success: true,
      paused: updatedJobStatus.paused,
      message: `Job ${action} successful`
    });
    
  } catch (error) {
    logger.error(`Error controlling job: ${error.message}`);
    
    // Ensure MongoDB connection is closed
    try {
      await disconnectFromMongoDB();
    } catch (disconnectError) {
      logger.error(`Error disconnecting from MongoDB: ${disconnectError.message}`);
    }
    
    return errorResponse(500, `Error controlling job: ${error.message}`);
  } finally {
    // Disconnect from MongoDB
    await disconnectFromMongoDB();
  }
};
