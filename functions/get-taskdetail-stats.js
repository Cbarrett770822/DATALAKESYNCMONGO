// Netlify function to get taskdetail statistics
const mongodb = require('./utils/mongodb');
const TaskDetail = require('./models/taskdetail');
const SyncJob = require('./models/sync-job');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Connect to MongoDB
    await mongodb.connectToDatabase();
    
    // Get total records count
    const totalRecords = await TaskDetail.countDocuments();
    
    // Get the latest sync job
    const latestSyncJob = await SyncJob.findOne({ jobType: 'taskdetail' })
      .sort({ createdAt: -1 })
      .lean();
    
    // Get sync status
    let syncStatus = 'unknown';
    let lastSyncDate = null;
    
    if (latestSyncJob) {
      syncStatus = latestSyncJob.status;
      lastSyncDate = latestSyncJob.createdAt;
    }
    
    // Disconnect from MongoDB
    await mongodb.disconnectFromDatabase();
    
    // Return success response
    return successResponse({
      totalRecords,
      lastSyncDate,
      syncStatus
    });
  } catch (error) {
    console.error('Error in get-taskdetail-stats function:', error);
    
    // Disconnect from MongoDB
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    // Return error response
    return errorResponse(
      'Failed to get taskdetail stats',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};
