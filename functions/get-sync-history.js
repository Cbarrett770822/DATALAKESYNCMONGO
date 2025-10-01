// Netlify function to get sync job history
const mongodb = require('./utils/mongodb');
const SyncJob = require('./models/sync-job');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Get query parameters
    const jobType = event.queryStringParameters?.jobType;
    const status = event.queryStringParameters?.status;
    const limit = parseInt(event.queryStringParameters?.limit || '10', 10);
    const page = parseInt(event.queryStringParameters?.page || '1', 10);
    
    // Connect to MongoDB
    await mongodb.connectToDatabase();
    
    // Build query
    const query = {};
    if (jobType) query.jobType = jobType;
    if (status) query.status = status;
    
    // Get total count
    const totalCount = await SyncJob.countDocuments(query);
    
    // Get sync jobs with pagination
    const jobs = await SyncJob.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    // Disconnect from MongoDB
    await mongodb.disconnectFromDatabase();
    
    // Return success response
    return successResponse({
      jobs,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error in get-sync-history function:', error);
    
    // Disconnect from MongoDB
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    // Return error response
    return errorResponse(
      'Failed to get sync history',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};
