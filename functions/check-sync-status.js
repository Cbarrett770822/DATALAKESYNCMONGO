// Netlify function to check the status of a sync job
const mongodb = require('./utils/mongodb');
const SyncJob = require('./models/sync-job');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Get the job ID from the query parameters
    const jobId = event.queryStringParameters.jobId;
    
    if (!jobId) {
      return errorResponse('Job ID is required', null, 400);
    }
    
    // Connect to MongoDB
    await mongodb.connectToDatabase();
    
    // Get the sync job
    const syncJob = await SyncJob.findById(jobId).lean();
    
    if (!syncJob) {
      // Disconnect from MongoDB
      await mongodb.disconnectFromDatabase();
      return errorResponse('Sync job not found', null, 404);
    }
    
    // Calculate progress
    let progress = 0;
    if (syncJob.stats && syncJob.stats.totalRecords > 0) {
      progress = Math.round((syncJob.stats.processedRecords / syncJob.stats.totalRecords) * 100);
    }
    
    // Disconnect from MongoDB
    await mongodb.disconnectFromDatabase();
    
    // Return success response
    return successResponse({
      jobId: syncJob._id,
      status: syncJob.status,
      progress,
      stats: syncJob.stats,
      error: syncJob.error,
      createdAt: syncJob.createdAt,
      updatedAt: syncJob.updatedAt
    });
  } catch (error) {
    console.error('Error in check-sync-status function:', error);
    
    // Disconnect from MongoDB
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    // Return error response
    return errorResponse(
      'Failed to check sync status',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};
