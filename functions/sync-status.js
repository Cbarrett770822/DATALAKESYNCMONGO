// Netlify function to check the status of sync jobs
const mongodb = require('./utils/mongodb');
const SyncJob = require('./models/sync-job');
const SyncHistory = require('./models/sync-history');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return errorResponse(`Method ${event.httpMethod} not allowed`, null, 405);
  }
  
  try {
    // Connect to MongoDB
    try {
      console.log('Connecting to MongoDB...');
      await mongodb.connectToDatabase();
      console.log('Connected to MongoDB successfully');
    } catch (dbError) {
      console.error('Failed to connect to MongoDB:', dbError);
      return errorResponse('Database connection error: ' + dbError.message, null, 500);
    }
    
    // Get job ID or history ID from query parameters
    const jobId = event.queryStringParameters?.jobId;
    const historyId = event.queryStringParameters?.historyId;
    
    if (!jobId && !historyId) {
      await mongodb.disconnectFromDatabase();
      return errorResponse('Either jobId or historyId is required', null, 400);
    }
    
    let result;
    
    if (jobId) {
      // Get sync job by ID
      try {
        const syncJob = await SyncJob.findById(jobId).lean();
        
        if (!syncJob) {
          await mongodb.disconnectFromDatabase();
          return errorResponse(`Sync job with ID ${jobId} not found`, null, 404);
        }
        
        // Get related history entry if exists
        const historyEntry = await SyncHistory.findOne({ syncJobId: jobId }).lean();
        
        result = {
          job: syncJob,
          history: historyEntry || null
        };
      } catch (error) {
        console.error('Error retrieving sync job:', error);
        await mongodb.disconnectFromDatabase();
        return errorResponse('Failed to retrieve sync job', error.message, 500);
      }
    } else {
      // Get sync history by ID
      try {
        const historyEntry = await SyncHistory.findById(historyId).lean();
        
        if (!historyEntry) {
          await mongodb.disconnectFromDatabase();
          return errorResponse(`Sync history entry with ID ${historyId} not found`, null, 404);
        }
        
        // Get related sync job
        const syncJob = await SyncJob.findById(historyEntry.syncJobId).lean();
        
        result = {
          job: syncJob || null,
          history: historyEntry
        };
      } catch (error) {
        console.error('Error retrieving sync history:', error);
        await mongodb.disconnectFromDatabase();
        return errorResponse('Failed to retrieve sync history', error.message, 500);
      }
    }
    
    await mongodb.disconnectFromDatabase();
    return successResponse(result);
  } catch (error) {
    console.error('Error in sync-status function:', error);
    
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    return errorResponse(
      'Failed to check sync status',
      error.message,
      500
    );
  }
};
