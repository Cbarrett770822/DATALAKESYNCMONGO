// Netlify function to save application settings
const mongodb = require('./utils/mongodb');
const Setting = require('./models/setting');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Parse the request body
    const settings = JSON.parse(event.body);
    
    // Connect to MongoDB
    await mongodb.connectToDatabase();
    
    // Create bulk operations for upsert
    const operations = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { key, value } },
        upsert: true
      }
    }));
    
    // Execute bulk operations
    if (operations.length > 0) {
      await Setting.bulkWrite(operations);
    }
    
    // Disconnect from MongoDB
    await mongodb.disconnectFromDatabase();
    
    // Return success response
    return successResponse({
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error in save-settings function:', error);
    
    // Disconnect from MongoDB
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    // Return error response
    return errorResponse(
      'Failed to save settings',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};
