// Netlify function to get an ION API token
const ionApi = require('./utils/ion-api');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Get token using the ION API module
    const token = await ionApi.getToken();
    
    // Return success response with token
    return successResponse({ token });
  } catch (error) {
    console.error('Error in get-token function:', error);
    
    // Return error response
    return errorResponse(
      'Failed to get token', 
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};
