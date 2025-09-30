// Simple status check endpoint for background jobs
const mongoose = require('mongoose');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const JobStatus = require('./models/JobStatus');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB');
    } else {
      console.log('Already connected to MongoDB');
    }
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// Disconnect from MongoDB
async function disconnectFromMongoDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    }
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
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
      // If job not found, return a default status
      return successResponse({
        job: {
          id: jobId,
          status: 'not_found',
          message: 'Job not found'
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
    console.error('Error getting job status:', error);
    return errorResponse('Failed to get job status', error.message, 500);
  }
};
