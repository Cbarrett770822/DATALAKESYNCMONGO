// Netlify function to manage sync configurations
const mongodb = require('./utils/mongodb');
const SyncConfig = require('./models/sync-config');
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
      case 'PUT':
        return await handlePutRequest(event);
      default:
        return errorResponse(`Method ${event.httpMethod} not allowed`, null, 405);
    }
  } catch (error) {
    console.error('Error in sync-config function:', error);
    
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    return errorResponse(
      'Failed to process sync configuration request',
      error.message,
      error.statusCode || 500
    );
  }
};

/**
 * Handle GET requests to retrieve sync configurations
 */
async function handleGetRequest(event) {
  const tableId = event.queryStringParameters?.tableId;
  
  try {
    let configs;
    
    if (tableId) {
      // Get a specific config
      configs = await SyncConfig.findOne({ tableId }).lean();
      
      if (!configs) {
        return errorResponse(`Sync configuration for table ${tableId} not found`, null, 404);
      }
    } else {
      // Get all configs
      configs = await SyncConfig.find().lean();
    }
    
    await mongodb.disconnectFromDatabase();
    return successResponse(configs);
  } catch (error) {
    console.error('Error retrieving sync configurations:', error);
    await mongodb.disconnectFromDatabase();
    return errorResponse('Failed to retrieve sync configurations', error.message, 500);
  }
}

/**
 * Handle POST requests to create new sync configurations
 */
async function handlePostRequest(event) {
  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    
    // Check if the config already exists
    const existingConfig = await SyncConfig.findOne({ tableId: requestBody.tableId });
    
    if (existingConfig) {
      await mongodb.disconnectFromDatabase();
      return errorResponse(`Sync configuration for table ${requestBody.tableId} already exists`, null, 409);
    }
    
    // Create a new config
    const newConfig = new SyncConfig(requestBody);
    await newConfig.save();
    
    await mongodb.disconnectFromDatabase();
    return successResponse(newConfig, 201);
  } catch (error) {
    console.error('Error creating sync configuration:', error);
    await mongodb.disconnectFromDatabase();
    return errorResponse('Failed to create sync configuration', error.message, 500);
  }
}

/**
 * Handle PUT requests to update existing sync configurations
 */
async function handlePutRequest(event) {
  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    const tableId = requestBody.tableId;
    
    if (!tableId) {
      await mongodb.disconnectFromDatabase();
      return errorResponse('tableId is required', null, 400);
    }
    
    // Find and update the config
    const updatedConfig = await SyncConfig.findOneAndUpdate(
      { tableId },
      { $set: requestBody },
      { new: true, runValidators: true }
    );
    
    if (!updatedConfig) {
      await mongodb.disconnectFromDatabase();
      return errorResponse(`Sync configuration for table ${tableId} not found`, null, 404);
    }
    
    await mongodb.disconnectFromDatabase();
    return successResponse(updatedConfig);
  } catch (error) {
    console.error('Error updating sync configuration:', error);
    await mongodb.disconnectFromDatabase();
    return errorResponse('Failed to update sync configuration', error.message, 500);
  }
}
