// Simple endpoint to check database status
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
  
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
      return errorResponse('Failed to connect to MongoDB', null, 500);
    }
    
    // Get job status counts
    const jobCounts = {
      total: await JobStatus.countDocuments(),
      inProgress: await JobStatus.countDocuments({ status: 'in_progress' }),
      completed: await JobStatus.countDocuments({ status: 'completed' }),
      failed: await JobStatus.countDocuments({ status: 'failed' })
    };
    
    // Get TaskDetail counts if the model is available
    let taskDetailCount = 0;
    try {
      const TaskDetail = mongoose.model('TaskDetail');
      taskDetailCount = await TaskDetail.countDocuments();
    } catch (err) {
      console.log('TaskDetail model not registered yet');
    }
    
    // Get recent jobs
    const recentJobs = await JobStatus.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    // Disconnect from MongoDB
    await disconnectFromMongoDB();
    
    return successResponse({
      jobCounts,
      taskDetailCount,
      recentJobs
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    return errorResponse('Failed to check database status', error.message, 500);
  }
};
