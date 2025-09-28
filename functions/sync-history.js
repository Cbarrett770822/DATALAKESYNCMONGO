// Netlify function to manage sync history
const mongodb = require('./utils/mongodb');
const SyncHistory = require('./models/sync-history');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
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
    
    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET':
        return await handleGetRequest(event);
      case 'POST':
        return await handlePostRequest(event);
      default:
        return errorResponse(`Method ${event.httpMethod} not allowed`, null, 405);
    }
  } catch (error) {
    console.error('Error in sync-history function:', error);
    
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    return errorResponse(
      'Failed to process sync history request',
      error.message,
      error.statusCode || 500
    );
  }
};

/**
 * Handle GET requests to retrieve sync history
 */
async function handleGetRequest(event) {
  const tableId = event.queryStringParameters?.tableId;
  const limit = parseInt(event.queryStringParameters?.limit || '10', 10);
  const page = parseInt(event.queryStringParameters?.page || '1', 10);
  const skip = (page - 1) * limit;
  
  try {
    let query = {};
    
    // Filter by tableId if provided
    if (tableId) {
      query.tableId = tableId;
    }
    
    // Get total count for pagination
    const totalCount = await SyncHistory.countDocuments(query);
    
    // Get history entries with pagination
    const history = await SyncHistory.find(query)
      .sort({ startTime: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .lean();
    
    await mongodb.disconnectFromDatabase();
    return successResponse({
      history,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error retrieving sync history:', error);
    await mongodb.disconnectFromDatabase();
    return errorResponse('Failed to retrieve sync history', error.message, 500);
  }
}

/**
 * Handle POST requests to create new sync history entries
 */
async function handlePostRequest(event) {
  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!requestBody.tableId || !requestBody.tableName || !requestBody.syncJobId) {
      await mongodb.disconnectFromDatabase();
      return errorResponse('tableId, tableName, and syncJobId are required', null, 400);
    }
    
    // Set start time if not provided
    if (!requestBody.startTime) {
      requestBody.startTime = new Date();
    }
    
    // Create a new history entry
    const newHistoryEntry = new SyncHistory(requestBody);
    await newHistoryEntry.save();
    
    await mongodb.disconnectFromDatabase();
    return successResponse(newHistoryEntry, 201);
  } catch (error) {
    console.error('Error creating sync history entry:', error);
    await mongodb.disconnectFromDatabase();
    return errorResponse('Failed to create sync history entry', error.message, 500);
  }
}
